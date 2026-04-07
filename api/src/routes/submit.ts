/**
 * POST /api/bench/submit
 * Accept a response, run binary checks, return preliminary score.
 */

import type { Env, RunRow, TaskRow, AgentSubmitRequestBody } from "../types.js";
import { runBinaryCheck } from "../binary-checks.js";
import { generateId, jsonResponse, errorResponse } from "../utils.js";

const MAX_RUN_AGE_SECONDS = 30 * 60; // 30 minutes
const MIN_RESPONSE_LENGTH = 50;

export async function handleSubmit(
  request: Request,
  env: Env,
): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as AgentSubmitRequestBody;

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

  // Process telemetry fields
  const modelName = body.model_name ?? run.model_name ?? null;
  const framework = body.framework ?? run.framework ?? null;
  const totalCostUsd = body.total_cost_usd ?? null;
  const modelsUsed = body.models_used !== undefined ? JSON.stringify(body.models_used) : null;
  const tokensUsed = body.total_tokens ?? run.tokens_used ?? null;

  // Calculate efficiency score: estimated_final / max(total_cost_usd, 0.001)
  let efficiencyScore: number | null = null;
  if (estimatedFinal !== null && totalCostUsd !== null) {
    efficiencyScore = estimatedFinal / Math.max(totalCostUsd, 0.001);
  }

  // Agent bench fields
  const configHash = body.config_hash ?? null;
  const workspaceSnapshot = body.workspace_snapshot ?? null;
  const executionTrace = body.execution_trace ?? null;
  const specialistMode = body.specialist_mode ?? "specialist";

  // Update the run
  await env.DB.prepare(
    `UPDATE bench_runs
     SET response = ?,
         submitted_at = ?,
         binary_scores = ?,
         time_elapsed_ms = ?,
         model_name = ?,
         framework = ?,
         tokens_used = ?,
         total_cost_usd = ?,
         models_used = ?,
         efficiency_score = ?,
         status = 'scored',
         final_composite = ?,
         config_hash = ?,
         workspace_snapshot = ?,
         execution_trace = ?,
         specialist_mode = ?
     WHERE id = ?`,
  )
    .bind(
      body.response,
      now,
      binaryScoresJson,
      timeElapsedMs,
      modelName,
      framework,
      tokensUsed,
      totalCostUsd,
      modelsUsed,
      efficiencyScore,
      estimatedFinal ?? null,
      configHash,
      workspaceSnapshot,
      executionTrace,
      specialistMode,
      run.id,
    )
    .run();

  // Upsert bench_setups if config_hash is provided (agent bench)
  if (configHash !== null) {
    const existingSetup = await env.DB.prepare(
      "SELECT id, total_runs, avg_score FROM bench_setups WHERE config_hash = ?",
    )
      .bind(configHash)
      .first<{ id: string; total_runs: number; avg_score: number | null }>();

    if (existingSetup !== null) {
      // Update existing setup
      const newTotalRuns = existingSetup.total_runs + 1;
      const oldAvg = existingSetup.avg_score ?? 0;
      const newAvg =
        estimatedFinal !== null
          ? (oldAvg * existingSetup.total_runs + estimatedFinal) / newTotalRuns
          : oldAvg;

      await env.DB.prepare(
        "UPDATE bench_setups SET total_runs = ?, avg_score = ? WHERE id = ?",
      )
        .bind(newTotalRuns, newAvg, existingSetup.id)
        .run();
    } else {
      // Insert new setup
      const setupId = generateId();
      await env.DB.prepare(
        `INSERT INTO bench_setups (id, config_hash, framework, model_name, description, total_runs, avg_score)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
      )
        .bind(
          setupId,
          configHash,
          framework ?? "unknown",
          modelName,
          null,
          estimatedFinal,
        )
        .run();
    }
  }

  return jsonResponse({
    success: true,
    data: {
      run_id: run.id,
      status: binaryResult !== null ? "scored" : ("queued" as const),
      binary_score: binaryResult,
      estimated_final: estimatedFinal,
      efficiency_score: efficiencyScore,
      leaderboard_url: env.LEADERBOARD_URL,
    },
  });
}
