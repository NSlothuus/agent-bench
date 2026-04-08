/**
 * GET /api/bench/leaderboard
 * Return ranked leaderboard entries filtered by bench_type.
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
  judge_scores: string | null;
}

interface SetupLeaderboardRow {
  config_hash: string;
  framework: string | null;
  avg_score: number;
  run_count: number;
  model_name: string | null;
  description: string | null;
}

const VALID_SORT_BY = ["quality", "speed", "efficiency", "cost", "setup"] as const;

export async function handleLeaderboard(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const sortByParam = url.searchParams.get("sort_by") ?? url.searchParams.get("sort") ?? "quality";
  const limitParam = url.searchParams.get("limit") ?? "10";
  const frameworkFilter = url.searchParams.get("framework");
  const modelFilter = url.searchParams.get("model");
  const specialistModeFilter = url.searchParams.get("specialist_mode");
  const benchType = url.searchParams.get("bench_type") ?? "model";

  const sortBy = VALID_SORT_BY.includes(sortByParam as (typeof VALID_SORT_BY)[number])
    ? sortByParam
    : "quality";

  const limit = Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 50);
  const groupBy = url.searchParams.get("group") ?? (benchType === "model" ? "model" : "run");

  // Model aggregation mode: one row per model with task breakdown
  if (groupBy === "model" && benchType === "model") {
    return handleModelLeaderboard(env, sortBy, limit, frameworkFilter, modelFilter, specialistModeFilter);
  }

  // Setup leaderboard mode: group by config_hash for agent bench
  if (sortBy === "setup" && benchType === "agent") {
    return handleSetupLeaderboard(env, limit, frameworkFilter);
  }

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
    "bench_type = ?",
  ];
  const bindings: (string | number)[] = [benchType];

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
    `SELECT model_name, framework, final_composite, time_elapsed_ms, tokens_used, efficiency_score, total_cost_usd, judge_scores
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
  const countResult = await countStmt.bind(...countBindings).first<{ total: number }>();

  const entries = rows.results.map((row, index) => {
    let judgeBreakdown = undefined;
    if (row.judge_scores) {
      try {
        judgeBreakdown = JSON.parse(row.judge_scores);
      } catch {
        // ignore parse errors
      }
    }
    return {
      model: row.model_name ?? "unknown",
      score: row.final_composite ?? 0,
      rank: index + 1,
      time_ms: row.time_elapsed_ms ?? 0,
      tokens: row.tokens_used ?? 0,
      framework: row.framework ?? undefined,
      efficiency_score: row.efficiency_score ?? undefined,
      cost_usd: row.total_cost_usd ?? undefined,
      judge_breakdown: judgeBreakdown,
    };
  });

  return jsonResponse({
    success: true,
    data: {
      bench_type: benchType,
      entries,
      total: countResult?.total ?? 0,
    },
  });
}

async function handleModelLeaderboard(
  env: Env,
  sortBy: string,
  limit: number,
  frameworkFilter: string | null,
  modelFilter: string | null,
  specialistModeFilter: string | null,
): Promise<Response> {
  const JUDGE_KEYS = ["judge1", "judge2", "judge3"];
  const STANDARD_CATS = new Set(["code", "writing", "reasoning", "design", "safety"]);

  // Build WHERE clause
  const whereClauses: string[] = [
    "bench_type = 'model'",
    "model_name IS NOT NULL",
    "final_composite IS NOT NULL",
  ];
  const bindings: (string | number)[] = [];
  if (frameworkFilter !== null) {
    whereClauses.push("framework = ?"); bindings.push(frameworkFilter);
  }
  if (modelFilter !== null) {
    whereClauses.push("model_name LIKE ?"); bindings.push(`%${modelFilter}%`);
  }
  if (specialistModeFilter !== null) {
    whereClauses.push("specialist_mode = ?"); bindings.push(specialistModeFilter);
  }
  const whereStr = whereClauses.join(" AND ");

  // Fetch all qualifying rows
  const allRows = await env.DB.prepare(
    `SELECT model_name, framework, category, task_id, final_composite as score,
            time_elapsed_ms, COALESCE(tokens_used,0) as tokens,
            total_cost_usd, judge_scores, created_at, specialist_mode
     FROM bench_runs WHERE ${whereStr}`,
  )
    .bind(...bindings)
    .all<any>();

  // Strip specialist suffix e.g. "sonnet (+Copywriter)" → "sonnet"
  function baseModel(name: string): string {
    return name.replace(/ \(\+[^)]+\)$/, '').trim();
  }

  // Group into runs by (base_model_name, specialist_mode, 60-min bucket)
  type RunGroup = {
    model: string; framework: string | null;
    bucket: number; started_at: number; finished_at: number;
    specialist_mode: string;
    tasks: any[];
  };
  const runMap = new Map<string, RunGroup>();
  for (const r of allRows.results) {
    const base = baseModel(r.model_name);
    const sm = r.specialist_mode ?? "specialist";
    const bucket = Math.floor(r.created_at / 3600); // 60-min windows
    const key = base + "::" + sm + "::" + bucket;
    if (!runMap.has(key)) {
      runMap.set(key, {
        model: base, framework: r.framework ?? null,
        bucket, started_at: r.created_at, finished_at: r.created_at,
        specialist_mode: sm, tasks: [],
      });
    }
    const g = runMap.get(key)!;
    g.started_at = Math.min(g.started_at, r.created_at);
    g.finished_at = Math.max(g.finished_at, r.created_at);
    g.tasks.push(r);
  }

  // Filter: only runs where ALL 5 standard cats present AND all 3 judges on every task
  const completeRuns: RunGroup[] = [];
  for (const [, g] of runMap) {
    const cats = new Set(g.tasks.map((t: any) => t.category));
    const hasAllCats = STANDARD_CATS.size === g.tasks.length &&
      [...STANDARD_CATS].every((c: string) => cats.has(c));
    if (!hasAllCats) continue;
    // Accept runs with at least 1 judge score (was ≥2 — too strict, excluded most runs)
    const hasJudgedScores = g.tasks.every((t: any) => {
      if (!t.judge_scores) return false;
      try {
        const j = JSON.parse(t.judge_scores);
        const judgedCount = JUDGE_KEYS.filter((jk) => j[jk] && j[jk].composite != null).length;
        return judgedCount >= 1;
      } catch { return false; }
    });
    if (!hasJudgedScores) continue;
    completeRuns.push(g);
  }

  // Sort
  completeRuns.sort((a, b) => {
    switch (sortBy) {
      case "speed": {
        const aTime = a.tasks.reduce((s: number, t: any) => s + (t.time_elapsed_ms || 0), 0);
        const bTime = b.tasks.reduce((s: number, t: any) => s + (t.time_elapsed_ms || 0), 0);
        return aTime - bTime;
      }
      case "cost": {
        const aCost = a.tasks.reduce((s: number, t: any) => s + (t.total_cost_usd || 0), 0);
        const bCost = b.tasks.reduce((s: number, t: any) => s + (t.total_cost_usd || 0), 0);
        return aCost - bCost;
      }
      default: return b.finished_at - a.finished_at;
    }
  });

  const limited = completeRuns.slice(0, limit);

  const entries = limited.map((g) => {
    const avgScore = g.tasks.reduce((s: number, t: any) => s + (t.score || 0), 0) / g.tasks.length;
    const totalTime = g.tasks.reduce((s: number, t: any) => s + (t.time_elapsed_ms || 0), 0);
    const totalTokens = g.tasks.reduce((s: number, t: any) => s + (t.tokens || 0), 0);
    const totalCost = g.tasks.reduce((s: number, t: any) => s + (t.total_cost_usd || 0), 0);
    return {
      model: g.model,
      framework: g.framework ?? undefined,
      specialist_mode: g.specialist_mode,
      best_score: Math.round(Math.max(...g.tasks.map((t: any) => t.score || 0)) * 10) / 10,
      avg_score: Math.round(avgScore * 10) / 10,
      score: Math.round(avgScore * 10) / 10,
      time_ms: totalTime,
      tokens: totalTokens,
      cost_usd: Math.round(totalCost * 10000) / 10000 || null,
      started_at: new Date(g.started_at * 1000).toISOString(),
      finished_at: new Date(g.finished_at * 1000).toISOString(),
      tasks: g.tasks.map((t: any) => {
        let jb: Record<string, any> | undefined;
        if (t.judge_scores) { try { jb = JSON.parse(t.judge_scores); } catch { /* noop */ } }
        return {
          category: t.category, task_id: t.task_id,
          score: t.score ?? 0, time_ms: t.time_elapsed_ms ?? 0,
          tokens: t.tokens ?? 0, cost_usd: t.total_cost_usd ?? null,
          judge_breakdown: jb,
        };
      }),
    };
  });

  return jsonResponse({
    success: true,
    data: { bench_type: "model", mode: "per_run", entries, total: entries.length },
  });
}


async function handleSetupLeaderboard(
  env: Env,
  limit: number,
  frameworkFilter: string | null,
): Promise<Response> {
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
    .all<SetupLeaderboardRow>();

  const entries = rows.results.map((row, index) => ({
    rank: index + 1,
    config_hash: row.config_hash,
    framework: row.framework ?? undefined,
    avg_score: row.avg_score ?? 0,
    run_count: row.run_count ?? 0,
    model_name: row.model_name ?? undefined,
    description: row.description ?? undefined,
  }));

  return jsonResponse({
    success: true,
    data: {
      bench_type: "agent",
      mode: "setup",
      entries,
      total: rows.results.length,
    },
  });
}
