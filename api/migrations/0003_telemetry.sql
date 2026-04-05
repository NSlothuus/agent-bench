-- Agent Bench D1 Schema
-- Migration 0003: Telemetry tracking

-- Checkpoint table for tracking agent progress during multi-step work
CREATE TABLE IF NOT EXISTS bench_checkpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES bench_runs(id),
  step_name TEXT NOT NULL,
  model_used TEXT,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_run_id ON bench_checkpoints(run_id);

-- Add telemetry columns to bench_runs
-- Note: model_name and framework already exist from 0001_schema.sql
-- We add the new columns that don't already exist
ALTER TABLE bench_runs ADD COLUMN models_used TEXT; -- JSON array
ALTER TABLE bench_runs ADD COLUMN total_cost_usd REAL DEFAULT 0;
ALTER TABLE bench_runs ADD COLUMN efficiency_score REAL;
