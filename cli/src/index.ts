#!/usr/bin/env node

/**
 * Agent Bench CLI — Benchmark any AI model against server-scored tasks.
 *
 * Usage:
 *   npx @rapid42/agent-bench --api <url> --model <id>
 *   npx @rapid42/agent-bench --cli "claude -p"
 *
 * Zero runtime dependencies. Node.js 18+ required.
 */

import { parseArgs } from "node:util";
import { ApiClient } from "./api-client.js";
import { callModelApi } from "./model-api.js";
import { callModelCli } from "./model-cli.js";
import {
  printProgress,
  printScorecard,
  printJson,
  type TaskResult,
} from "./display.js";

const ALL_CATEGORIES = [
  "code",
  "writing",
  "reasoning",
  "design",
  "multi-step",
  "safety",
] as const;

const MAX_RETRIES = 1;

interface BenchOptions {
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

function printUsage(): void {
  const usage = `
Agent Bench — Benchmark any AI model. Server-scored, zero deps.

USAGE:
  agent-bench --api <url> --model <model-id> [options]
  agent-bench --cli "claude -p" [options]

MODEL BACKENDS:
  --api <url>           OpenAI-compatible API (e.g. http://localhost:11434/v1)
  --model <model-id>    Model name for API calls (required with --api)
  --api-key <key>       API key (optional, for authenticated endpoints)
  --cli <command>       CLI pipe mode (e.g. "claude -p", "gemini -p")

OPTIONS:
  --specialist          Enable specialist prompts (enhances task context)
  --category <cat>      Only run specific category
                        Valid: code, writing, reasoning, design, multi-step, safety
  --model-name <name>   Display name for leaderboard (defaults to --model)
  --framework <name>    Framework name (lm-studio, ollama, openclaw, etc)
  --server <url>        Bench server URL
                        (default: https://agent-bench-api.nicolaislothuus.workers.dev)
  --json                Output results as JSON
  --help                Show this help

EXAMPLES:
  # Benchmark a local Ollama model
  agent-bench --api http://localhost:11434/v1 --model llama3.1

  # Benchmark via LM Studio
  agent-bench --api http://localhost:1234/v1 --model qwen3-8b \\
    --framework lm-studio --model-name "Qwen3 8B"

  # Benchmark Claude Code CLI
  agent-bench --cli "claude -p" --model-name "Claude Code" --framework claude-code

  # Run only code tasks with specialist prompts
  agent-bench --api http://localhost:11434/v1 --model deepseek-r1 \\
    --category code --specialist

  # Output as JSON for scripting
  agent-bench --api http://localhost:11434/v1 --model phi-4 --json
`.trim();

  process.stderr.write(usage + "\n");
}

function parseCliArgs(): BenchOptions {
  const { values } = parseArgs({
    options: {
      api: { type: "string" },
      model: { type: "string" },
      "api-key": { type: "string" },
      cli: { type: "string" },
      specialist: { type: "boolean", default: false },
      category: { type: "string" },
      "model-name": { type: "string" },
      framework: { type: "string" },
      server: { type: "string" },
      json: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  // Validate: must have --api+--model OR --cli
  if (values.api === undefined && values.cli === undefined) {
    process.stderr.write(
      "Error: Must provide --api <url> --model <id> OR --cli <command>\n\n",
    );
    printUsage();
    process.exit(1);
  }

  if (values.api !== undefined && values.model === undefined) {
    process.stderr.write(
      "Error: --model is required when using --api\n\n",
    );
    printUsage();
    process.exit(1);
  }

  // Validate category
  if (
    values.category !== undefined &&
    !ALL_CATEGORIES.includes(values.category as (typeof ALL_CATEGORIES)[number])
  ) {
    process.stderr.write(
      `Error: Invalid category "${values.category}". Valid: ${ALL_CATEGORIES.join(", ")}\n`,
    );
    process.exit(1);
  }

  return {
    api: values.api,
    model: values.model,
    apiKey: values["api-key"],
    cli: values.cli,
    specialist: values.specialist ?? false,
    category: values.category,
    modelName: values["model-name"],
    framework: values.framework,
    server: values.server,
    json: values.json ?? false,
  };
}

/**
 * Call the model (API or CLI) with retry logic.
 */
async function callModel(
  options: BenchOptions,
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
        // Brief pause before retry
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  throw lastError ?? new Error("Unknown error calling model");
}

/**
 * Run the full benchmark.
 */
async function runBenchmark(options: BenchOptions): Promise<void> {
  const client = new ApiClient(options.server);
  const displayName =
    options.modelName ?? options.model ?? options.cli ?? "unknown";

  const categories: string[] = options.category !== undefined
    ? [options.category]
    : [...ALL_CATEGORIES];

  const totalTasks = options.specialist
    ? categories.length * 2 // vanilla + specialist
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

  const results: TaskResult[] = [];
  let taskNumber = 0;

  for (const category of categories) {
    // --- Vanilla run (no specialist) ---
    taskNumber++;
    if (!options.json) {
      printProgress(category, "Starting task...", totalTasks, taskNumber);
    }

    try {
      // 1. Fetch task from server
      const task = await client.start(category);

      if (!options.json) {
        printProgress(
          category,
          "Sending to model...",
          totalTasks,
          taskNumber,
        );
      }

      // 2. Call model
      const response = await callModel(options, task.task_prompt);

      if (!options.json) {
        printProgress(
          category,
          "Submitting for scoring...",
          totalTasks,
          taskNumber,
        );
      }

      // 3. Submit for scoring
      const score = await client.submit(task.run_id, response.text, {
        model_name: displayName,
        framework: options.framework,
        total_tokens: response.tokens,
      });

      const result: TaskResult = {
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

    // --- Specialist run (if enabled) ---
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
        // 1. Get specialist prompt
        const spec = await client.specialist(
          category,
          options.model ?? options.cli,
        );

        // 2. Fetch task
        const task = await client.start(category);

        if (!options.json) {
          printProgress(
            specCategory,
            "Sending to model (with specialist)...",
            totalTasks,
            taskNumber,
          );
        }

        // 3. Call model with specialist system prompt
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

        // 4. Submit for scoring
        const score = await client.submit(task.run_id, response.text, {
          model_name: `${displayName} (+${spec.specialist_name})`,
          framework: options.framework,
          total_tokens: response.tokens,
        });

        const result: TaskResult = {
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

  // Print results
  if (!options.json) {
    process.stderr.write("\n");
    printScorecard({
      modelName: displayName,
      framework: options.framework,
      results,
      leaderboardUrl: "https://bench.rapid42.com",
    });
  } else {
    printJson({
      modelName: displayName,
      framework: options.framework,
      results,
      leaderboardUrl: "https://bench.rapid42.com",
    });
  }
}

function pad(str: string, width: number): string {
  if (str.length >= width) return str.slice(0, width);
  return str + " ".repeat(width - str.length);
}

function formatTimeShort(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// --- Main ---

async function main(): Promise<void> {
  try {
    const options = parseCliArgs();
    await runBenchmark(options);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`\nFatal error: ${msg}\n`);
    process.exit(1);
  }
}

main();
