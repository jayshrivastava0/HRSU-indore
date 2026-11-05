"""Render translated static learn pages + wire hreflang/switcher into every page that has alternates.

  python render.py                 # render every (lang, page) whose translations are complete
  python render.py --langs fr,de

Output: public/<lang>/learn/<slug>/index.html (and /<lang>/learn/ hub). English pages get
hreflang links, the language switcher and the suggestion script injected between
<!--i18n:start--> / <!--i18n:end--> markers (idempotent).
"""
import argparse
import datetime
import html as htmlmod
import json
import re
from common import *

LINK_RE = re.compile(r"^/learn/(?:([a-z0-9-]+)/)?(#.*)?$")
FONTS = {
    "ja": "Noto+Sans+JP:wght@400;700",
    "zh": "Noto+Sans+SC:wght@400;700",
    "my": "Noto+Sans+Myanmar:wght@400;700",
    "ar": "Noto+Sans+Arabic:wght@400;700",
}


def coverage(lang, tr):
    """slugs whose every segment has a translation."""
    ok = []
    for s in all_slugs():
        if all(i in tr for i, _k, _t in segment_ids(s)):
            ok.append(s)
    return ok


def apply_translation(soup, tr, avail, lang, slug):
    segs = collect_segments(soup)
    cache = {}
    for kind, target, text in segs:
        new = tr[seg_id(kind, text)]
        ck = canon_kind(kind, text)
        if kind == "h":
            target.clear()
            if ck == "h":
                for node in list(BeautifulSoup(new, "html.parser").contents):
                    target.append(node)
            else:
                target.append(NavigableString(new))
        elif kind == "ta":
            el, attr = target
            el[attr] = new
        elif kind == "t":
            if isinstance(target, tuple):
                target[0][target[1]] = new
            else:
                target.string = new
        elif kind == "j":
            sc, path = target
            data = cache.setdefault(id(sc), (sc, json.loads(sc.string)))[1]
            node = data
            for p in path[:-1]:
                node = node[p]
            node[path[-1]] = new

    # JSON-LD urls -> translated urls (only where that translated page exists)
    def fix(o):
        if isinstance(o, dict):
            for k, v in list(o.items()):
                if k in ("@id", "item", "url") and isinstance(v, str):
                    m = re.fullmatch(re.escape(SITE) + r"/learn/(?:([a-z0-9-]+)/)?", v)
                    if m and (m.group(1) or "") in avail:
                        o[k] = lang_url(lang, m.group(1) or "")
                else:
                    fix(v)
        elif isinstance(o, list):
            for v in o:
                fix(v)

    for sc in soup.find_all("script", type="application/ld+json"):
        try:
            data = cache[id(sc)][1] if id(sc) in cache else json.loads(sc.string)
        except Exception:
            continue
        fix(data)
        sc.string = json.dumps(data, ensure_ascii=False, indent=2)

    # in-body links to other learn pages
    for a in soup.body.find_all("a", href=True):
        m = LINK_RE.match(a["href"])
        if m and (m.group(1) or "") in avail:
            a["href"] = f"/{LANGS[lang][1]}/learn/" + (m.group(1) + "/" if m.group(1) else "") + (m.group(2) or "")

    h = soup.html
    h["lang"] = LANGS[lang][2]
    h["dir"] = LANGS[lang][3]
    url = lang_url(lang, slug)
    for l in soup.find_all("link", rel="canonical"):
        l["href"] = url
    for m in soup.find_all("meta", property="og:url"):
        m["content"] = url


def alt_links(slug, langs_avail):
    out = [f'<link rel="alternate" hreflang="en" href="{en_url(slug)}">']
    for l in langs_avail:
        out.append(f'<link rel="alternate" hreflang="{LANGS[l][2]}" href="{lang_url(l, slug)}">')
    out.append(f'<link rel="alternate" hreflang="x-default" href="{en_url(slug)}">')
    return "\n".join(out)


