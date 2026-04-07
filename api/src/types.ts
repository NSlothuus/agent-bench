/**
 * Type definitions for the Agent Bench API.
 */

export interface Env {
  DB: D1Database;
  LEADERBOARD_URL: string;
}

// D1 row shapes
export interface TaskRow {
  id: string;
  category: string;
  title: string;
  prompt: string;
  grading_key: string;
  binary_check_fn: string | null;
  specialist_name: string | null;
  specialist_prompt: string | null;
  active: number;
  version: number;
  created_at: number;
  bench_type: string;
}

export interface RunRow {
  id: string;
  task_id: string;
  category: string;
  model_name: string | null;
  framework: string | null;
  started_at: number;
  submitted_at: number | null;
  response: string | null;
  binary_scores: string | null;
  judge_scores: string | null;
  final_composite: number | null;
  time_elapsed_ms: number | null;
  tokens_used: number | null;
  cost_usd: number | null;
  ip_hash: string | null;
  status: string;
  created_at: number;
  // Phase 2 telemetry columns
  models_used: string | null; // JSON array
  total_cost_usd: number | null;
  efficiency_score: number | null;
  // Bench type columns
  bench_type: string;
  config_hash: string | null;
  workspace_snapshot: string | null;
  execution_trace: string | null;
  // Specialist mode tracking
  specialist_mode: string;
}

export interface CheckpointRow {
  id: number;
  run_id: string;
  step_name: string;
  model_used: string | null;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  duration_ms: number;
  created_at: number;
}

export interface SetupRow {
  id: string;
  config_hash: string;
  framework: string;
  model_name: string | null;
  description: string | null;
  first_seen: number;
  total_runs: number;
  avg_score: number | null;
}

// API request bodies
export interface StartRequestBody {
  category?: string;
  bench_type?: "model" | "agent";
}

export interface SubmitRequestBody {
  run_id: string;
  response: string;
  model_name?: string;
  framework?: string;
  total_tokens?: number;
  total_cost_usd?: number;
  models_used?: string[];
  specialist_mode?: "raw" | "specialist";
}

export interface AgentSubmitRequestBody extends SubmitRequestBody {
  config_hash?: string;
  workspace_snapshot?: string;
  execution_trace?: string;
}

export interface CheckpointRequestBody {
  run_id: string;
  step_name: string;
  model_used: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  duration_ms: number;
}

export interface SpecialistRequestBody {
  task_category: string;
  model_hint?: string;
}
