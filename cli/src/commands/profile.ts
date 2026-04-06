/**
 * Profile subcommand — view user benchmark history.
 */

import { parseArgs } from "node:util";
import { ApiClient } from "../api-client.js";

function printProfileUsage(): void {
  const usage = `
agent-bench profile — View your benchmark history.

USAGE:
  agent-bench profile [--server <url>] [--json]

OPTIONS:
  --server <url>   Bench server URL
  --json           Output as JSON
`.trim();

  process.stderr.write(usage + "\n");
}

function pad(str: string, width: number): string {
  if (str.length >= width) return str.slice(0, width);
  return str + " ".repeat(width - str.length);
}

interface ProfileData {
  total_runs: number;
  models_tested: number;
  best_score: number | null;
  recent_runs: Array<{
    run_id: string;
    model_name: string;
    score: number | null;
    created_at: string;
  }>;
}

export async function handleProfile(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      server: { type: "string" },
      json: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (values.help) {
    printProfileUsage();
    process.exit(0);
  }

  const client = new ApiClient(values.server);
  const data = (await client.profile()) as ProfileData;

  if (values.json) {
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");
    return;
  }

  const width = 55;
  const top = `╔${"═".repeat(width - 2)}╗`;
  const divider = `╠${"═".repeat(width - 2)}╣`;
  const bottom = `╚${"═".repeat(width - 2)}╝`;
  const innerWidth = width - 4;

  const line = (content: string): string =>
    `║ ${pad(content, innerWidth)} ║`;

  const lines: string[] = [];
  lines.push(top);
  lines.push(line("AGENT BENCH — Profile"));
  lines.push(divider);
  lines.push(line(`Total runs:     ${data.total_runs}`));
  lines.push(line(`Models tested:  ${data.models_tested}`));
  lines.push(
    line(`Best score:     ${data.best_score !== null ? String(data.best_score) : "—"}`),
  );
  lines.push(divider);
  lines.push(line("Recent Runs:"));

  if (data.recent_runs.length === 0) {
    lines.push(line("  No runs yet. Try: agent-bench model run"));
  } else {
    for (const run of data.recent_runs.slice(0, 10)) {
      const scoreStr =
        run.score !== null ? `${run.score}/10` : "pending";
      const date = run.created_at.slice(0, 10);
      lines.push(
        line(`  ${pad(run.model_name, 20)} ${pad(scoreStr, 10)} ${date}`),
      );
    }
  }

  lines.push(bottom);

  process.stdout.write(lines.join("\n") + "\n");
}
