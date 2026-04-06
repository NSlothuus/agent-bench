/**
 * Compare subcommand — compare two benchmark runs side by side.
 */

import { parseArgs } from "node:util";
import { ApiClient } from "../api-client.js";

function printCompareUsage(): void {
  const usage = `
agent-bench compare — Compare two benchmark runs.

USAGE:
  agent-bench compare <run-a> <run-b> [--server <url>]

EXAMPLES:
  agent-bench compare abc123 def456
`.trim();

  process.stderr.write(usage + "\n");
}

function pad(str: string, width: number, align: "left" | "right" = "left"): string {
  if (str.length >= width) return str.slice(0, width);
  const padding = " ".repeat(width - str.length);
  return align === "right" ? padding + str : str + padding;
}

interface RunResult {
  run_id: string;
  status: string;
  category?: string;
  model_name?: string;
  estimated_final?: number | null;
  total_tokens?: number;
  binary_score?: { summary?: string } | null;
}

export async function handleCompare(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      server: { type: "string" },
      json: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help) {
    printCompareUsage();
    process.exit(0);
  }

  if (positionals.length < 2) {
    process.stderr.write("Error: Two run IDs are required.\n\n");
    printCompareUsage();
    process.exit(1);
  }

  const [runA, runB] = positionals;
  const client = new ApiClient(values.server);

  const [resultA, resultB] = await Promise.all([
    client.results(runA) as Promise<RunResult>,
    client.results(runB) as Promise<RunResult>,
  ]);

  if (values.json) {
    process.stdout.write(
      JSON.stringify({ run_a: resultA, run_b: resultB }, null, 2) + "\n",
    );
    return;
  }

  const width = 60;
  const top = `╔${"═".repeat(width - 2)}╗`;
  const divider = `╠${"═".repeat(width - 2)}╣`;
  const bottom = `╚${"═".repeat(width - 2)}╝`;
  const innerWidth = width - 4;

  const line = (content: string): string =>
    `║ ${pad(content, innerWidth)} ║`;

  const lines: string[] = [];
  lines.push(top);
  lines.push(line("AGENT BENCH — Run Comparison"));
  lines.push(divider);

  const nameA = (resultA.model_name ?? resultA.run_id).slice(0, 20);
  const nameB = (resultB.model_name ?? resultB.run_id).slice(0, 20);

  lines.push(
    line(`${pad("", 14)}│ ${pad(nameA, 18)}│ ${pad(nameB, 18)}`),
  );
  const subline = `${"─".repeat(14)}┼${"─".repeat(20)}┼${"─".repeat(innerWidth - 14 - 20 - 2)}`;
  lines.push(line(subline));

  const scoreA = resultA.estimated_final ?? "—";
  const scoreB = resultB.estimated_final ?? "—";
  lines.push(
    line(
      `${pad("Score", 14)}│ ${pad(String(scoreA), 18)}│ ${pad(String(scoreB), 18)}`,
    ),
  );

  const statusA = resultA.binary_score?.summary ?? resultA.status;
  const statusB = resultB.binary_score?.summary ?? resultB.status;
  lines.push(
    line(
      `${pad("Status", 14)}│ ${pad(statusA, 18)}│ ${pad(statusB, 18)}`,
    ),
  );

  const tokensA = resultA.total_tokens ?? 0;
  const tokensB = resultB.total_tokens ?? 0;
  lines.push(
    line(
      `${pad("Tokens", 14)}│ ${pad(String(tokensA), 18)}│ ${pad(String(tokensB), 18)}`,
    ),
  );

  lines.push(bottom);

  process.stdout.write(lines.join("\n") + "\n");
}
