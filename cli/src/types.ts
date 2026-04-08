/**
 * Shared TypeScript types for Agent Bench CLI.
 */

export type BenchType = "model" | "agent";

export type ModelCategory = "code" | "writing" | "reasoning" | "design" | "safety" | "personality";
export type AgentCategory = "coding" | "research" | "ops" | "recovery" | "planning" | "persona" | "design";

export const MODEL_CATEGORIES: readonly ModelCategory[] = [
  "code",
  "writing",
  "reasoning",
  "design",
  "safety",
  "personality",
] as const;

export const AGENT_CATEGORIES: readonly AgentCategory[] = [
  "coding",
  "research",
  "ops",
  "recovery",
  "planning",
  "persona",
  "design",
] as const;

export interface BenchResult {
  bench_type: BenchType;
  category: string;
  taskId?: string;
  runId?: string;
  score: number | null;
  maxScore: number;
  timeMs: number;
  tokens: number;
  status: string;
  specialist: boolean;
  error?: string;
}

export interface WorkspaceSnapshot {
  files_created: string[];
  files_modified: string[];
  commands_run: string[];
  total_files: number;
}

export interface ModelBenchOptions {
  api?: string;
  model?: string;
  apiKey?: string;
  cli?: string;
  specialist: boolean;
  specialist_mode?: "raw" | "specialist" | "both";
  parallel?: boolean;
  retries?: number;
  retryDelay?: number;
  category?: string;
  modelName?: string;
  framework?: string;
  server?: string;
  json: boolean;
  temperature?: number;
  maxTokens?: number;
  runs?: number;  // number of full benchmark repetitions (default: 1)
}

export interface AgentBenchOptions {
  category?: string;
  framework?: string;
  model?: string;
  server?: string;
  json: boolean;
}

export type SortField = "quality" | "speed" | "efficiency";
