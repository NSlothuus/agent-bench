/**
 * GET /api/bench/results/:run_id
 * Check scoring status for a run.
 */

import type { Env, RunRow } from "../types.js";
import { jsonResponse, errorResponse } from "../utils.js";

export async function handleResults(
  runId: string,
  env: Env,
): Promise<Response> {
  if (!runId || runId === "latest") {
    // Get the most recent submitted run
    const run = await env.DB.prepare(
      "SELECT * FROM bench_runs WHERE status IN ('submitted', 'scored') ORDER BY submitted_at DESC LIMIT 1",
    ).first<RunRow>();

    if (run === null) {
      return errorResponse("No recent runs found.", 404);
    }

    return buildResultsResponse(run);
  }

  const run = await env.DB.prepare("SELECT * FROM bench_runs WHERE id = ?")
    .bind(runId)
    .first<RunRow>();

  if (run === null) {
    return errorResponse("Run not found.", 404);
  }

  return buildResultsResponse(run);
}

function buildResultsResponse(run: RunRow): Response {
  const status = run.status === "scored" ? "scored" : "pending";

  let scores: { quality: number; judgment: number; completeness: number; composite: number } | undefined;
  let rank: number | undefined;

  if (run.judge_scores !== null) {
    try {
      const judgeData = JSON.parse(run.judge_scores) as {
        quality?: number;
        judgment?: number;
        completeness?: number;
        correctness?: number;
      };
      const quality = judgeData.quality ?? 0;
      const judgment = judgeData.judgment ?? 0;
      const completeness = judgeData.completeness ?? 0;
      const correctness = judgeData.correctness ?? 0;
      const composite = (quality + judgment + completeness + correctness) / 4;

      scores = { quality, judgment, completeness, composite };
    } catch {
      // Invalid JSON — treat as pending
    }
  }

  // If we have binary scores but no judge scores, build preliminary scores
  if (scores === undefined && run.binary_scores !== null) {
    try {
      const binary = JSON.parse(run.binary_scores) as {
        adjustments?: Record<string, number>;
      };
      const adj = binary.adjustments ?? {};

      // Build preliminary estimate from binary checks
      const floor = adj["correctness_floor"] ?? 5;
      const ceiling = adj["correctness_ceiling"] ?? 10;
      const estimated = Math.min(floor, ceiling);

      scores = {
        quality: estimated,
        judgment: estimated,
        completeness: estimated,
        composite: estimated,
      };
    } catch {
      // Invalid JSON
    }
  }

  return jsonResponse({
    success: true,
    data: {
      run_id: run.id,
      status,
      scores,
      rank,
    },
  });
}
