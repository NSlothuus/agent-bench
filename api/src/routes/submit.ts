/**
 * POST /api/bench/submit
 * Accept a response, run binary checks, return preliminary score.
 */

import type { Env, RunRow, TaskRow, SubmitRequestBody } from "../types.js";
import { runBinaryCheck } from "../binary-checks.js";
import { jsonResponse, errorResponse } from "../utils.js";

const MAX_RUN_AGE_SECONDS = 30 * 60; // 30 minutes
const MIN_RESPONSE_LENGTH = 50;

export async function handleSubmit(
  request: Request,
  env: Env,
): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as SubmitRequestBody;

  if (!body.run_id || typeof body.run_id !== "string") {
    return errorResponse("Missing or invalid run_id");
  }
  if (!body.response || typeof body.response !== "string") {
    return errorResponse("Missing or invalid response");
  }
  if (body.response.length < MIN_RESPONSE_LENGTH) {
    return errorResponse(
      `Response too short (${body.response.length} chars). Minimum: ${MIN_RESPONSE_LENGTH}.`,
    );
  }

  // Fetch the run
  const run = await env.DB.prepare("SELECT * FROM bench_runs WHERE id = ?")
    .bind(body.run_id)
    .first<RunRow>();

  if (run === null) {
    return errorResponse("Run not found.", 404);
  }

  if (run.status !== "started") {
    return errorResponse(`Run already ${run.status}. Cannot submit again.`);
  }

  // Check time elapsed
  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - run.started_at;
  if (elapsed > MAX_RUN_AGE_SECONDS) {
    // Mark as expired
    await env.DB.prepare("UPDATE bench_runs SET status = 'expired' WHERE id = ?")
      .bind(run.id)
      .run();
    return errorResponse("Run expired. Submissions must be within 30 minutes of start.");
  }

  // Fetch the task to get binary_check_fn
  const task = await env.DB.prepare("SELECT * FROM bench_tasks WHERE id = ?")
    .bind(run.task_id)
    .first<TaskRow>();

  if (task === null) {
    return errorResponse("Task not found.", 500);
  }

  // Run binary checks
  const binaryResult = runBinaryCheck(task.binary_check_fn, body.response);
  const binaryScoresJson = binaryResult !== null ? JSON.stringify(binaryResult) : null;

  // Calculate estimated score from binary checks
  let estimatedFinal: number | null = null;
  if (binaryResult !== null) {
    // Simple heuristic: floor/ceiling from adjustments
    const adj = binaryResult.adjustments;
    if (adj["correctness_floor"] !== undefined) {
      estimatedFinal = Math.max(adj["correctness_floor"], 7);
    } else if (adj["correctness_ceiling"] !== undefined) {
      estimatedFinal = Math.min(adj["correctness_ceiling"], 5);
    } else if (adj["judgment_override"] !== undefined) {
      estimatedFinal = adj["judgment_override"];
    }
  }

  const timeElapsedMs = elapsed * 1000;

  // Update the run
  await env.DB.prepare(
    `UPDATE bench_runs
     SET response = ?,
         submitted_at = ?,
         binary_scores = ?,
         time_elapsed_ms = ?,
         status = 'submitted'
     WHERE id = ?`,
  )
    .bind(body.response, now, binaryScoresJson, timeElapsedMs, run.id)
    .run();

  return jsonResponse({
    success: true,
    data: {
      run_id: run.id,
      status: binaryResult !== null ? "scored" : ("queued" as const),
      binary_score: binaryResult,
      estimated_final: estimatedFinal,
      leaderboard_url: env.LEADERBOARD_URL,
    },
  });
}
