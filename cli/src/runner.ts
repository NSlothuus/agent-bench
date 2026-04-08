/**
 * Unified execution harness for model and agent benchmarks.
 * Orchestrates the fetch → execute → submit flow.
 * Supports multi-run statistical aggregation.
 * Zero dependencies: uses Node.js built-in only.
 */

import { ApiClient } from "./api-client.js";
import { callModelApi } from "./model-api.js";
import { callModelCli } from "./model-cli.js";
import { printProgress } from "./display.js";
import type { BenchResult, ModelBenchOptions } from "./types.js";
import { MODEL_CATEGORIES } from "./types.js";

// ── Statistical helpers ────────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const squaredDiffs = values.map((v) => (v - m) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

/**
 * 95% confidence interval half-width using Student's t-distribution approximation.
 * For n >= 5 this is accurate enough for benchmark reporting.
 */
function ci95HalfWidth(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const s = stddev(values);
  // t-crit approx: 1.96 for large n, scales up for small n
  // Using conservative approximation (slightly overestimates CI for small n)
  const tFactor = n >= 30 ? 1.96 : n >= 10 ? 2.26 : n >= 5 ? 2.78 : 4.30;
  return (tFactor * s) / Math.sqrt(n);
}

/**
 * Consistency score: how stable is the model across runs?
 * 0-100 scale based on coefficient of variation (CV = stddev/mean).
 * 100 = perfect consistency, 0 = wildly inconsistent.
 */
function consistencyScore(values: number[]): number {
  if (values.length < 2) return 100;
  const m = mean(values);
  if (m === 0) return 0;
  const cv = stddev(values) / m;
  return Math.max(0, Math.min(100, Math.round((1 - Math.min(cv, 1)) * 100)));
}

// ── Model calling ──────────────────────────────────────────────────────────────

const MAX_RETRIES = 1;

async function callModel(
  options: ModelBenchOptions,
  prompt: string,
  systemPrompt?: string,
): Promise<{ text: string; tokens: number; timeMs: number }> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (options.cli !== undefined) {
        return await callModelCli(options.cli, prompt, { systemPrompt });
      }
      return await callModelApi(options.api!, options.model!, prompt, {
        apiKey: options.apiKey,
        systemPrompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      });
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        process.stderr.write(
          `    ⚠ Attempt ${attempt + 1} failed: ${lastError.message}. Retrying...\n`,
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
  throw lastError ?? new Error("Unknown error calling model");
}

