-- Track specialist mode for each benchmark run
-- Allows comparing raw vs specialist-augmented scoring side-by-side

ALTER TABLE bench_runs ADD COLUMN specialist_mode TEXT NOT NULL DEFAULT 'specialist';
