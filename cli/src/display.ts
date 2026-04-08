/**
 * Scorecard and progress display formatting.
 * Zero dependencies: uses only string manipulation.
 */

export interface TaskResult {
  category: string;
  taskId?: string;
  runId?: string;
  score: number | null;
  maxScore: number;
  timeMs: number;
  tokens: number;
  status: string;
  specialist?: boolean;
  error?: string;
}

export interface ScorecardOptions {
  modelName: string;
  framework?: string;
  results: TaskResult[];
  leaderboardUrl?: string;
}

/**
 * Format milliseconds as a human-readable string.
 */
function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

/**
 * Format token count with commas.
 */
function formatTokens(tokens: number): string {
  return tokens.toLocaleString("en-US");
}

/**
 * Pad a string to a given width.
 */
function pad(str: string, width: number, align: "left" | "right" = "left"): string {
  if (str.length >= width) return str.slice(0, width);
  const padding = " ".repeat(width - str.length);
  return align === "right" ? padding + str : str + padding;
}

/**
 * Print progress for a single task.
 */
export function printProgress(
  category: string,
  step: string,
  total: number,
  current: number,
): void {
  const prefix = `  [${current}/${total}]`;
  process.stderr.write(`${prefix} ${category}: ${step}\n`);
}

/**
 * Print the final scorecard.
 */
export function printScorecard(options: ScorecardOptions): void {
  const { modelName, framework, results, leaderboardUrl } = options;
  const width = 63;
  const innerWidth = width - 4; // account for ║ + space on each side

  const line = (content: string): string =>
    `║ ${pad(content, innerWidth)} ║`;
  const divider = `╠${"═".repeat(width - 2)}╣`;
  const top = `╔${"═".repeat(width - 2)}╗`;
  const bottom = `╚${"═".repeat(width - 2)}╝`;

  const lines: string[] = [];

  // Header
  lines.push(top);
  lines.push(line("AGENT BENCH — Results"));
  const modelLine = framework
    ? `Model: ${modelName} via ${framework}`
    : `Model: ${modelName}`;
  lines.push(line(modelLine));
  lines.push(divider);

  // Column headers
  const header = `${pad("Category", 14)}│${pad(" Score", 8)}│${pad(" Time", 9)}│${pad(" Tokens", 9)}│ Status`;
  lines.push(line(header));
  const subline = `${"─".repeat(14)}┼${"─".repeat(8)}┼${"─".repeat(9)}┼${"─".repeat(9)}┼${"─".repeat(innerWidth - 14 - 8 - 9 - 9 - 4)}`;
  lines.push(line(subline));

  // Results rows
  for (const result of results) {
    const cat = pad(result.category, 14);
    const scoreStr = result.score !== null
      ? pad(` ${result.score}/${result.maxScore}`, 8)
      : pad(" --", 8);
    const timeStr = pad(` ${formatTime(result.timeMs)}`, 9);
    const tokenStr = pad(` ${formatTokens(result.tokens)}`, 9);

    let statusIcon: string;
    if (result.error !== undefined) {
      statusIcon = `❌ ${result.error.slice(0, 15)}`;
    } else if (result.score !== null && result.score >= result.maxScore * 0.7) {
      statusIcon = `✅ ${result.status}`;
    } else if (result.score !== null) {
      statusIcon = `⚠️  ${result.status}`;
    } else {
      statusIcon = `⏳ ${result.status}`;
    }

    const row = `${cat}│${scoreStr}│${timeStr}│${tokenStr}│ ${statusIcon}`;
    lines.push(line(row));
  }

  // Summary
  lines.push(divider);

  const scored = results.filter((r) => r.score !== null);
  const composite =
    scored.length > 0
      ? scored.reduce((sum, r) => sum + (r.score ?? 0), 0) / scored.length
      : 0;
  const totalTime = results.reduce((sum, r) => sum + r.timeMs, 0);
  const totalTokens = results.reduce((sum, r) => sum + r.tokens, 0);

  const summary = `COMPOSITE: ${composite.toFixed(2)}/${results[0]?.maxScore ?? 10} │ Total: ${formatTime(totalTime)} │ Tokens: ${formatTokens(totalTokens)}`;
  lines.push(line(summary));

  if (leaderboardUrl !== undefined) {
    lines.push(line(`Leaderboard: ${leaderboardUrl}`));
  }

  lines.push(bottom);

  // Print to stdout
  process.stdout.write(lines.join("\n") + "\n");
}

/**
 * Print agent-specific scorecard with completion %, tool efficiency, recovery score.
 */
