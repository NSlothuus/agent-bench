-- Fix broken seed tasks: add binary_check_fn where it was NULL
-- These tasks had no scoring mechanism, making them dead weight in the benchmark.

-- Fix 1: design task (id='design') — was missing binary_check_fn
UPDATE bench_tasks
SET binary_check_fn = 'binary_check_design'
WHERE id = 'design' AND binary_check_fn IS NULL;

-- Fix 2: multi-step task (id='multi-step') — was missing binary_check_fn
-- This is an agent-style task (requires shell execution) but lives in the model bench.
-- The binary check validates the text response describes completing all 6 steps.
UPDATE bench_tasks
SET binary_check_fn = 'binary_check_multi_step'
WHERE id = 'multi-step' AND binary_check_fn IS NULL;
