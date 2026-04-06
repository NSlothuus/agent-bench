/**
 * Shared TypeScript types for Agent Bench CLI.
 */

export type BenchType = "model" | "agent";

export type ModelCategory = "code" | "writing" | "reasoning" | "design" | "safety";
export type AgentCategory = "coding" | "research" | "ops" | "recovery" | "planning";

export const MODEL_CATEGORIES: readonly ModelCategory[] = [
  "code",
  "writing",
  "reasoning",
  "design",
  "safety",
] as const;

export const AGENT_CATEGORIES: readonly AgentCategory[] = [
  "coding",
  "research",
  "ops",
  "recovery",
  "planning",
] as const;

export interface BenchResult {
  bench_type: BenchType;
  category: string;
  score: number | null;
  maxScore: number;
  timeMs: number;
  tokens: number;
  status: string;
  specialist?: boolean;
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
  category?: string;
  modelName?: string;
  framework?: string;
  server?: string;
  json: boolean;
}

export interface AgentBenchOptions {
  category?: string;
  framework?: string;
  model?: string;
  server?: string;
  json: boolean;
}

export type SortField = "quality" | "speed" | "efficiency";