export function printAgentScorecard(options: ScorecardOptions): void {
  const { modelName, framework, results, leaderboardUrl } = options;
  const width = 63;
  const innerWidth = width - 4;

  const line = (content: string): string =>
    `║ ${pad(content, innerWidth)} ║`;
  const divider = `╠${"═".repeat(width - 2)}╣`;
  const top = `╔${"═".repeat(width - 2)}╗`;
  const bottom = `╚${"═".repeat(width - 2)}╝`;

  const lines: string[] = [];

  lines.push(top);
  lines.push(line("AGENT BENCH — Agent Results"));
  const modelLine = framework
    ? `Agent: ${modelName} via ${framework}`
    : `Agent: ${modelName}`;
  lines.push(line(modelLine));
  lines.push(divider);

  const header = `${pad("Category", 14)}│${pad(" Complete", 10)}│${pad(" Efficiency", 12)}│ Recovery`;
  lines.push(line(header));
  const subline = `${"─".repeat(14)}┼${"─".repeat(10)}┼${"─".repeat(12)}┼${"─".repeat(innerWidth - 14 - 10 - 12 - 3)}`;
  lines.push(line(subline));

  for (const result of results) {
    const cat = pad(result.category, 14);
    const pct = result.score !== null
      ? pad(` ${Math.round((result.score / result.maxScore) * 100)}%`, 10)
      : pad(" --", 10);
    const efficiency = pad(` ${formatTokens(result.tokens)}t`, 12);
    const recovery = result.error !== undefined ? "❌" : "✅";

    lines.push(line(`${cat}│${pct}│${efficiency}│ ${recovery}`));
  }

  lines.push(divider);

  const scored = results.filter((r) => r.score !== null);
  const avgCompletion =
    scored.length > 0
      ? scored.reduce((sum, r) => sum + ((r.score ?? 0) / r.maxScore) * 100, 0) /
        scored.length
      : 0;
  const totalTokens = results.reduce((sum, r) => sum + r.tokens, 0);

  lines.push(
    line(`Completion: ${avgCompletion.toFixed(0)}% │ Tokens: ${formatTokens(totalTokens)}`),
  );

  if (leaderboardUrl !== undefined) {
    lines.push(line(`Leaderboard: ${leaderboardUrl}`));
  }

  lines.push(bottom);

  process.stdout.write(lines.join("\n") + "\n");
}

/**
 * Print leaderboard table.
 */
export function printLeaderboard(
  data: { entries: Array<{ model: string; score: number; rank: number; time_ms: number; tokens: number; framework?: string; efficiency_score?: number }>; total: number },
  benchType: string,
): void {
  const width = 72;
  const innerWidth = width - 4;

  const line = (content: string): string =>
    `║ ${pad(content, innerWidth)} ║`;
  const divider = `╠${"═".repeat(width - 2)}╣`;
  const top = `╔${"═".repeat(width - 2)}╗`;
  const bottom = `╚${"═".repeat(width - 2)}╝`;

  const lines: string[] = [];

  const title =
    benchType === "agent"
      ? "AGENT BENCH — Agent Leaderboard"
      : "AGENT BENCH — Model Leaderboard";

  lines.push(top);
  lines.push(line(title));
  lines.push(line(`Total entries: ${data.total}`));
  lines.push(divider);

  const header = `${pad("#", 4)}│${pad(" Model", 24)}│${pad(" Score", 8)}│${pad(" Time", 10)}│${pad(" Tokens", 10)}│ Framework`;
  lines.push(line(header));
  const subline = `${"─".repeat(4)}┼${"─".repeat(24)}┼${"─".repeat(8)}┼${"─".repeat(10)}┼${"─".repeat(10)}┼${"─".repeat(innerWidth - 4 - 24 - 8 - 10 - 10 - 5)}`;
  lines.push(line(subline));

  for (const entry of data.entries) {
    const rank = pad(String(entry.rank), 4);
    const model = pad(` ${entry.model}`, 24);
    const score = pad(` ${entry.score.toFixed(1)}`, 8);
    const time = pad(` ${formatTime(entry.time_ms)}`, 10);
    const tokens = pad(` ${formatTokens(entry.tokens)}`, 10);
    const fw = entry.framework ?? "—";

    lines.push(line(`${rank}│${model}│${score}│${time}│${tokens}│ ${fw}`));
  }

  lines.push(bottom);

  process.stdout.write(lines.join("\n") + "\n");
}

/**
 * Print results as JSON.
 */
export function printJson(options: ScorecardOptions): void {
  const scored = options.results.filter((r) => r.score !== null);
  const composite =
    scored.length > 0
      ? scored.reduce((sum, r) => sum + (r.score ?? 0), 0) / scored.length
      : 0;

  const output = {
    model: options.modelName,
    framework: options.framework ?? null,
    composite: Number(composite.toFixed(2)),
    total_time_ms: options.results.reduce((sum, r) => sum + r.timeMs, 0),
    total_tokens: options.results.reduce((sum, r) => sum + r.tokens, 0),
    results: options.results.map((r) => ({
      category: r.category,
      task_id: r.taskId ?? null,
      run_id: r.runId ?? null,
      score: r.score,
      max_score: r.maxScore,
      time_ms: r.timeMs,
      tokens: r.tokens,
      status: r.status,
      specialist: r.specialist,
      error: r.error ?? null,
    })),
    leaderboard_url: options.leaderboardUrl ?? null,
  };

  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
}
