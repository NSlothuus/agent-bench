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
}

export interface BenchResultsInput {
  run_id?: string;
}

export interface BenchLeaderboardInput {
  sort_by?: "quality" | "speed" | "efficiency";
  limit?: number;
}

export interface BenchSpecialistInput {
  task_category: string;
  model_hint?: string;
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

export type ApiResponse<T> = T | ApiErrorResponse;
