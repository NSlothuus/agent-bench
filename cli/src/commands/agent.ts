/**
 * Agent benchmark subcommand — run, results, leaderboard.
 *
 * Agent bench works differently from model bench:
 * - The agent itself runs the benchmark from inside its environment
 * - CLI fetches a task, prints it, agent works on it, pipes response back
 * - Or the agent calls the API directly (POST /api/bench/start → work → POST /api/bench/submit)
 * - This tests the full agent stack: model + tools + config + skills + memory
 */

import { parseArgs } from "node:util";
import { ApiClient } from "../api-client.js";
import { printLeaderboard, printAgentScorecard, type TaskResult } from "../display.js";
import { AGENT_CATEGORIES } from "../types.js";
import { callModelCli } from "../model-cli.js";
import { callModelApi } from "../model-api.js";
import { createWorkspace, captureWorkspace, cleanupWorkspace } from "../workspace.js";

function printAgentUsage(): void {
  const usage = `
agent-bench agent — Benchmark AI agent systems on autonomous tasks.

The agent bench tests your full agent stack: model + tools + config + skills.
Your agent works on real tasks using its own environment — no sandbox.

SUBCOMMANDS:
  run             Run agent benchmark
  results         View results for a specific run
  leaderboard     View the agent leaderboard

RUN OPTIONS:
  --cli <command>       Agent CLI command (e.g. "claude -p", "openclaw run")
  --api <url>           OpenAI-compatible API endpoint
  --model <model-id>    Model name (required with --api)
  --api-key <key>       API key (optional)
  --category <cat>      Only run specific category
                        Valid: ${AGENT_CATEGORIES.join(", ")}
  --framework <name>    Agent framework (openclaw, claude-code, codex, cursor)
  --model-name <name>   Display name for leaderboard
  --server <url>        Bench server URL
  --json                Output results as JSON

RESULTS OPTIONS:
  --run <id>            Run ID to fetch results for

LEADERBOARD OPTIONS:
  --sort <field>        Sort by: quality, speed, efficiency (default: quality)
  --limit <n>           Number of entries to show (default: 20)

HOW IT WORKS:
  1. CLI fetches a task from the API
  2. Task is sent to your agent (via --cli or --api)
  3. Your agent works on it using its full capabilities
  4. Response is submitted to the API for server-side scoring
  5. Results appear on bench.rapid42.com/agents

  The difference from 'model run': agent tasks are designed for
  multi-step workflows, tool use, and autonomous problem-solving.
  Your agent's real setup (tools, skills, memory) affects the score.

EXAMPLES:
  # Benchmark your OpenClaw setup
  agent-bench agent run --cli "openclaw run" --framework openclaw

  # Benchmark Claude Code
  agent-bench agent run --cli "claude -p" --framework claude-code

  # Run a specific category
  agent-bench agent run --cli "claude -p" --category coding

  # View agent setup rankings
  agent-bench agent leaderboard --sort efficiency
`.trim();

  process.stderr.write(usage + "\n");
}

function pad(str: string, width: number): string {
  if (str.length >= width) return str.slice(0, width);
  return str + " ".repeat(width - str.length);
}

