/**
 * POST /api/bench/checkpoint
 * Record a progress checkpoint during a benchmark run.
 */

import type { Env, RunRow, CheckpointRequestBody } from "../types.js";
import { jsonResponse, errorResponse } from "../utils.js";

export async function handleCheckpoint(
  request: Request,
  env: Env,
): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as CheckpointRequestBody;

  if (!body.run_id || typeof body.run_id !== "string") {
    return errorResponse("Missing or invalid run_id");
  }
  if (!body.step_name || typeof body.step_name !== "string") {
    return errorResponse("Missing or invalid step_name");
  }
  if (typeof body.tokens_in !== "number" || typeof body.tokens_out !== "number") {
    return errorResponse("Missing or invalid tokens_in/tokens_out");
  }
  if (typeof body.cost_usd !== "number") {
    return errorResponse("Missing or invalid cost_usd");
  }
  if (typeof body.duration_ms !== "number") {
    return errorResponse("Missing or invalid duration_ms");
  }

  // Verify the run exists and is active
  const run = await env.DB.prepare("SELECT * FROM bench_runs WHERE id = ?")
    .bind(body.run_id)
    .first<RunRow>();

  if (run === null) {
    return errorResponse("Run not found.", 404);
  }

  if (run.status !== "started") {
    return errorResponse(`Run is ${run.status}. Checkpoints can only be added to active runs.`);
  }

  // Insert the checkpoint
  await env.DB.prepare(
    `INSERT INTO bench_checkpoints (run_id, step_name, model_used, tokens_in, tokens_out, cost_usd, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      body.run_id,
      body.step_name,
      body.model_used ?? null,
      body.tokens_in,
      body.tokens_out,
      body.cost_usd,
      body.duration_ms,
    )
    .run();

  // Count total checkpoints for this run
  const countResult = await env.DB.prepare(
    "SELECT COUNT(*) as total FROM bench_checkpoints WHERE run_id = ?",
  )
    .bind(body.run_id)
    .first<{ total: number }>();

  return jsonResponse({
    success: true,
    data: {
      acknowledged: true,
      checkpoints_so_far: countResult?.total ?? 1,
    },
  });
}
