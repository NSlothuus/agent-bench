/**
 * GET /api/bench/leaderboard
 * Return ranked leaderboard entries.
 */

import type { Env } from "../types.js";
import { jsonResponse } from "../utils.js";

interface LeaderboardRow {
  model_name: string;
  final_composite: number;
  time_elapsed_ms: number;
  tokens_used: number;
}

const VALID_SORT_BY = ["quality", "speed", "efficiency"] as const;

export async function handleLeaderboard(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const sortByParam = url.searchParams.get("sort_by") ?? "quality";
  const limitParam = url.searchParams.get("limit") ?? "10";

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
      // Efficiency = score / tokens_used (higher is better)
      orderBy = "(final_composite / NULLIF(tokens_used, 0)) DESC";
      break;
    default:
      orderBy = "final_composite DESC";
      break;
  }

  const rows = await env.DB.prepare(
    `SELECT model_name, final_composite, time_elapsed_ms, tokens_used
     FROM bench_runs
     WHERE status = 'scored'
       AND model_name IS NOT NULL
       AND final_composite IS NOT NULL
     ORDER BY ${orderBy}
     LIMIT ?`,
  )
    .bind(limit)
    .all<LeaderboardRow>();

  // Get total count
  const countResult = await env.DB.prepare(
    "SELECT COUNT(*) as total FROM bench_runs WHERE status = 'scored' AND model_name IS NOT NULL AND final_composite IS NOT NULL",
  ).first<{ total: number }>();

  const entries = rows.results.map((row, index) => ({
    model: row.model_name ?? "unknown",
    score: row.final_composite ?? 0,
    rank: index + 1,
    time_ms: row.time_elapsed_ms ?? 0,
    tokens: row.tokens_used ?? 0,
  }));

  return jsonResponse({
    success: true,
    data: {
      entries,
      total: countResult?.total ?? 0,
    },
  });
}
