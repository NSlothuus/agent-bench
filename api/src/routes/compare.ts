/**
 * GET /api/bench/compare/:run_a/:run_b
 * Compare two benchmark runs side-by-side.
 */

import type { Env, RunRow } from "../types.js";
import { jsonResponse, errorResponse } from "../utils.js";

interface CompareRunData {
  run_id: string;
  model_name: string | null;
  framework: string | null;
  category: string;
  status: string;
  final_composite: number | null;
  time_elapsed_ms: number | null;
  tokens_used: number | null;
  total_cost_usd: number | null;
  efficiency_score: number | null;
}

function toCompareData(run: RunRow): CompareRunData {
  return {
    run_id: run.id,
    model_name: run.model_name,
    framework: run.framework,
    category: run.category,
    status: run.status,
    final_composite: run.final_composite,
    time_elapsed_ms: run.time_elapsed_ms,
    tokens_used: run.tokens_used,
    total_cost_usd: run.total_cost_usd,
    efficiency_score: run.efficiency_score,
  };
}

export async function handleCompare(
  runIdA: string,
  runIdB: string,
  env: Env,
): Promise<Response> {
  // Fetch both runs
  const runA = await env.DB.prepare("SELECT * FROM bench_runs WHERE id = ?")
    .bind(runIdA)
    .first<RunRow>();

  if (runA === null) {
    return errorResponse(`Run A not found: ${runIdA}`, 404);
  }

  const runB = await env.DB.prepare("SELECT * FROM bench_runs WHERE id = ?")
    .bind(runIdB)
    .first<RunRow>();

  if (runB === null) {
    return errorResponse(`Run B not found: ${runIdB}`, 404);
  }

  const scoreA = runA.final_composite ?? 0;
  const scoreB = runB.final_composite ?? 0;
  const timeA = runA.time_elapsed_ms ?? 0;
  const timeB = runB.time_elapsed_ms ?? 0;
  const effA = runA.efficiency_score ?? 0;
  const effB = runB.efficiency_score ?? 0;

  return jsonResponse({
    success: true,
    data: {
      run_a: toCompareData(runA),
      run_b: toCompareData(runB),
      comparison: {
        score_diff: scoreA - scoreB,
        time_diff_ms: timeA - timeB,
        efficiency_diff: effA - effB,
      },
    },
  });
}
