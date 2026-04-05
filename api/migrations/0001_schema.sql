-- Agent Bench D1 Schema
-- Migration 0001: Initial schema

CREATE TABLE IF NOT EXISTS bench_tasks (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  grading_key TEXT NOT NULL,
  binary_check_fn TEXT,
  specialist_name TEXT,
  specialist_prompt TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_tasks_category ON bench_tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_active ON bench_tasks(active);

CREATE TABLE IF NOT EXISTS bench_runs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  category TEXT NOT NULL,
  model_name TEXT,
  framework TEXT,
  started_at INTEGER NOT NULL,
  submitted_at INTEGER,
  response TEXT,
  binary_scores TEXT,
  judge_scores TEXT,
  final_composite REAL,
  time_elapsed_ms INTEGER,
  tokens_used INTEGER,
  cost_usd REAL,
  ip_hash TEXT,
  status TEXT NOT NULL DEFAULT 'started',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (task_id) REFERENCES bench_tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_runs_status ON bench_runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_category ON bench_runs(category);
CREATE INDEX IF NOT EXISTS idx_runs_ip_hash ON bench_runs(ip_hash);
CREATE INDEX IF NOT EXISTS idx_runs_final_composite ON bench_runs(final_composite DESC);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON bench_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS specialist_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_category TEXT NOT NULL,
  specialist_name TEXT NOT NULL,
  model_hint TEXT,
  ip_hash TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_specialist_usage_category ON specialist_usage(task_category);