def switcher(cur, slug, langs_avail):
    items = []
    entries = [("en", "English", "en", en_url(slug))] + [(l, LANGS[l][0], LANGS[l][2], lang_url(l, slug)) for l in langs_avail]
    cur_name = "English" if cur == "en" else LANGS[cur][0]
    for code, name, hl, url in entries:
        path = url.replace(SITE, "")
        aria = ' aria-current="true"' if code == cur else ""
        items.append(f'<li><a href="{path}" hreflang="{hl}" lang="{hl}" data-lang="{code}"{aria}>{htmlmod.escape(name)}</a></li>')
    return (f'<!--i18n:start--><div class="lang-sw" data-i18n-sw><details><summary aria-label="Language">'
            f'<span aria-hidden="true">&#127760;</span> {htmlmod.escape(cur_name)}</summary><ul>{"".join(items)}</ul></details></div><!--i18n:end-->')


def inject(html, cur, slug, langs_avail):
    html = re.sub(r"<!--i18n:start-->.*?<!--i18n:end-->\s*", "", html, flags=re.S)
    if not langs_avail:
        return html
    head = "<!--i18n:start-->\n" + alt_links(slug, langs_avail) + '\n<link rel="stylesheet" href="/css/i18n.css">'
    if cur in FONTS:
        head += (f'\n<link href="https://fonts.googleapis.com/css2?family={FONTS[cur]}&display=swap" rel="stylesheet">')
    head += "\n<!--i18n:end-->\n"
    html = html.replace("</head>", head + "</head>", 1)
    sw = switcher(cur, slug, langs_avail)
    m = re.search(r'<nav class="lrn-nav">.*?</nav>', html, flags=re.S)
    if m:
        end = m.end() - len("</nav>")
        html = html[:end] + sw + html[end:]
    else:
        html = html.replace("</header>", sw + "</header>", 1)
    html = html.replace("</body>", '<!--i18n:start--><script src="/js/lang-suggest.js" defer></script><!--i18n:end-->\n</body>', 1)
    return html


def write_sitemap(rendered):
    today = datetime.date.today().isoformat()
    block = ["<!-- I18N START -->"]
    for lang, slug in rendered:
        block.append(f"  <url>\n    <loc>{lang_url(lang, slug)}</loc>\n    <lastmod>{today}</lastmod>\n"
                     f"    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>")
    block.append("<!-- I18N END -->")
    text = "\n".join(block)
    for f in (ROOT / "sitemap.xml", PUBLIC / "sitemap.xml"):
        if not f.exists():
            continue
        x = f.read_text(encoding="utf-8")
        if "<!-- I18N START -->" in x:
            x = re.sub(r"<!-- I18N START -->.*?<!-- I18N END -->", lambda m: text, x, flags=re.S)
        else:
            x = x.replace("</urlset>", text + "\n</urlset>")
        f.write_text(x, encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--langs", default="all")
    ap.add_argument("--no-sitemap", action="store_true")
    a = ap.parse_args()
    langs = list(LANGS) if a.langs == "all" else a.langs.split(",")

    trs = {l: load_tr(l) for l in langs}
    avail = {l: coverage(l, trs[l]) for l in langs}
    rendered = []
    for lang in langs:
        for slug in avail[lang]:
            soup = parse_clean(slug)
            apply_translation(soup, trs[lang], set(avail[lang]), lang, slug)
            alts = [l for l in langs if slug in avail[l]]
            out = inject("<!DOCTYPE html>\n" + str(soup.html) if soup.html else str(soup), lang, slug, alts)
            dest = PUBLIC / LANGS[lang][1] / "learn" / slug / "index.html" if slug else PUBLIC / LANGS[lang][1] / "learn" / "index.html"
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(out, encoding="utf-8")
            rendered.append((lang, slug))
    # English pages: hreflang + switcher
    for slug in all_slugs():
        alts = [l for l in langs if slug in avail[l]]
        src = page_src(slug)
        raw = src.read_text(encoding="utf-8")
        new = inject(raw, "en", slug, alts)
        if new != raw:
            src.write_text(new, encoding="utf-8")
    if not a.no_sitemap:
        write_sitemap(rendered)
    print(f"rendered {len(rendered)} pages:", {l: len(avail[l]) for l in langs})


if __name__ == "__main__":
    main()
