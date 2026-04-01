-- OptiOps ML experiment tracking (SQLite)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS dataset_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  train_n INTEGER,
  val_n INTEGER,
  test_n INTEGER,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS vector_collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  backend TEXT NOT NULL,
  collection_name TEXT NOT NULL,
  embedding_model TEXT,
  chunk_count INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS experiment_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dataset_run_id INTEGER REFERENCES dataset_runs(id),
  name TEXT NOT NULL,
  method TEXT NOT NULL,
  base_model TEXT,
  peft_method TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  hardware_note TEXT
);

CREATE TABLE IF NOT EXISTS metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  experiment_run_id INTEGER NOT NULL REFERENCES experiment_runs(id),
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  extra_json TEXT
);

CREATE TABLE IF NOT EXISTS sample_predictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  experiment_run_id INTEGER NOT NULL REFERENCES experiment_runs(id),
  split TEXT NOT NULL,
  sample_id TEXT,
  reference TEXT,
  prediction TEXT,
  category TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_metrics_run ON metrics(experiment_run_id);
CREATE INDEX IF NOT EXISTS idx_preds_run ON sample_predictions(experiment_run_id);
