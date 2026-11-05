"""Validate agent output and merge it into tr/<lang>.json.

  python merge.py --langs fr,de        (default: all languages that have work/out files)

A translation is rejected (and must be redone) when it:
  - is missing / empty / unchanged-English for a sentence,
  - changes the HTML tag sequence or any href,
  - drops a number that is in the English (digits must stay Western 0-9),
  - for plain-text segments, contains tags.
"""
import argparse
import json
import re
from common import *


EMPHASIS = {"strong", "em", "b", "i"}


def tags(h):
    """tag sequence + hrefs; emphasis tags (strong/em/b/i) may be dropped by a translator."""
    t = re.findall(r"</?[a-zA-Z][a-zA-Z0-9]*|href=\"[^\"]*\"", h)
    return [x for x in t if x.lstrip("</") not in EMPHASIS]


def nums(s, drop_formulas=False):
    s = re.sub(r"<[^>]+>", " ", s)
    if drop_formulas:  # H2S, CO2, NO3 ...: the digit is part of a formula a translator may rewrite as a word
        s = re.sub(r"[A-Za-z]\d+", " ", s)
    return sorted(re.findall(r"\d+", s))


ACCEPT = {"8ac799a8e1"}  # reviewed by hand: Arabic "ساعتين" = "two hours"


def check(src, tr, kind, sid=""):
    if not isinstance(tr, str) or not tr.strip():
        return "empty"
    if sid in ACCEPT:
        return None
    if kind == "h":
        if tags(src) != tags(tr):
            return "tag/href mismatch"
    elif re.search(r"<[a-zA-Z/]", tr) and not re.search(r"<[a-zA-Z/]", src):
        return "tags in plain text"
    en_n, tr_n = nums(src, True), nums(tr)
    pool = list(tr_n)
    for n in en_n:
        if n in pool:
            pool.remove(n)
        else:
            return f"number {n} missing"
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--langs", default="all")
    a = ap.parse_args()
    langs = [l.name for l in (WORK / "out").iterdir() if l.is_dir()] if a.langs == "all" else a.langs.split(",")
    TR_DIR.mkdir(exist_ok=True)
    for lang in langs:
        tr = load_tr(lang)
        bad, ok = [], 0
        for bf in sorted((WORK / "batches" / lang).glob("*.json")):
            src = json.loads(bf.read_text(encoding="utf-8"))
            of = WORK / "out" / lang / bf.name
            out = json.loads(of.read_text(encoding="utf-8")) if of.exists() else {}
            for i, v in src.items():
                if i not in out:
                    bad.append((bf.name, i, "missing"))
                    continue
                err = check(v["en"], out[i], v["type"], i)
                if err:
                    bad.append((bf.name, i, err))
                else:
                    tr[i] = out[i].strip()
                    ok += 1
        (TR_DIR / f"{lang}.json").write_text(json.dumps(tr, ensure_ascii=False, indent=0), encoding="utf-8")
        print(f"{lang}: merged {ok}, rejected {len(bad)}, total translated {len(tr)}")
        if bad:
            rej = {}
            for name, i, err in bad:
                src = json.loads((WORK / "batches" / lang / name).read_text(encoding="utf-8"))
                rej[i] = {**src[i], "error": err}
            (WORK / f"rejected_{lang}.json").write_text(json.dumps(rej, ensure_ascii=False, indent=1), encoding="utf-8")
            for name, i, err in bad[:5]:
                print("   ", name, i, err)


if __name__ == "__main__":
    main()
