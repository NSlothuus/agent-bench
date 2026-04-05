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
}

// API request bodies
export interface StartRequestBody {
  category?: string;
}

export interface SubmitRequestBody {
  run_id: string;
  response: string;
}

export interface SpecialistRequestBody {
  task_category: string;
  model_hint?: string;
}
