/**
 * GET /api/bench/setups
 * Returns ranked agent setups with aggregated scores.
 */

import type { Env } from "../types.js";
import { jsonResponse } from "../utils.js";

interface SetupAggregateRow {
  config_hash: string;
  framework: string | null;
  avg_score: number;
  run_count: number;
  model_name: string | null;
  description: string | null;
}

export async function handleSetups(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit") ?? "20";
  const frameworkFilter = url.searchParams.get("framework");

  const limit = Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 100);

  const whereClauses: string[] = [
    "r.bench_type = 'agent'",
    "r.status = 'scored'",
    "r.config_hash IS NOT NULL",
    "r.final_composite IS NOT NULL",
  ];
  const bindings: (string | number)[] = [];

  if (frameworkFilter !== null) {
    whereClauses.push("r.framework = ?");
    bindings.push(frameworkFilter);
  }

  bindings.push(limit);

  const whereStr = whereClauses.join(" AND ");

  const rows = await env.DB.prepare(
    `SELECT
       r.config_hash,
       r.framework,
       AVG(r.final_composite) as avg_score,
       COUNT(*) as run_count,
       s.model_name,
       s.description
     FROM bench_runs r
     LEFT JOIN bench_setups s ON r.config_hash = s.config_hash
     WHERE ${whereStr}
     GROUP BY r.config_hash
     ORDER BY avg_score DESC
     LIMIT ?`,
  )
    .bind(...bindings)
    .all<SetupAggregateRow>();

  const entries = rows.results.map((row, index) => ({
    rank: index + 1,
    config_hash: row.config_hash,
    framework: row.framework ?? "unknown",
    avg_score: row.avg_score ?? 0,
    run_count: row.run_count ?? 0,
    model_name: row.model_name ?? undefined,
    description: row.description ?? undefined,
  }));

  return jsonResponse({
    success: true,
    data: {
      entries,
      total: rows.results.length,
    },
  });
}
