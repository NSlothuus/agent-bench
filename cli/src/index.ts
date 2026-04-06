#!/usr/bin/env node

/**
 * Agent Bench CLI — Benchmark AI models and agent systems.
 *
 * Usage:
 *   agent-bench model run --api <url> --model <id>
 *   agent-bench model run --cli "claude -p"
 *   agent-bench agent run --framework openclaw
 *   agent-bench compare <run-a> <run-b>
 *   agent-bench profile
 *
 * Backward compatible: bare flags (--api, --cli) route to model run.
 * Zero runtime dependencies. Node.js 18+ required.
 */

import { handleModel } from "./commands/model.js";
import { handleAgent } from "./commands/agent.js";
import { handleCompare } from "./commands/compare.js";
import { handleProfile } from "./commands/profile.js";

function printUsage(): void {
  const usage = `
Agent Bench — Benchmark AI models and agent systems. Server-scored, zero deps.

USAGE:
  agent-bench <command> [subcommand] [options]

COMMANDS:
  model           Benchmark AI models (run, results, leaderboard)
  agent           Benchmark AI agents (run, results, leaderboard)
  compare         Compare two benchmark runs
  profile         View your benchmark history

EXAMPLES:
  # Benchmark a local Ollama model
  agent-bench model run --api http://localhost:11434/v1 --model llama3.1

  # Benchmark Claude Code CLI
  agent-bench model run --cli "claude -p" --model-name "Claude Code"

  # View model leaderboard
  agent-bench model leaderboard --sort quality --limit 10

  # Agent benchmark (coming soon)
  agent-bench agent run --framework openclaw --model claude-sonnet-4

  # Compare two runs
  agent-bench compare abc123 def456

  # View your profile
  agent-bench profile

BACKWARD COMPATIBLE:
  agent-bench --api <url> --model <id>   → routes to model run
  agent-bench --cli "claude -p"          → routes to model run

Run 'agent-bench <command> --help' for detailed command help.
`.trim();

  process.stderr.write(usage + "\n");
}

/**
 * Check if args contain bare flags (backward compatibility with old CLI).
 * Old usage: agent-bench --api <url> --model <id>
 * New usage: agent-bench model run --api <url> --model <id>
 */
function isLegacyInvocation(args: string[]): boolean {
  const firstArg = args[0];
  if (firstArg === undefined) return false;
  return firstArg.startsWith("--");
}

async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);
    const subcommand = args[0];

    // Backward compatibility: bare flags route to model run
    if (isLegacyInvocation(args)) {
      await handleModel(["run", ...args]);
      return;
    }

    switch (subcommand) {
      case "model":
        await handleModel(args.slice(1));
        break;
      case "agent":
        await handleAgent(args.slice(1));
        break;
      case "compare":
        await handleCompare(args.slice(1));
        break;
      case "profile":
        await handleProfile(args.slice(1));
        break;
      case "--help":
      case "-h":
        printUsage();
        break;
      case "--version":
      case "-v":
        process.stdout.write("agent-bench 0.2.0\n");
        break;
      default:
        if (subcommand === undefined) {
          printUsage();
        } else {
          process.stderr.write(
            `Unknown command: "${subcommand}". Run 'agent-bench --help' for usage.\n`,
          );
          process.exit(1);
        }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`\nFatal error: ${msg}\n`);
    process.exit(1);
  }
}

main();
