/**
 * Unified execution harness for model and agent benchmarks.
 * Orchestrates the fetch → execute → submit flow.
 * Zero dependencies: uses Node.js built-in only.
 */

import { ApiClient } from "./api-client.js";
import { callModelApi } from "./model-api.js";
import { callModelCli } from "./model-cli.js";
import { printProgress } from "./display.js";
import type { BenchResult, ModelBenchOptions } from "./types.js";
import { MODEL_CATEGORIES } from "./types.js";

const MAX_RETRIES = 1;

/**
 * Call the model (API or CLI) with retry logic.
 */
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

/**
 * Run the full model benchmark suite.
 */
export async function runModelBench(
  options: ModelBenchOptions,
): Promise<BenchResult[]> {
  const client = new ApiClient(options.server);
  const displayName =
    options.modelName ?? options.model ?? options.cli ?? "unknown";

  const categories: string[] =
    options.category !== undefined ? [options.category] : [...MODEL_CATEGORIES];

  const totalTasks = options.specialist
    ? categories.length * 2
    : categories.length;

  if (!options.json) {
    process.stderr.write("\n");
    process.stderr.write("  ╔══════════════════════════════════════╗\n");
    process.stderr.write("  ║       AGENT BENCH — Starting...      ║\n");
    process.stderr.write(`  ║  Model: ${pad(displayName, 28)}║\n`);
    process.stderr.write(`  ║  Tasks: ${pad(String(totalTasks), 28)}║\n`);
    process.stderr.write("  ╚══════════════════════════════════════╝\n");
    process.stderr.write("\n");
  }

  const results: BenchResult[] = [];
  let taskNumber = 0;

  for (const category of categories) {
    taskNumber++;
    if (!options.json) {
      printProgress(category, "Starting task...", totalTasks, taskNumber);
    }

    try {
      const task = await client.start(category, "model");

      if (!options.json) {
        printProgress(category, "Sending to model...", totalTasks, taskNumber);
      }

      const response = await callModel(options, task.task_prompt);

      if (!options.json) {
        printProgress(
          category,
          "Submitting for scoring...",
          totalTasks,
          taskNumber,
        );
      }

      const score = await client.submit(task.run_id, response.text, {
        model_name: displayName,
        framework: options.framework,
        total_tokens: response.tokens,
      });

      const result: BenchResult = {
        bench_type: "model",
        category,
        score: score.estimated_final,
        maxScore: 10,
        timeMs: response.timeMs,
        tokens: response.tokens,
        status: score.binary_score?.summary ?? score.status,
        specialist: false,
      };

      results.push(result);

      if (!options.json) {
        const scoreStr =
          result.score !== null ? `${result.score}/10` : "queued";
        process.stderr.write(
          `    ✅ ${category}: ${scoreStr} (${formatTimeShort(response.timeMs)})\n`,
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        bench_type: "model",
        category,
        score: null,
        maxScore: 10,
        timeMs: 0,
        tokens: 0,
        status: "failed",
        specialist: false,
        error: msg,
      });

      if (!options.json) {
        process.stderr.write(`    ❌ ${category}: ${msg}\n`);
      }
    }

    // Specialist run
    if (options.specialist) {
      taskNumber++;
      const specCategory = `${category}+spec`;

      if (!options.json) {
        printProgress(
          specCategory,
          "Fetching specialist prompt...",
          totalTasks,
          taskNumber,
        );
      }

      try {
        const spec = await client.specialist(
          category,
          options.model ?? options.cli,
        );

        const task = await client.start(category, "model");

        if (!options.json) {
          printProgress(
            specCategory,
            "Sending to model (with specialist)...",
            totalTasks,
            taskNumber,
          );
        }

        const response = await callModel(
          options,
          task.task_prompt,
          spec.specialist_prompt,
        );

        if (!options.json) {
          printProgress(
            specCategory,
            "Submitting for scoring...",
            totalTasks,
            taskNumber,
          );
        }

        const score = await client.submit(task.run_id, response.text, {
          model_name: `${displayName} (+${spec.specialist_name})`,
          framework: options.framework,
          total_tokens: response.tokens,
        });

        const result: BenchResult = {
          bench_type: "model",
          category: specCategory,
          score: score.estimated_final,
          maxScore: 10,
          timeMs: response.timeMs,
          tokens: response.tokens,
          status: score.binary_score?.summary ?? score.status,
          specialist: true,
        };

        results.push(result);

        if (!options.json) {
          const scoreStr =
            result.score !== null ? `${result.score}/10` : "queued";
          process.stderr.write(
            `    ✅ ${specCategory}: ${scoreStr} (${formatTimeShort(response.timeMs)})\n`,
          );
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({
          bench_type: "model",
          category: specCategory,
          score: null,
          maxScore: 10,
          timeMs: 0,
          tokens: 0,
          status: "failed",
          specialist: true,
          error: msg,
        });

        if (!options.json) {
          process.stderr.write(`    ❌ ${specCategory}: ${msg}\n`);
        }
      }
    }
  }

  return results;
}

function pad(str: string, width: number): string {
  if (str.length >= width) return str.slice(0, width);
  return str + " ".repeat(width - str.length);
}