function formatTimeShort(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

async function handleAgentRun(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      cli: { type: "string" },
      api: { type: "string" },
      model: { type: "string" },
      "api-key": { type: "string" },
      category: { type: "string" },
      framework: { type: "string" },
      "model-name": { type: "string" },
      server: { type: "string" },
      json: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (values.help) {
    printAgentUsage();
    process.exit(0);
  }

  // Must have --cli or --api
  if (values.cli === undefined && values.api === undefined) {
    process.stderr.write(
      "Error: Must provide --cli <command> or --api <url> --model <id>\n" +
      "  Your agent runs the task — this is how we test your full setup.\n\n",
    );
    printAgentUsage();
    process.exit(1);
  }

  if (values.api !== undefined && values.model === undefined) {
    process.stderr.write("Error: --model is required when using --api\n");
    process.exit(1);
  }

  if (
    values.category !== undefined &&
    !AGENT_CATEGORIES.includes(
      values.category as (typeof AGENT_CATEGORIES)[number],
    )
  ) {
    process.stderr.write(
      `Error: Invalid category "${values.category}". Valid: ${AGENT_CATEGORIES.join(", ")}\n`,
    );
    process.exit(1);
  }

  const client = new ApiClient(values.server);
  const displayName =
    values["model-name"] ?? values.model ?? values.cli ?? "unknown";
  const framework = values.framework ?? "unknown";

  const categories: string[] = values.category !== undefined
    ? [values.category]
    : [...AGENT_CATEGORIES];

  if (!values.json) {
    process.stderr.write("\n");
    process.stderr.write("  ╔══════════════════════════════════════╗\n");
    process.stderr.write("  ║    AGENT BENCH — Running...          ║\n");
    process.stderr.write(`  ║  Agent: ${pad(displayName, 28)}║\n`);
    process.stderr.write(`  ║  Framework: ${pad(framework, 24)}║\n`);
    process.stderr.write(`  ║  Tasks: ${pad(String(categories.length), 28)}║\n`);
    process.stderr.write("  ╠══════════════════════════════════════╣\n");
    process.stderr.write("  ║  Your agent works on real tasks       ║\n");
    process.stderr.write("  ║  using its own tools & environment.  ║\n");
    process.stderr.write("  ╚══════════════════════════════════════╝\n");
    process.stderr.write("\n");
  }

  // Align with TaskResult interface: add maxScore and specialist
  const results: TaskResult[] = [];
  let workspacePath: string | undefined;

  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    if (!values.json) {
      process.stderr.write(`  [${i + 1}/${categories.length}] ${category}: Fetching task...\n`);
    }

    let taskId: string | undefined;
    let runId: string | undefined;

    try {
      // 1. Fetch task from API
      const task = await client.start(category, "agent");
      taskId = task.task_id;
      runId = task.run_id;

      // 2. Create isolated workspace for this task
      workspacePath = await createWorkspace(runId, {});

      if (!values.json) {
        process.stderr.write(`  [${i + 1}/${categories.length}] ${category}: Sending to agent...\n`);
      }

      // 3. Send task to agent (via CLI pipe or API)
      const agentPrompt =
        `You are being benchmarked. Complete this task to the best of your ability using all available tools and capabilities.\n\n` +
        `Category: ${category}\n` +
        `Task ID: ${task.task_id}\n` +
        `Workspace: ${workspacePath}\n\n` +
        task.task_prompt;

      let response: { text: string; tokens: number; timeMs: number };

      if (values.cli !== undefined) {
        response = await callModelCli(values.cli, agentPrompt);
      } else {
        response = await callModelApi(values.api!, values.model!, agentPrompt, {
          apiKey: values["api-key"],
        });
      }

      // 4. Capture workspace state for reproducibility audit
      const snapshot = await captureWorkspace(workspacePath);

      if (!values.json) {
        process.stderr.write(`  [${i + 1}/${categories.length}] ${category}: Submitting for scoring...\n`);
      }

      // 5. Submit for scoring
      const score = await client.submit(runId, response.text, {
        model_name: displayName,
        framework,
        total_tokens: response.tokens,
        workspace_snapshot: snapshot,
      });

      results.push({
        category,
        score: score.estimated_final,
        maxScore: 10,
        timeMs: response.timeMs,
        tokens: response.tokens,
        status: score.binary_score?.summary ?? score.status,
      });

      if (!values.json) {
        const scoreStr = score.estimated_final !== null
          ? `${score.estimated_final}/10`
          : "queued";
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
        error: msg,
      });

      if (!values.json) {
        process.stderr.write(`    ❌ ${category}: ${msg}\n`);
      }
    } finally {
      // 6. Always clean up workspace
      if (workspacePath !== undefined) {
        await cleanupWorkspace(workspacePath).catch(() => { /* best effort */ });
      }
    }
  }

  // Print results
  if (values.json) {
    const scored = results.filter((r) => r.score !== null);
    const composite = scored.length > 0
      ? scored.reduce((sum, r) => sum + (r.score ?? 0), 0) / scored.length
      : 0;

    process.stdout.write(JSON.stringify({
      bench_type: "agent",
      agent: displayName,
      framework,
      composite: Number(composite.toFixed(2)),
      total_time_ms: results.reduce((sum, r) => sum + r.timeMs, 0),
      total_tokens: results.reduce((sum, r) => sum + r.tokens, 0),
      results: results.map((r) => ({
        category: r.category,
        score: r.score,
        max_score: r.maxScore,
        time_ms: r.timeMs,
        tokens: r.tokens,
        status: r.status,
        error: r.error ?? null,
      })),
      leaderboard_url: "https://bench.rapid42.com",
    }, null, 2) + "\n");
  } else {
    printAgentScorecard({
      modelName: displayName,
      framework,
      results,
      leaderboardUrl: "https://bench.rapid42.com",
    });
  }
}

async function handleAgentResults(args: string[]): Promise<void> {
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
      "Usage: agent-bench agent results --run <run-id> [--server <url>]\n",
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

async function handleAgentLeaderboard(args: string[]): Promise<void> {
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
      "Usage: agent-bench agent leaderboard [--sort quality|speed|efficiency] [--limit N] [--json]\n",
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
    bench_type: "agent",
  });

  if (values.json) {
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");
  } else {
    printLeaderboard(data, "agent");
  }
}

export async function handleAgent(args: string[]): Promise<void> {
  const subcommand = args[0];

  switch (subcommand) {
    case "run":
      await handleAgentRun(args.slice(1));
      break;
    case "results":
      await handleAgentResults(args.slice(1));
      break;
    case "leaderboard":
      await handleAgentLeaderboard(args.slice(1));
      break;
    case "--help":
    case "-h":
    case undefined:
      printAgentUsage();
      break;
    default:
      process.stderr.write(
        `Unknown agent subcommand: "${subcommand}". Use: run, results, leaderboard\n`,
      );
      process.exit(1);
  }
}
