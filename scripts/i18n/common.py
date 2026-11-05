"""Shared helpers for the learn-page translation pipeline.

Segments = the translatable pieces of an English learn page (block text with its inline
tags, plain attribute text, <title>/meta text and a few JSON-LD strings). Both the
extractor and the renderer call collect_segments() on a fresh parse of the English page,
so segment ids (a hash of kind+text) are identical on both sides.
"""
import hashlib
import json
import re
from pathlib import Path

from bs4 import BeautifulSoup, Comment, NavigableString, Tag

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"
WORK = Path(__file__).resolve().parent / "work"
TR_DIR = Path(__file__).resolve().parent / "tr"
SITE = "https://hrsuindore.com"

# code -> (native name, URL prefix, hreflang, dir, english name for prompts)
LANGS = {
    "fr": ("Français", "fr", "fr", "ltr", "French"),
    "de": ("Deutsch", "de", "de", "ltr", "German"),
    "pt": ("Português", "pt", "pt", "ltr", "Portuguese"),
    "es": ("Español", "es", "es", "ltr", "Spanish"),
    "zh": ("中文", "zh", "zh-Hans", "ltr", "Simplified Chinese"),
    "ja": ("日本語", "ja", "ja", "ltr", "Japanese"),
    "sw": ("Kiswahili", "sw", "sw", "ltr", "Swahili"),
    "af": ("Afrikaans", "af", "af", "ltr", "Afrikaans"),
    "my": ("မြန်မာ", "my", "my", "ltr", "Burmese"),
    "ar": ("العربية", "ar", "ar", "rtl", "Arabic (Modern Standard)"),
}

BLOCK = set("p h1 h2 h3 h4 h5 h6 li ul ol table thead tbody tfoot tr td th div section main header "
            "footer nav details summary figure figcaption blockquote dl dt dd form article aside".split())
SKIP_TAGS = {"script", "style", "noscript", "iframe", "svg", "template", "head"}
SKIP_CLASSES = {"lrn-logo", "ft-brand", "ft-brand-sub", "lrn-refs", "lang-sw"}
ATTRS = ("alt", "aria-label", "title", "placeholder")


def canon_kind(kind: str, text: str) -> str:
    """'p' = plain text (translator returns plain text, no tags); 'h' = contains inline HTML.
    Plain text shared between visible copy, JSON-LD and meta tags is translated once."""
    if kind in ("t", "ta", "j"):
        return "p"
    return "p" if ("<" not in text and "&" not in text) else "h"


def seg_id(kind: str, text: str) -> str:
    return hashlib.sha1((canon_kind(kind, text) + ":" + text).encode("utf-8")).hexdigest()[:10]


def page_src(slug: str) -> Path:
    return PUBLIC / "learn" / slug / "index.html" if slug else PUBLIC / "learn" / "index.html"


def all_slugs():
    slugs = [""]  # hub first
    for p in sorted((PUBLIC / "learn").iterdir()):
        if p.is_dir() and (p / "index.html").exists():
            slugs.append(p.name)
    return slugs


def en_url(slug: str) -> str:
    return f"{SITE}/learn/{slug}/" if slug else f"{SITE}/learn/"


def lang_url(lang: str, slug: str) -> str:
    pre = LANGS[lang][1]
    return f"{SITE}/{pre}/learn/{slug}/" if slug else f"{SITE}/{pre}/learn/"


def _text_ok(text: str) -> bool:
    t = text.strip()
    if not re.search(r"[A-Za-z]{2,}", t):
        return False
    if t.startswith("©") or t.upper() in ("HRSU", "HRSU INDORE"):
        return False
    if re.fullmatch(r"[\w.+-]+@[\w-]+(\.[\w-]+)+", t):
        return False
    return True


def _skipped(el: Tag) -> bool:
    if el.name in SKIP_TAGS:
        return True
    cls = set(el.get("class") or [])
    return bool(cls & SKIP_CLASSES) or el.has_attr("data-quick") or el.has_attr("data-i18n-sw")