function formatTimeShort(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function pad(str: string, width: number): string {
  return str.padEnd(width).slice(0, width);
}

// ── Task builders ───────────────────────────────────────────────────────────────

type TaskSpec = {
  category: string;
  isSpecialist: boolean;
  specialistMode: "raw" | "specialist";
};

type TaskFn = () => Promise<BenchResult>;

function buildTaskFns(
  options: ModelBenchOptions,
  client: ApiClient,
  displayName: string,
  mode: "raw" | "specialist" | "both",
  maxTaskRetries: number,
): Array<{ spec: TaskSpec; fn: TaskFn }> {
  const categories: string[] =
    options.category !== undefined ? [options.category] : [...MODEL_CATEGORIES];

  const tasks: Array<{ spec: TaskSpec; fn: TaskFn }> = [];

  for (const category of categories) {
    // RAW
    if (mode === "raw" || mode === "both") {
      tasks.push({
        spec: { category, isSpecialist: false, specialistMode: "raw" },
        fn: async (): Promise<BenchResult> => {
          const task = await client.start(category, "model");
          const response = await callModel(options, task.task_prompt);
          const score = await client.submit(task.run_id, response.text, {
            model_name: displayName,
            framework: options.framework,
            total_tokens: response.tokens,
            specialist_mode: "raw",
          });
          return {
            bench_type: "model",
            category,
            taskId: task.task_id,
            runId: task.run_id,
            score: score.estimated_final,
            maxScore: 10,
            timeMs: response.timeMs,
            tokens: response.tokens,
            status: score.binary_score?.summary ?? score.status,
            specialist: false,
          };
        },
      });
    }

    // SPECIALIST
    if (mode === "specialist" || mode === "both") {
      const specCategory = `${category}+spec`;
      tasks.push({
        spec: { category: specCategory, isSpecialist: true, specialistMode: "specialist" },
        fn: async (): Promise<BenchResult> => {
          const spec = await client.specialist(
            category,
            options.model ?? options.cli,
          );
          const task = await client.start(category, "model");
          const response = await callModel(
            options,
            task.task_prompt,
            spec.specialist_prompt,
          );
          const score = await client.submit(task.run_id, response.text, {
            model_name: `${displayName} (+${spec.specialist_name})`,
            framework: options.framework,
            total_tokens: response.tokens,
            specialist_mode: "specialist",
          });
          return {
            bench_type: "model",
            category: specCategory,
            taskId: task.task_id,
            runId: task.run_id,
            score: score.estimated_final,
            maxScore: 10,
            timeMs: response.timeMs,
            tokens: response.tokens,
            status: score.binary_score?.summary ?? score.status,
            specialist: true,
          };
        },
      });
    }
  }

  return tasks;
}

async function runTaskWithRetry(
  spec: TaskSpec,
  fn: TaskFn,
  maxRetries: number,
  retryDelayMs: number,
): Promise<BenchResult> {
  let lastError: string = "unknown";
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < maxRetries) {
        process.stderr.write(
          `    ⚠ ${spec.category}${spec.isSpecialist ? "+spec" : ""}: attempt ${attempt + 1} failed (${lastError}). Retrying in ${retryDelayMs / 1000}s...\n`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }
  return {
    bench_type: "model",
    category: spec.category,
    score: null,
    maxScore: 10,
    timeMs: 0,
    tokens: 0,
    status: "failed",
    specialist: spec.isSpecialist,
    error: lastError,
  };
}

/**
 * Run a single iteration of the full benchmark (all categories).
 * Returns flat list of BenchResults — one per category.
 */
async function runSingleIteration(
  options: ModelBenchOptions,
  client: ApiClient,
  displayName: string,
  iterationIndex: number,
  totalIterations: number,
): Promise<BenchResult[]> {
  const mode: "raw" | "specialist" | "both" =
    options.specialist_mode ??
    (options.specialist ? "both" : "specialist");

  const maxTaskRetries = options.retries ?? 3;
  const retryDelayMs = (options.retryDelay ?? 30) * 1000;
  const taskEntries = buildTaskFns(options, client, displayName, mode, maxTaskRetries);

  if (options.json) {
    // In JSON mode: parallel execution, minimal progress output
    const settled = await Promise.allSettled(
      taskEntries.map(({ spec, fn }) => runTaskWithRetry(spec, fn, maxTaskRetries, retryDelayMs)),
    );
    return settled
      .filter((o): o is PromiseFulfilledResult<BenchResult> => o.status === "fulfilled")
      .map((o) => o.value);
  }

  // Human-readable: sequential for clarity
  const results: BenchResult[] = [];
  const totalTasks = taskEntries.length;

  for (let i = 0; i < taskEntries.length; i++) {
    const { spec, fn } = taskEntries[i];
    const label = spec.category + (spec.isSpecialist ? "+spec" : "");
    const iterPrefix = totalIterations > 1 ? `[${iterationIndex + 1}/${totalIterations}] ` : "";

    process.stderr.write(
      `  ${iterPrefix}[${i + 1}/${totalTasks}] ${label}: Fetching task...\n`,
    );
    process.stderr.write(`  ${iterPrefix}[${i + 1}/${totalTasks}] ${label}: Sending to model...\n`);

    const result = await runTaskWithRetry(spec, fn, maxTaskRetries, retryDelayMs);
    results.push(result);

    const scoreStr = result.score !== null ? `${result.score}/10` : "queued";
    const icon = result.status === "failed" ? "❌" : "✅";
    process.stderr.write(
      `    ${icon} ${label}: ${scoreStr} (${formatTimeShort(result.timeMs)})\n`,
    );
  }

  return results;
}

/**
 * Compute per-category statistics across multiple full-benchmark runs.
 */
interface CategoryStats {
  category: string;
  specialist: boolean;
  scores: number[];
  mean: number;
  stddev: number;
  ci95: number;
  consistency: number;
  min: number;
  max: number;
  taskIds: string[];
  runIds: string[];
}

function aggregateResults(allRunResults: BenchResult[][]): {
  categoryStats: CategoryStats[];
  overallMean: number;
  overallStddev: number;
  overallCI95: number;
  consistency: number;
  totalRuns: number;
} {
  // Collect all scores per category
  const byCategory = new Map<string, BenchResult[]>();

  for (const run of allRunResults) {
    for (const r of run) {
      const key = r.category;
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push(r);
    }
  }

  const categoryStats: CategoryStats[] = [];
  const allScores: number[] = [];

  for (const [category, results] of byCategory) {
    const scores = results.map((r) => r.score).filter((s): s is number => s !== null);
    const m = mean(scores);
    const s = stddev(scores);
    const ci = ci95HalfWidth(scores);
    const cons = consistencyScore(scores);

    categoryStats.push({
      category,
      specialist: results[0]?.specialist ?? false,
      scores,
      mean: Math.round(m * 10) / 10,
      stddev: Math.round(s * 10) / 10,
      ci95: Math.round(ci * 10) / 10,
      consistency: cons,
      min: scores.length > 0 ? Math.min(...scores) : 0,
      max: scores.length > 0 ? Math.max(...scores) : 0,
      taskIds: results.map((r) => r.taskId).filter((id): id is string => id !== undefined),
      runIds: results.map((r) => r.runId).filter((id): id is string => id !== undefined),
    });

    allScores.push(...scores);
  }

  // Sort: specialist second, then by category
  categoryStats.sort((a, b) => {
    if (a.specialist !== b.specialist) return a.specialist ? 1 : -1;
    return a.category.localeCompare(b.category);
  });

  return {
    categoryStats,
    overallMean: Math.round(mean(allScores) * 10) / 10,
    overallStddev: Math.round(stddev(allScores) * 10) / 10,
    overallCI95: Math.round(ci95HalfWidth(allScores) * 10) / 10,
    consistency: consistencyScore(allScores),
    totalRuns: allRunResults.length,
  };
}

// ── Main benchmark runner ───────────────────────────────────────────────────────

/**
 * Run the full model benchmark suite.
 * When options.runs > 1, runs the full suite N times and aggregates statistics.
 * Parallel by default; use --no-parallel for sequential execution.
 */
export async function runModelBench(
  options: ModelBenchOptions,
): Promise<BenchResult[]> {
  const client = new ApiClient(options.server);
  const displayName =
    options.modelName ?? options.model ?? options.cli ?? "unknown";
  const numRuns = Math.max(1, options.runs ?? 1);

  const mode: "raw" | "specialist" | "both" =
    options.specialist_mode ??
    (options.specialist ? "both" : "specialist");

  const categories: string[] =
    options.category !== undefined ? [options.category] : [...MODEL_CATEGORIES];
  const totalTasks = mode === "both" ? categories.length * 2 : categories.length;

  if (!options.json) {
    process.stderr.write("\n");
    process.stderr.write("  ╔══════════════════════════════════════════╗\n");
    process.stderr.write("  ║       AGENT BENCH — Starting...          ║\n");
    process.stderr.write(`  ║  Model: ${pad(displayName, 30)}║\n`);
    process.stderr.write(`  ║  Tasks: ${pad(String(totalTasks), 30)}║\n`);
    process.stderr.write(
      `  ║  Runs:  ${pad(String(numRuns) + (numRuns > 1 ? " (aggregated)" : " (single)"), 30)}║\n`,
    );
    process.stderr.write(
      `  ║  Parallel: ${pad(options.parallel === false ? "OFF" : "ON ", 28)}║\n`,
    );
    process.stderr.write(
      `  ║  Retries:  ${pad(String(options.retries ?? 3) + ` (${(options.retryDelay ?? 30)}s delay)`, 26)}║\n`,
    );
    process.stderr.write("  ╚══════════════════════════════════════════╝\n");
    process.stderr.write("\n");
  }

  const allRunResults: BenchResult[][] = [];

  for (let runIdx = 0; runIdx < numRuns; runIdx++) {
    if (!options.json && numRuns > 1) {
      process.stderr.write(`\n  ── Run ${runIdx + 1}/${numRuns} ──────────────────────────\n`);
    }

    const results = await runSingleIteration(options, client, displayName, runIdx, numRuns);
    allRunResults.push(results);
  }

  // Flatten for API compatibility (single return value)
  const flatResults = allRunResults.flat();

  // Print statistical summary if multi-run
  if (!options.json && numRuns > 1) {
    const stats = aggregateResults(allRunResults);

    process.stderr.write("\n");
    process.stderr.write("  ╔══════════════════════════════════════════════════════════╗\n");
    process.stderr.write("  ║  AGGREGATED RESULTS — Statistical Summary              ║\n");
    process.stderr.write(`  ║  Model: ${pad(displayName, 47)}║\n`);
    process.stderr.write(`  ║  Runs: ${pad(String(numRuns), 49)}║\n`);
    process.stderr.write("  ╠══════════════════════════════════════════════════════════╣\n");
    process.stderr.write("  ║  Per-Category Statistics:                               ║\n");

    for (const cs of stats.categoryStats) {
      const ciStr = cs.ci95 > 0 ? ` ±${cs.ci95}` : "";
      const consBar = "▏".repeat(Math.round(cs.consistency / 10));
      process.stderr.write(
        `  ║  ${pad(cs.category, 14)} ${cs.mean.toFixed(1)}${pad(ciStr, 7)} (σ=${cs.stddev.toFixed(1)}) [${consBar}${cs.consistency}%]  ║\n`,
      );
    }

    process.stderr.write("  ╠══════════════════════════════════════════════════════════╣\n");
    process.stderr.write("  ║  Overall:                                               ║\n");
    const consLabel = stats.consistency >= 80 ? "🟢" : stats.consistency >= 50 ? "🟡" : "🔴";
    process.stderr.write(
      `  ║  Composite: ${stats.overallMean}/10  95% CI: ±${stats.overallCI95}               ║\n`,
    );
    process.stderr.write(
      `  ║  Consistency: ${consLabel} ${stats.consistency}%  (σ=${stats.overallStddev})          ║\n`,
    );
    process.stderr.write("  ╠══════════════════════════════════════════════════════════╣\n");
    process.stderr.write("  ║  🔗 bench.rapid42.com/leaderboard                      ║\n");
    process.stderr.write("  ╚══════════════════════════════════════════════════════════╝\n");
  }

  return flatResults;
}
