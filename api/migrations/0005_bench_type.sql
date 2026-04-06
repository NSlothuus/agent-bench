-- Add bench_type column to bench_runs
ALTER TABLE bench_runs ADD COLUMN bench_type TEXT NOT NULL DEFAULT 'model';

-- Add config_hash column for agent setup comparison
ALTER TABLE bench_runs ADD COLUMN config_hash TEXT;

-- Add workspace_snapshot column for agent bench
ALTER TABLE bench_runs ADD COLUMN workspace_snapshot TEXT;

-- Add execution_trace column for agent bench
ALTER TABLE bench_runs ADD COLUMN execution_trace TEXT;

-- Add bench_type column to bench_tasks
ALTER TABLE bench_tasks ADD COLUMN bench_type TEXT NOT NULL DEFAULT 'model';

-- Create bench_setups table for agent setup comparison
CREATE TABLE IF NOT EXISTS bench_setups (
  id TEXT PRIMARY KEY,
  config_hash TEXT UNIQUE NOT NULL,
  framework TEXT NOT NULL,
  model_name TEXT,
  description TEXT,
  first_seen INTEGER DEFAULT (unixepoch()),
  total_runs INTEGER DEFAULT 0,
  avg_score REAL
);

CREATE INDEX IF NOT EXISTS idx_setups_config_hash ON bench_setups(config_hash);
CREATE INDEX IF NOT EXISTS idx_setups_framework ON bench_setups(framework);
CREATE INDEX IF NOT EXISTS idx_runs_bench_type ON bench_runs(bench_type);
CREATE INDEX IF NOT EXISTS idx_runs_config_hash ON bench_runs(config_hash);
CREATE INDEX IF NOT EXISTS idx_tasks_bench_type ON bench_tasks(bench_type);