def _has_block_desc(el: Tag) -> bool:
    return any(isinstance(d, Tag) and d.name in BLOCK for d in el.descendants)


def inner_html(el: Tag) -> str:
    return "".join(str(c) for c in el.children).strip()


def collect_segments(soup: BeautifulSoup):
    """Return list of (kind, target, text). kinds:
       h  = element inner HTML, target = Tag
       ta = attribute text,     target = (Tag, attr)
       t  = <title>/meta text,  target = Tag or (Tag,'content')
       j  = json-ld string,     target = (script Tag, json path tuple)
    """
    segs = []
    body = soup.body

    def walk(el: Tag):
        for child in list(el.children):
            if isinstance(child, Comment):
                continue
            if isinstance(child, NavigableString):
                if child.strip() and el.name not in SKIP_TAGS and _text_ok(str(child)):
                    span = soup.new_tag("span")
                    child.replace_with(span)
                    span.append(NavigableString(str(child)))
                    segs.append(("h", span, inner_html(span)))
                continue
            if not isinstance(child, Tag) or _skipped(child):
                continue
            if child.name in BLOCK and _has_block_desc(child):
                walk(child)
            else:
                text = child.get_text(" ", strip=True)
                if _text_ok(text):
                    segs.append(("h", child, inner_html(child)))

    walk(body)

    for el in body.find_all(True):
        if _skipped(el) or any(_skipped(p) for p in el.parents if isinstance(p, Tag) and p is not soup):
            continue
        for a in ATTRS:
            v = el.get(a)
            if v and _text_ok(v) and a != "title":
                segs.append(("ta", (el, a), v))

    head = soup.head
    if head.title and head.title.string:
        segs.append(("t", head.title, head.title.string))
    for m in head.find_all("meta"):
        key = m.get("name") or m.get("property")
        if key in ("description", "og:title", "og:description", "twitter:title", "twitter:description") and m.get("content"):
            segs.append(("t", (m, "content"), m["content"]))

    for sc in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(sc.string or "")
        except Exception:
            continue
        for path, val in _jsonld_strings(data):
            segs.append(("j", (sc, path), val))
    return segs


def _jsonld_strings(data, path=()):
    """Yield (path, string) for fields we translate: Article headline/description,
    Question name, Answer text, ListItem name, WebPage name/description."""
    out = []
    if isinstance(data, dict):
        t = data.get("@type")
        keys = ()
        if t in ("Article", "TechArticle", "BlogPosting", "WebPage", "CollectionPage"):
            keys = ("headline", "description", "name")
        elif t == "Question":
            keys = ("name",)
        elif t == "Answer":
            keys = ("text",)
        elif t == "ListItem":
            keys = ("name",)
        for k in keys:
            if isinstance(data.get(k), str) and _text_ok(data[k]):
                out.append((path + (k,), data[k]))
        for k, v in data.items():
            if isinstance(v, (dict, list)) and k not in ("citation", "publisher", "author", "about"):
                out.extend(_jsonld_strings(v, path + (k,)))
    elif isinstance(data, list):
        for i, v in enumerate(data):
            out.extend(_jsonld_strings(v, path + (i,)))
    return out


def parse_clean(slug: str) -> BeautifulSoup:
    """Parse the English page and remove anything the i18n step injected, so reruns are idempotent."""
    html = page_src(slug).read_text(encoding="utf-8")
    html = re.sub(r"<!--i18n:start-->.*?<!--i18n:end-->\s*", "", html, flags=re.S)
    soup = BeautifulSoup(html, "html.parser")
    for sw in soup.select("[data-i18n-sw]"):
        sw.decompose()
    return soup


def segment_ids(slug: str):
    soup = parse_clean(slug)
    return [(seg_id(k, txt), canon_kind(k, txt), txt) for k, _t, txt in collect_segments(soup)]


def load_tr(lang: str) -> dict:
    f = TR_DIR / f"{lang}.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}
