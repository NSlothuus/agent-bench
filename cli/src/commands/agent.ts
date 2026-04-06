/**
 * Agent benchmark subcommand — run, results, leaderboard.
 * Agent run is a stub for now; results and leaderboard are fully implemented.
 */

import { parseArgs } from "node:util";
import { ApiClient } from "../api-client.js";
import { printLeaderboard } from "../display.js";
import { AGENT_CATEGORIES } from "../types.js";

function printAgentUsage(): void {
  const usage = `
agent-bench agent — Benchmark AI agent systems on autonomous tasks.

SUBCOMMANDS:
  run             Run agent benchmark
  results         View results for a specific run
  leaderboard     View the agent leaderboard

RUN OPTIONS:
  --category <cat>      Only run specific category
                        Valid: ${AGENT_CATEGORIES.join(", ")}
  --framework <name>    Agent framework (openclaw, claude-code, codex, cursor)
  --model <model-id>    Model backing the agent
  --server <url>        Bench server URL
  --json                Output results as JSON

RESULTS OPTIONS:
  --run <id>            Run ID to fetch results for

LEADERBOARD OPTIONS:
  --sort <field>        Sort by: quality, speed, efficiency (default: quality)
  --limit <n>           Number of entries to show (default: 20)

EXAMPLES:
  agent-bench agent run --framework openclaw --model claude-sonnet-4
  agent-bench agent leaderboard --sort efficiency --limit 10
  agent-bench agent results --run abc123
`.trim();

  process.stderr.write(usage + "\n");
}

async function handleAgentRun(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      category: { type: "string" },
      framework: { type: "string" },
      model: { type: "string" },
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

  process.stderr.write("\n");
  process.stderr.write("  ╔══════════════════════════════════════╗\n");
  process.stderr.write("  ║    AGENT BENCH — Agent Mode          ║\n");
  process.stderr.write("  ╠══════════════════════════════════════╣\n");
  process.stderr.write("  ║  🚧 Agent bench coming soon.         ║\n");
  process.stderr.write("  ║                                      ║\n");
  process.stderr.write("  ║  Try: agent-bench model run           ║\n");
  process.stderr.write("  ║       agent-bench agent leaderboard  ║\n");
  process.stderr.write("  ╚══════════════════════════════════════╝\n");
  process.stderr.write("\n");
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
