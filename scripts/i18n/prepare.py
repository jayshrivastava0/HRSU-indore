"""Create translation batches for segments that are not yet translated.

  python prepare.py --slugs calcium-nitrate-h2s-wastewater --langs fr,de
  python prepare.py --slugs all --langs all

Writes work/batches/<lang>/NN.json  ({seg_id: english text}) and work/instructions.md.
Agents write work/out/<lang>/NN.json ({seg_id: translation}); then run merge.py.
"""
import argparse
import json
from common import *

CAP = 28000  # characters of English per batch


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slugs", default="all")
    ap.add_argument("--langs", default="all")
    a = ap.parse_args()
    slugs = all_slugs() if a.slugs == "all" else [s if s != "hub" else "" for s in a.slugs.split(",")]
    langs = list(LANGS) if a.langs == "all" else a.langs.split(",")

    uniq = {}
    for s in slugs:
        for i, k, t in segment_ids(s):
            uniq[i] = (k, t)

    WORK.mkdir(exist_ok=True)
    for lang in langs:
        done = load_tr(lang)
        todo = {i: kt for i, kt in uniq.items() if i not in done}
        bdir = WORK / "batches" / lang
        bdir.mkdir(parents=True, exist_ok=True)
        for old in bdir.glob("*.json"):
            old.unlink()
        batches, cur, size = [], {}, 0
        for i, (k, t) in todo.items():
            if size + len(t) > CAP and cur:
                batches.append(cur)
                cur, size = {}, 0
            cur[i] = {"type": k, "en": t}
            size += len(t)
        if cur:
            batches.append(cur)
        for n, b in enumerate(batches, 1):
            (bdir / f"{n:02d}.json").write_text(json.dumps(b, ensure_ascii=False, indent=0), encoding="utf-8")
        print(f"{lang}: {len(todo)} segments to translate in {len(batches)} batches ({sum(len(v['en']) for b in batches for v in b.values())} chars)")


if __name__ == "__main__":
    main()
