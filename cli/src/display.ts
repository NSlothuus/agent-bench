/**
 * Scorecard and progress display formatting.
 * Zero dependencies: uses only string manipulation.
 */

export interface TaskResult {
  category: string;
  score: number | null;
  maxScore: number;
  timeMs: number;
  tokens: number;
  status: string;
  specialist: boolean;
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
