/**
 * GET /api/bench/leaderboard
 * Return ranked leaderboard entries.
 */

import type { Env } from "../types.js";
import { jsonResponse } from "../utils.js";

interface LeaderboardRow {
  model_name: string;
  framework: string | null;
  final_composite: number;
  time_elapsed_ms: number;
  tokens_used: number;
  efficiency_score: number | null;
  total_cost_usd: number | null;
}

const VALID_SORT_BY = ["quality", "speed", "efficiency", "cost"] as const;

export async function handleLeaderboard(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const sortByParam = url.searchParams.get("sort_by") ?? url.searchParams.get("sort") ?? "quality";
  const limitParam = url.searchParams.get("limit") ?? "10";
  const frameworkFilter = url.searchParams.get("framework");
  const modelFilter = url.searchParams.get("model");

  const sortBy = VALID_SORT_BY.includes(sortByParam as (typeof VALID_SORT_BY)[number])
    ? sortByParam
    : "quality";

  const limit = Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 50);

  // Determine sort column
  let orderBy: string;
  switch (sortBy) {
    case "speed":
      orderBy = "time_elapsed_ms ASC";
      break;
    case "efficiency":
      orderBy = "COALESCE(efficiency_score, final_composite / NULLIF(tokens_used, 0)) DESC";
      break;
    case "cost":
      orderBy = "COALESCE(total_cost_usd, 999999) ASC";
      break;
    default:
      orderBy = "final_composite DESC";
      break;
  }

  // Build WHERE clause with optional filters
  const whereClauses: string[] = [
    "status IN ('scored', 'submitted')",
    "model_name IS NOT NULL",
    "final_composite IS NOT NULL",
  ];
  const bindings: (string | number)[] = [];

  if (frameworkFilter !== null) {
    whereClauses.push("framework = ?");
    bindings.push(frameworkFilter);
  }
  if (modelFilter !== null) {
    whereClauses.push("model_name LIKE ?");
    bindings.push(`%${modelFilter}%`);
  }

  bindings.push(limit);

  const whereStr = whereClauses.join(" AND ");

  const stmt = env.DB.prepare(
    `SELECT model_name, framework, final_composite, time_elapsed_ms, tokens_used, efficiency_score, total_cost_usd
     FROM bench_runs
     WHERE ${whereStr}
     ORDER BY ${orderBy}
     LIMIT ?`,
  );

  const rows = await stmt.bind(...bindings).all<LeaderboardRow>();

  // Get total count with same filters (minus limit)
  const countBindings = bindings.slice(0, -1);
  const countStmt = env.DB.prepare(
    `SELECT COUNT(*) as total FROM bench_runs WHERE ${whereStr}`,
  );
  const countResult = countBindings.length > 0
    ? await countStmt.bind(...countBindings).first<{ total: number }>()
    : await countStmt.first<{ total: number }>();

  const entries = rows.results.map((row, index) => ({
    model: row.model_name ?? "unknown",
    score: row.final_composite ?? 0,
    rank: index + 1,
    time_ms: row.time_elapsed_ms ?? 0,
    tokens: row.tokens_used ?? 0,
    framework: row.framework ?? undefined,
    efficiency_score: row.efficiency_score ?? undefined,
    cost_usd: row.total_cost_usd ?? undefined,
  }));

  return jsonResponse({
    success: true,
    data: {
      entries,
      total: countResult?.total ?? 0,
    },
  });
}
