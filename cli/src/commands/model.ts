/**
 * Model benchmark subcommand — run, results, leaderboard.
 * Preserves all existing model benchmark functionality.
 */

import { parseArgs } from "node:util";
import { ApiClient } from "../api-client.js";
import { runModelBench } from "../runner.js";
import {
  printScorecard,
  printJson,
  printLeaderboard,
} from "../display.js";
import { MODEL_CATEGORIES } from "../types.js";
import type { ModelBenchOptions } from "../types.js";

function printModelUsage(): void {
  const usage = `
agent-bench model — Benchmark AI models with server-scored tasks.

SUBCOMMANDS:
  run             Run model benchmark
  results         View results for a specific run
  leaderboard     View the model leaderboard

RUN OPTIONS:
  --api <url>           OpenAI-compatible API endpoint
  --model <model-id>    Model name for API calls (required with --api)
  --api-key <key>       API key (optional)
  --cli <command>       CLI pipe mode (e.g. "claude -p")
  --specialist          Enable specialist prompts
  --no-parallel         Disable parallel execution (default: parallel)
  --retries <n>         Retry failed tasks N times (default: 3, use 0 to disable)
  --retry-delay <secs>  Seconds to wait before retrying (default: 30)
  --category <cat>      Only run specific category
                        Valid: ${MODEL_CATEGORIES.join(", ")}
  --model-name <name>   Display name for leaderboard
  --framework <name>    Framework name (lm-studio, ollama, etc)
  --temperature <n>     Sampling temperature 0.0-1.0 (default: 0.0 for reproducibility)
  --max-tokens <n>      Max response tokens (default: 8192)
  --runs <n>            Number of full benchmark runs (default: 1, use 3+ for CI)
                        Aggregates scores across runs for statistical significance
  --server <url>        Bench server URL
  --json                Output results as JSON

RESULTS OPTIONS:
  --run <id>            Run ID to fetch results for

LEADERBOARD OPTIONS:
  --sort <field>        Sort by: quality, speed, efficiency (default: quality)
  --limit <n>           Number of entries to show (default: 20)

EXAMPLES:
  agent-bench model run --api http://localhost:11434/v1 --model llama3.1
  agent-bench model run --cli "claude -p" --model-name "Claude Code"
  agent-bench model leaderboard --sort speed --limit 10
  agent-bench model results --run abc123
`.trim();

  process.stderr.write(usage + "\n");
}

async function handleModelRun(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      api: { type: "string" },
      model: { type: "string" },
      "api-key": { type: "string" },
      cli: { type: "string" },
      specialist: { type: "boolean", default: false },
      "no-parallel": { type: "boolean", default: false },
      retries: { type: "string", default: "3" },
      "retry-delay": { type: "string", default: "30" },
      category: { type: "string" },
      "model-name": { type: "string" },
      framework: { type: "string" },
      temperature: { type: "string" },
      "max-tokens": { type: "string" },
      runs: { type: "string" },
      server: { type: "string" },
      json: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (values.help) {
    printModelUsage();
    process.exit(0);
  }

  if (values.api === undefined && values.cli === undefined) {
    process.stderr.write(
      "Error: Must provide --api <url> --model <id> OR --cli <command>\n\n",
    );
    printModelUsage();
    process.exit(1);
  }

  if (values.api !== undefined && values.model === undefined) {
    process.stderr.write("Error: --model is required when using --api\n\n");
    printModelUsage();
    process.exit(1);
  }

  if (
    values.category !== undefined &&
    !MODEL_CATEGORIES.includes(
      values.category as (typeof MODEL_CATEGORIES)[number],
    )
  ) {
    process.stderr.write(
      `Error: Invalid category "${values.category}". Valid: ${MODEL_CATEGORIES.join(", ")}\n`,
    );
    process.exit(1);
  }

  const options: ModelBenchOptions = {
    api: values.api,
    model: values.model,
    apiKey: values["api-key"],
    cli: values.cli,
    specialist: values.specialist ?? false,
    parallel: values["no-parallel"] ? false : true,
    retries: values.retries !== undefined ? parseInt(values.retries, 10) : 3,
    retryDelay: parseInt(values["retry-delay"], 10) || 30,
    category: values.category,
    modelName: values["model-name"],
    framework: values.framework,
    temperature: values.temperature !== undefined ? parseFloat(values.temperature) : 0.0,
    maxTokens: values["max-tokens"] !== undefined ? parseInt(values["max-tokens"], 10) : undefined,
    runs: values.runs !== undefined ? Math.max(1, parseInt(values.runs, 10)) : 1,
    server: values.server,
    json: values.json ?? false,
  };

  const displayName =
    options.modelName ?? options.model ?? options.cli ?? "unknown";
  const results = await runModelBench(options);

  // Multi-run already printed stats summary in the runner.
  // For single-run, print the per-category scorecard.
  if (!options.json && (options.runs ?? 1) === 1) {
    process.stderr.write("\n");
    printScorecard({
      modelName: displayName,
      framework: options.framework,
      results,
      leaderboardUrl: "https://bench.rapid42.com",
    });
  }

  if (options.json) {
    printJson({
      modelName: displayName,
      framework: options.framework,
      results,
      leaderboardUrl: "https://bench.rapid42.com",
    });
  }
}

async function handleModelResults(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      run: { type: "string" },
      server: { type: "string" },
      help: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (values.help || values.run === undefined) {
    process.stderr.write(
      "Usage: agent-bench model results --run <run-id> [--server <url>]\n",
    );
    if (values.run === undefined && !values.help) {
      process.stderr.write("Error: --run is required\n");
    }
    process.exit(values.help ? 0 : 1);
  }

  const client = new ApiClient(values.server);
  const result = await client.results(values.run);

  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

async function handleModelLeaderboard(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      sort: { type: "string" },
      limit: { type: "string" },
      framework: { type: "string" },
      model: { type: "string" },
      server: { type: "string" },
      json: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (values.help) {
    process.stderr.write(
      "Usage: agent-bench model leaderboard [--sort quality|speed|efficiency] [--limit N] [--json]\n",
    );
    process.exit(0);
  }

  const limit =
    values.limit !== undefined ? parseInt(values.limit, 10) : undefined;

  const client = new ApiClient(values.server);
  const data = await client.leaderboard({
    sort: values.sort,
    limit,
    framework: values.framework,
    model: values.model,
    bench_type: "model",
  });

  if (values.json) {
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");
  } else {
    printLeaderboard(data, "model");
  }
}

export async function handleModel(args: string[]): Promise<void> {
  const subcommand = args[0];

  switch (subcommand) {
    case "run":
      await handleModelRun(args.slice(1));
      break;
    case "results":
      await handleModelResults(args.slice(1));
      break;
    case "leaderboard":
      await handleModelLeaderboard(args.slice(1));
      break;
    case "--help":
    case "-h":
    case undefined:
      printModelUsage();
      break;
    default:
      process.stderr.write(
        `Unknown model subcommand: "${subcommand}". Use: run, results, leaderboard\n`,
      );
      process.exit(1);
  }
}
