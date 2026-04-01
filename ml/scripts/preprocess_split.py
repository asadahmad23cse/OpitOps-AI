"""
Quality filters + stratified train/val/test split (default 70/15/15 by category).
Reads:  ml/data/raw/optiops_sre_full.jsonl
Writes: ml/data/processed/{train,val,test}.jsonl + manifest.json
"""
from __future__ import annotations

import argparse
import json
import random
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "optiops_sre_full.jsonl"
PROC = ROOT / "data" / "processed"


def load_rows(path: Path) -> list[dict]:
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return rows


def quality_filter(row: dict, min_out: int = 40, max_total: int = 6000) -> bool:
    inst = (row.get("instruction") or "").strip()
    out = (row.get("output") or "").strip()
    inp = (row.get("input") or "").strip()
    if len(inst) < 10 or len(out) < min_out:
        return False
    if len(inst) + len(inp) + len(out) > max_total:
        return False
    return True


def stratified_split(
    rows: list[dict], seed: int
) -> tuple[list[dict], list[dict], list[dict]]:
    """Approximate 70/15/15 per category via round-robin bucket assignment."""
    rng = random.Random(seed)
    by_cat: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_cat[r.get("category", "unknown")].append(r)

    train, val, test = [], [], []
    for _, items in by_cat.items():
        rng.shuffle(items)
        for i, item in enumerate(items):
            b = i % 20
            if b < 14:
                train.append(item)
            elif b < 17:
                val.append(item)
            else:
                test.append(item)
    rng.shuffle(train)
    rng.shuffle(val)
    rng.shuffle(test)
    return train, val, test


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--train", type=float, default=0.70, help="Reported only; split is 70/15/15 rounded-robin.")
    parser.add_argument("--val", type=float, default=0.15, help="Reported only.")
    args = parser.parse_args()
    test_r = round(1.0 - args.train - args.val, 4)

    if not RAW.exists():
        raise SystemExit(f"Missing {RAW}. Run python scripts/build_dataset.py first.")

    all_rows = load_rows(RAW)
    rows = [r for r in all_rows if quality_filter(r)]
    print(f"Kept {len(rows)} / {len(all_rows)} after quality filters")

    train, val, test = stratified_split(rows, args.seed)
    PROC.mkdir(parents=True, exist_ok=True)

    def write_jsonl(name: str, data: list[dict]) -> None:
        p = PROC / name
        with p.open("w", encoding="utf-8") as f:
            for r in data:
                # assign stable id for eval / SQL
                rid = f"{r.get('category','x')}-{hash((r['instruction'], r['output'])) & 0xFFFFFFFF:x}"
                r2 = {**r, "id": rid}
                f.write(json.dumps(r2, ensure_ascii=False) + "\n")

    write_jsonl("train.jsonl", train)
    write_jsonl("val.jsonl", val)
    write_jsonl("test.jsonl", test)

    manifest = {
        "seed": args.seed,
        "ratios": {"train": args.train, "val": args.val, "test": test_r},
        "counts": {"train": len(train), "val": len(val), "test": len(test)},
        "filters": {"min_output_chars": 40, "max_total_chars": 6000},
    }
    (PROC / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Wrote splits under {PROC}")


if __name__ == "__main__":
    main()
