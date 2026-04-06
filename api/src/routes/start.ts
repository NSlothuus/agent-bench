/**
 * POST /api/bench/start
 * Create a new benchmark run and return a task.
 */

import type { Env, TaskRow, StartRequestBody } from "../types.js";
import { generateId, hashIp, jsonResponse, errorResponse } from "../utils.js";

const VALID_CATEGORIES = ["code", "writing", "reasoning", "design", "multi-step", "safety"];
const MAX_RUNS_PER_HOUR = 100;

export async function handleStart(
  request: Request,
  env: Env,
): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as StartRequestBody;

  // Validate category if provided
  if (body.category !== undefined && !VALID_CATEGORIES.includes(body.category)) {
    return errorResponse(
      `Invalid category: ${body.category}. Valid: ${VALID_CATEGORIES.join(", ")}`,
    );
  }

  // Rate limit check
  const clientIp = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const ipHash = await hashIp(clientIp);
  const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;

  const rateLimitResult = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM bench_runs WHERE ip_hash = ? AND started_at > ?",
  )
    .bind(ipHash, oneHourAgo)
    .first<{ count: number }>();

  if (rateLimitResult !== null && rateLimitResult.count >= MAX_RUNS_PER_HOUR) {
    return errorResponse("Rate limit exceeded. Max 10 runs per hour.", 429);
  }

  // Pick a random active task
  let taskQuery: string;
  let taskBindings: string[];

  if (body.category !== undefined) {
    taskQuery =
      "SELECT * FROM bench_tasks WHERE active = 1 AND category = ? ORDER BY RANDOM() LIMIT 1";
    taskBindings = [body.category];
  } else {
    taskQuery = "SELECT * FROM bench_tasks WHERE active = 1 ORDER BY RANDOM() LIMIT 1";
    taskBindings = [];
  }

  const stmt = env.DB.prepare(taskQuery);
  const task =
    taskBindings.length > 0
      ? await stmt.bind(...taskBindings).first<TaskRow>()
      : await stmt.first<TaskRow>();

  if (task === null) {
    return errorResponse("No tasks available for the requested category.", 404);
  }

  // Create the run
  const runId = generateId();
  const startedAt = Math.floor(Date.now() / 1000);

  // Detect framework from User-Agent
  const userAgent = request.headers.get("User-Agent") ?? "";
  let framework: string | null = null;
  if (userAgent.includes("claude-code")) framework = "claude-code";
  else if (userAgent.includes("openclaw") || userAgent.includes("model-bench-mcp"))
    framework = "openclaw";
  else if (userAgent.includes("codex")) framework = "codex";

  await env.DB.prepare(
    `INSERT INTO bench_runs (id, task_id, category, framework, started_at, ip_hash, status)
     VALUES (?, ?, ?, ?, ?, ?, 'started')`,
  )
    .bind(runId, task.id, task.category, framework, startedAt, ipHash)
    .run();

  return jsonResponse({
    success: true,
    data: {
      run_id: runId,
      task_id: task.id,
      task_prompt: task.prompt,
      category: task.category,
      started_at: new Date(startedAt * 1000).toISOString(),
    },
  });
}
