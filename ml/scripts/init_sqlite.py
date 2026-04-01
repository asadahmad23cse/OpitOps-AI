"""Apply schema and register dataset run. Usage: python scripts/init_sqlite.py"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "optiops_ml.db"
SCHEMA = ROOT / "db" / "schema.sql"
MANIFEST = ROOT / "data" / "processed" / "manifest.json"


def main() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA.read_text(encoding="utf-8"))
    counts = {"train": 0, "val": 0, "test": 0}
    if MANIFEST.exists():
        m = json.loads(MANIFEST.read_text(encoding="utf-8"))
        counts = m.get("counts", counts)
    cur = conn.execute(
        "SELECT 1 FROM dataset_runs WHERE name = ?",
        ("optiops_sre_v1",),
    )
    if cur.fetchone() is None:
        conn.execute(
            "INSERT INTO dataset_runs (name, train_n, val_n, test_n, notes) VALUES (?,?,?,?,?)",
            (
                "optiops_sre_v1",
                counts.get("train"),
                counts.get("val"),
                counts.get("test"),
                "Synthetic OptiOps DevOps/SRE instruction set",
            ),
        )
    conn.commit()
    conn.close()
    print(f"SQLite ready: {DB_PATH}")


if __name__ == "__main__":
    main()
