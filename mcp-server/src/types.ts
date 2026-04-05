/**
 * Types for the Model Bench MCP server.
 * All API request/response shapes are defined here.
 */

// ---- Tool Input Types ----

export interface BenchStartInput {
  category?: "code" | "writing" | "reasoning" | "design" | "multi-step" | "safety";
}

export interface BenchSubmitInput {
  run_id: string;
  response: string;
  model_name?: string;
  framework?: string;
  total_tokens?: number;
  total_cost_usd?: number;
  models_used?: string[];
}

export interface BenchResultsInput {
  run_id?: string;
}

export interface BenchLeaderboardInput {
  sort_by?: "quality" | "speed" | "efficiency" | "cost";
  limit?: number;
  framework?: string;
  model?: string;
}

export interface BenchSpecialistInput {
  task_category: string;
  model_hint?: string;
}

export interface BenchCheckpointInput {
  run_id: string;
  step_name: string;
  model_used: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  duration_ms: number;
}

export interface BenchCompareInput {
  run_id_a: string;
  run_id_b: string;
}

// ---- API Response Types ----

export interface BenchStartResponse {
  success: true;
  data: {
    run_id: string;
    task_id: string;
    task_prompt: string;
    category: string;
    started_at: string;
  };
}

export interface BenchSubmitResponse {
  success: true;
  data: {
    run_id: string;
    status: "scored" | "queued";
    binary_score?: BinaryScore;
    estimated_final?: number;
    efficiency_score?: number;
    leaderboard_url: string;
  };
}

export interface BinaryScore {
  check_name: string;
  details: Record<string, unknown>;
  adjustments: Record<string, number>;
}

export interface BenchResultsResponse {
  success: true;
  data: {
    run_id: string;
    status: "pending" | "scored";
    scores?: {
      quality: number;
      judgment: number;
      completeness: number;
      composite: number;
    };
    rank?: number;
  };
}

export interface LeaderboardEntry {
  model: string;
  score: number;
  rank: number;
  time_ms: number;
  tokens: number;
  framework?: string;
  efficiency_score?: number;
  cost_usd?: number;
}

export interface BenchLeaderboardResponse {
  success: true;
  data: {
    entries: LeaderboardEntry[];
    total: number;
  };
}

export interface BenchSpecialistResponse {
  success: true;
  data: {
    specialist_prompt: string;
    specialist_name: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: string;
}

export interface BenchCheckpointResponse {
  success: true;
  data: {
    acknowledged: true;
    checkpoints_so_far: number;
  };
}

export interface BenchCompareResponse {
  success: true;
  data: {
    run_a: CompareRunData;
    run_b: CompareRunData;
    comparison: {
      score_diff: number;
      time_diff_ms: number;
      efficiency_diff: number;
    };
  };
}

export interface CompareRunData {
  run_id: string;
  model_name: string | null;
  framework: string | null;
  category: string;
  status: string;
  final_composite: number | null;
  time_elapsed_ms: number | null;
  tokens_used: number | null;
  total_cost_usd: number | null;
  efficiency_score: number | null;
}

export type ApiResponse<T> = T | ApiErrorResponse;
