"""
Seed a local Chroma vector collection from OptiOps knowledge text.
Embeddings: sentence-transformers/all-MiniLM-L6-v2 (lightweight, CPU-friendly).
"""
from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KB = ROOT / "data" / "knowledge" / "optiops_incidents_kb.txt"
CHROMA_PATH = ROOT / "chroma_db"
DB_PATH = ROOT / "data" / "optiops_ml.db"


def chunk_lines(text: str) -> list[str]:
    chunks: list[str] = []
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("===") or not line:
            continue
        chunks.append(line)
    return chunks


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--collection", default="optiops_kb")
    parser.add_argument("--model", default="sentence-transformers/all-MiniLM-L6-v2")
    args = parser.parse_args()

    import chromadb
    from chromadb.utils import embedding_functions

    KB.parent.mkdir(parents=True, exist_ok=True)
    text = KB.read_text(encoding="utf-8")
    docs = chunk_lines(text)
    if not docs:
        raise SystemExit("No documents to index")

    ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name=args.model)
    client = chromadb.PersistentClient(path=str(CHROMA_PATH))
    col = client.get_or_create_collection(name=args.collection, embedding_function=ef)
    ids = [f"kb-{i}" for i in range(len(docs))]
    col.upsert(ids=ids, documents=docs, metadatas=[{"source": "optiops_incidents_kb"} for _ in docs])

    if DB_PATH.exists():
        conn = sqlite3.connect(DB_PATH)
        cur = conn.execute(
            "SELECT 1 FROM vector_collections WHERE collection_name = ? AND backend = ?",
            (args.collection, "chromadb"),
        )
        if cur.fetchone() is None:
            conn.execute(
                "INSERT INTO vector_collections (backend, collection_name, embedding_model, chunk_count) VALUES (?,?,?,?)",
                ("chromadb", args.collection, args.model, len(docs)),
            )
            conn.commit()
        conn.close()

    print(f"Indexed {len(docs)} chunks into Chroma at {CHROMA_PATH} (collection={args.collection})")


if __name__ == "__main__":
    main()
