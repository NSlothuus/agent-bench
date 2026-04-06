/**
 * Remote MCP server for Agent Bench.
 *
 * Creates a new McpServer instance per request (required by MCP SDK 1.26.0+
 * to prevent cross-client response leakage). The `env` binding is captured
 * via closure so tools can access D1 directly without HTTP round-trips.
 */

import { createMcpHandler } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { Env, TaskRow, RunRow } from "./types.js";
import { generateId, hashIp } from "./utils.js";
import { runBinaryCheck } from "./binary-checks.js";

// ---------------------------------------------------------------------------
// Constants (mirrors REST API constants)
// ---------------------------------------------------------------------------
const VALID_CATEGORIES = ["code", "writing", "reasoning", "design", "multi-step", "safety"] as const;
const MAX_RUNS_PER_HOUR = 100;
const MAX_RUN_AGE_SECONDS = 30 * 60; // 30 minutes
const MIN_RESPONSE_LENGTH = 50;

// ---------------------------------------------------------------------------
// Server factory — creates a fresh McpServer per request
// ---------------------------------------------------------------------------

/** Build a fully-configured McpServer with env captured in closures. */
function createServer(env: Env, clientIp: string): McpServer {
  const server = new McpServer({
    name: "agent-bench",
    version: "0.1.0",
  });

  // ---- bench_start --------------------------------------------------------
  server.tool(
    "bench_start",
    "STEP 1: Get a benchmark task to solve. Read the task carefully. Then call bench_submit with your solution. Categories: code, writing, reasoning, design, multi-step, safety.",
    {
      category: z
        .enum(VALID_CATEGORIES)
        .optional()
        .describe("Task category. Omit for random."),
    },
    async ({ category }) => {
      try {
        const ipHash = await hashIp(clientIp);
        const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;

        // Rate limit check
        const rateLimitResult = await env.DB.prepare(
          "SELECT COUNT(*) as count FROM bench_runs WHERE ip_hash = ? AND started_at > ?",
        )
          .bind(ipHash, oneHourAgo)
          .first<{ count: number }>();

        if (rateLimitResult !== null && rateLimitResult.count >= MAX_RUNS_PER_HOUR) {
          return {
            content: [{ type: "text" as const, text: "Error: Rate limit exceeded. Max 10 runs per hour." }],
            isError: true,
          };
        }

        // Pick a random active task
        let task: TaskRow | null;
        if (category !== undefined) {
          task = await env.DB.prepare(
            "SELECT * FROM bench_tasks WHERE active = 1 AND category = ? ORDER BY RANDOM() LIMIT 1",
          )
            .bind(category)
            .first<TaskRow>();
        } else {
          task = await env.DB.prepare(
            "SELECT * FROM bench_tasks WHERE active = 1 ORDER BY RANDOM() LIMIT 1",
          ).first<TaskRow>();
        }

        if (task === null) {
          return {
            content: [{ type: "text" as const, text: "Error: No tasks available for the requested category." }],
            isError: true,
          };
        }

        // Create the run
        const runId = generateId();
        const startedAt = Math.floor(Date.now() / 1000);

        await env.DB.prepare(
          `INSERT INTO bench_runs (id, task_id, category, framework, started_at, ip_hash, status)
           VALUES (?, ?, ?, ?, ?, ?, 'started')`,
        )
          .bind(runId, task.id, task.category, "mcp-remote", startedAt, ipHash)
          .run();

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `**Benchmark Task Started**`,
                ``,
                `Run ID: ${runId}`,
                `Category: ${task.category}`,
                `Started: ${new Date(startedAt * 1000).toISOString()}`,
                ``,
                `---`,
                ``,
                task.prompt,
                ``,
                `---`,
                ``,
                `---`,
                ``,
                `⚠️ IMPORTANT: When you have completed this task, you MUST call the bench_submit tool with:`,
                `- run_id: "${runId}"`,
                `- response: (your complete response to the task above)`,
                ``,
                `Do NOT just write your answer in chat. You MUST use the bench_submit tool to submit it for scoring.`,
              ].join("\n"),
            },
          ],
        };
      } catch (err: unknown) {
        return {
          content: [{ type: "text" as const, text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    },
  );

  // ---- bench_submit -------------------------------------------------------
  server.tool(
    "bench_submit",
    "STEP 2: Submit your answer after receiving a task from bench_start. Put the run_id from bench_start and your complete solution in the response field. You will be scored immediately.",
    {
      run_id: z.string().describe("The run_id from bench_start"),
      response: z.string().describe("Your complete response to the benchmark task"),
      model_name: z.string().optional().describe("Model used (e.g. claude-sonnet-4-6)"),
      framework: z.string().optional().describe("Framework used (e.g. openclaw, claude-code, codex)"),
      total_tokens: z.number().optional().describe("Total tokens used across the run"),
      total_cost_usd: z.number().optional().describe("Total cost in USD"),
      models_used: z.array(z.string()).optional().describe("List of all models used during the run"),
    },
    async ({ run_id, response, model_name, framework, total_tokens, total_cost_usd, models_used }) => {
      try {
        if (response.length < MIN_RESPONSE_LENGTH) {
          return {
            content: [{ type: "text" as const, text: `Error: Response too short (${response.length} chars). Minimum: ${MIN_RESPONSE_LENGTH}.` }],
            isError: true,
          };
        }

        // Fetch the run
        const run = await env.DB.prepare("SELECT * FROM bench_runs WHERE id = ?")
          .bind(run_id)
          .first<RunRow>();

        if (run === null) {
          return {
            content: [{ type: "text" as const, text: "Error: Run not found." }],
            isError: true,
          };
        }

        if (run.status !== "started") {
          return {
            content: [{ type: "text" as const, text: `Error: Run already ${run.status}. Cannot submit again.` }],
            isError: true,
          };
        }

        // Check time elapsed
        const now = Math.floor(Date.now() / 1000);
        const elapsed = now - run.started_at;
        if (elapsed > MAX_RUN_AGE_SECONDS) {
          await env.DB.prepare("UPDATE bench_runs SET status = 'expired' WHERE id = ?")
            .bind(run.id)
            .run();
          return {
            content: [{ type: "text" as const, text: "Error: Run expired. Submissions must be within 30 minutes of start." }],
            isError: true,
          };
        }

        // Fetch the task for binary check function
        const task = await env.DB.prepare("SELECT * FROM bench_tasks WHERE id = ?")
          .bind(run.task_id)
          .first<TaskRow>();

        if (task === null) {
          return {
            content: [{ type: "text" as const, text: "Error: Task not found." }],
            isError: true,
          };
        }

        // Run binary checks
        const binaryResult = runBinaryCheck(task.binary_check_fn, response);
        const binaryScoresJson = binaryResult !== null ? JSON.stringify(binaryResult) : null;

        // Estimated final score from binary checks
        let estimatedFinal: number | null = null;
        if (binaryResult !== null) {
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
        const resolvedModelName = model_name ?? run.model_name ?? null;
        const resolvedFramework = framework ?? run.framework ?? "mcp-remote";
        const totalCostUsd = total_cost_usd ?? null;
        const modelsUsedJson = models_used !== undefined ? JSON.stringify(models_used) : null;
        const tokensUsed = total_tokens ?? run.tokens_used ?? null;

        let efficiencyScore: number | null = null;
        if (estimatedFinal !== null && totalCostUsd !== null) {
          efficiencyScore = estimatedFinal / Math.max(totalCostUsd, 0.001);
        }

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
               final_composite = ?
           WHERE id = ?`,
        )
          .bind(
            response,
            now,
            binaryScoresJson,
            timeElapsedMs,
            resolvedModelName,
            resolvedFramework,
            tokensUsed,
            totalCostUsd,
            modelsUsedJson,
            efficiencyScore,
            estimatedFinal ?? null,
            run.id,
          )
          .run();

        const lines = [
          `**Submission Received**`,
          ``,
          `Run ID: ${run.id}`,
          `Status: ${binaryResult !== null ? "scored" : "queued"}`,
        ];

        if (binaryResult !== null) {
          lines.push(
            ``,
            `**Binary Check Results:**`,
            `Check: ${binaryResult.check_name}`,
            `Details: ${JSON.stringify(binaryResult.details, null, 2)}`,
          );
        }

        if (estimatedFinal !== undefined && estimatedFinal !== null) {
          lines.push(``, `Estimated Score: ${estimatedFinal}/10`);
        }

        if (efficiencyScore !== null) {
          lines.push(``, `Efficiency Score: ${efficiencyScore.toFixed(2)}`);
        }

        lines.push(``, `Leaderboard: ${env.LEADERBOARD_URL}`);

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
        };
      } catch (err: unknown) {
        return {
          content: [{ type: "text" as const, text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    },
  );

  // ---- bench_results ------------------------------------------------------
  server.tool(
    "bench_results",
    "Check the scoring status and results for a benchmark run. Omit run_id for your latest run.",
    {
      run_id: z.string().optional().describe("Run ID to check. Omit for latest."),
    },
    async ({ run_id }) => {
      try {
        let run: RunRow | null;

        if (run_id === undefined || run_id === "latest") {
          run = await env.DB.prepare(
            "SELECT * FROM bench_runs WHERE status IN ('submitted', 'scored') ORDER BY submitted_at DESC LIMIT 1",
          ).first<RunRow>();
        } else {
          run = await env.DB.prepare("SELECT * FROM bench_runs WHERE id = ?")
            .bind(run_id)
            .first<RunRow>();
        }

        if (run === null) {
          return {
            content: [{ type: "text" as const, text: "Error: Run not found." }],
            isError: true,
          };
        }

        const status = run.status === "scored" ? "scored" : "pending";

        type Scores = { quality: number; judgment: number; completeness: number; composite: number };
        let scores: Scores | undefined;

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
            scores = { quality, judgment, completeness, composite: (quality + judgment + completeness + correctness) / 4 };
          } catch {
            // Invalid JSON — treat as pending
          }
        }

        if (scores === undefined && run.binary_scores !== null) {
          try {
            const binary = JSON.parse(run.binary_scores) as { adjustments?: Record<string, number> };
            const adj = binary.adjustments ?? {};
            const floor = adj["correctness_floor"] ?? 5;
            const ceiling = adj["correctness_ceiling"] ?? 10;
            const estimated = Math.min(floor, ceiling);
            scores = { quality: estimated, judgment: estimated, completeness: estimated, composite: estimated };
          } catch {
            // Invalid JSON
          }
        }

        const lines = [
          `**Benchmark Results**`,
          ``,
          `Run ID: ${run.id}`,
          `Status: ${status}`,
        ];

        if (scores !== undefined) {
          lines.push(
            ``,
            `**Scores:**`,
            `  Quality: ${scores.quality}/10`,
            `  Judgment: ${scores.judgment}/10`,
            `  Completeness: ${scores.completeness}/10`,
            `  Composite: ${scores.composite}/10`,
          );
        }

        if (status === "pending") {
          lines.push(``, `_Scoring in progress. Check again in a minute._`);
        }

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
        };
      } catch (err: unknown) {
        return {
          content: [{ type: "text" as const, text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    },
  );

  // ---- bench_leaderboard --------------------------------------------------
  server.tool(
    "bench_leaderboard",
    "View the benchmark leaderboard. Sort by quality (default), speed, efficiency, or cost. Optionally filter by framework or model.",
    {
      sort_by: z
        .enum(["quality", "speed", "efficiency", "cost"])
        .optional()
        .describe("Sort order. Default: quality."),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe("Number of entries to return. Default: 10."),
      framework: z
        .string()
        .optional()
        .describe("Filter by framework (e.g. openclaw, claude-code, codex)"),
      model: z
        .string()
        .optional()
        .describe("Filter by model name (e.g. claude-sonnet-4-6)"),
    },
    async ({ sort_by, limit, framework, model }) => {
      try {
        const sortBy = sort_by ?? "quality";
        const limitN = Math.min(Math.max(limit ?? 10, 1), 50);

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

        const whereClauses: string[] = [
          "status IN ('scored', 'submitted')",
          "model_name IS NOT NULL",
          "final_composite IS NOT NULL",
        ];
        const bindings: (string | number)[] = [];

        if (framework !== undefined) {
          whereClauses.push("framework = ?");
          bindings.push(framework);
        }
        if (model !== undefined) {
          whereClauses.push("model_name LIKE ?");
          bindings.push(`%${model}%`);
        }

        const whereStr = whereClauses.join(" AND ");
        bindings.push(limitN);

        interface LeaderboardRow {
          model_name: string;
          framework: string | null;
          final_composite: number;
          time_elapsed_ms: number;
          tokens_used: number;
          efficiency_score: number | null;
          total_cost_usd: number | null;
        }

        const stmt = env.DB.prepare(
          `SELECT model_name, framework, final_composite, time_elapsed_ms, tokens_used, efficiency_score, total_cost_usd
           FROM bench_runs
           WHERE ${whereStr}
           ORDER BY ${orderBy}
           LIMIT ?`,
        );
        const rows = await stmt.bind(...bindings).all<LeaderboardRow>();

        const countBindings = bindings.slice(0, -1);
        const countStmt = env.DB.prepare(`SELECT COUNT(*) as total FROM bench_runs WHERE ${whereStr}`);
        const countResult =
          countBindings.length > 0
            ? await countStmt.bind(...countBindings).first<{ total: number }>()
            : await countStmt.first<{ total: number }>();

        const lines = [
          `**Agent Bench Leaderboard** (sorted by ${sortBy})`,
          ``,
          `| Rank | Model | Score | Time | Tokens | Efficiency |`,
          `|------|-------|-------|------|--------|------------|`,
        ];

        rows.results.forEach((row, index) => {
          const efficiency =
            row.efficiency_score !== undefined && row.efficiency_score !== null
              ? row.efficiency_score.toFixed(1)
              : "—";
          lines.push(
            `| #${index + 1} | ${row.model_name ?? "unknown"} | ${(row.final_composite ?? 0).toFixed(1)} | ${((row.time_elapsed_ms ?? 0) / 1000).toFixed(1)}s | ${row.tokens_used ?? 0} | ${efficiency} |`,
          );
        });

        lines.push(``, `Total entries: ${countResult?.total ?? 0}`);

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
        };
      } catch (err: unknown) {
        return {
          content: [{ type: "text" as const, text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    },
  );

  // ---- bench_checkpoint ---------------------------------------------------
  server.tool(
    "bench_checkpoint",
    "Report progress during multi-step benchmark work. Tracks model usage, tokens, cost, and timing per step.",
    {
      run_id: z.string().describe("The run_id from bench_start"),
      step_name: z.string().describe("Name of the current step (e.g. 'research', 'code_generation')"),
      model_used: z.string().describe("Model used for this step"),
      tokens_in: z.number().int().describe("Input tokens consumed"),
      tokens_out: z.number().int().describe("Output tokens generated"),
      cost_usd: z.number().describe("Cost in USD for this step"),
      duration_ms: z.number().int().describe("Duration of this step in milliseconds"),
    },
    async ({ run_id, step_name, model_used, tokens_in, tokens_out, cost_usd, duration_ms }) => {
      try {
        const run = await env.DB.prepare("SELECT * FROM bench_runs WHERE id = ?")
          .bind(run_id)
          .first<RunRow>();

        if (run === null) {
          return {
            content: [{ type: "text" as const, text: "Error: Run not found." }],
            isError: true,
          };
        }

        if (run.status !== "started") {
          return {
            content: [{ type: "text" as const, text: `Error: Run is ${run.status}. Checkpoints can only be added to active runs.` }],
            isError: true,
          };
        }

        await env.DB.prepare(
          `INSERT INTO bench_checkpoints (run_id, step_name, model_used, tokens_in, tokens_out, cost_usd, duration_ms)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(run_id, step_name, model_used, tokens_in, tokens_out, cost_usd, duration_ms)
          .run();

        const countResult = await env.DB.prepare(
          "SELECT COUNT(*) as total FROM bench_checkpoints WHERE run_id = ?",
        )
          .bind(run_id)
          .first<{ total: number }>();

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `**Checkpoint Recorded**`,
                ``,
                `Step: ${step_name}`,
                `Model: ${model_used}`,
                `Tokens: ${tokens_in} in / ${tokens_out} out`,
                `Cost: $${cost_usd.toFixed(4)}`,
                `Duration: ${(duration_ms / 1000).toFixed(1)}s`,
                ``,
                `Checkpoints so far: ${countResult?.total ?? 1}`,
              ].join("\n"),
            },
          ],
        };
      } catch (err: unknown) {
        return {
          content: [{ type: "text" as const, text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    },
  );

  // ---- bench_compare ------------------------------------------------------
  server.tool(
    "bench_compare",
    "Compare two benchmark runs side-by-side. See score, time, cost, and efficiency differences.",
    {
      run_id_a: z.string().describe("First run ID to compare"),
      run_id_b: z.string().describe("Second run ID to compare"),
    },
    async ({ run_id_a, run_id_b }) => {
      try {
        const runA = await env.DB.prepare("SELECT * FROM bench_runs WHERE id = ?")
          .bind(run_id_a)
          .first<RunRow>();

        if (runA === null) {
          return {
            content: [{ type: "text" as const, text: `Error: Run A not found: ${run_id_a}` }],
            isError: true,
          };
        }

        const runB = await env.DB.prepare("SELECT * FROM bench_runs WHERE id = ?")
          .bind(run_id_b)
          .first<RunRow>();

        if (runB === null) {
          return {
            content: [{ type: "text" as const, text: `Error: Run B not found: ${run_id_b}` }],
            isError: true,
          };
        }

        const scoreA = runA.final_composite ?? 0;
        const scoreB = runB.final_composite ?? 0;
        const timeA = runA.time_elapsed_ms ?? 0;
        const timeB = runB.time_elapsed_ms ?? 0;
        const effA = runA.efficiency_score ?? 0;
        const effB = runB.efficiency_score ?? 0;

        const lines = [
          `**Run Comparison**`,
          ``,
          `| Metric | Run A | Run B | Diff |`,
          `|--------|-------|-------|------|`,
          `| Run ID | ${runA.id} | ${runB.id} | — |`,
          `| Model | ${runA.model_name ?? "unknown"} | ${runB.model_name ?? "unknown"} | — |`,
          `| Framework | ${runA.framework ?? "unknown"} | ${runB.framework ?? "unknown"} | — |`,
          `| Category | ${runA.category} | ${runB.category} | — |`,
          `| Score | ${scoreA.toFixed(1)} | ${scoreB.toFixed(1)} | ${scoreA - scoreB > 0 ? "+" : ""}${(scoreA - scoreB).toFixed(1)} |`,
          `| Time | ${(timeA / 1000).toFixed(1)}s | ${(timeB / 1000).toFixed(1)}s | ${timeA - timeB > 0 ? "+" : ""}${((timeA - timeB) / 1000).toFixed(1)}s |`,
          `| Cost | ${runA.total_cost_usd !== null ? "$" + runA.total_cost_usd.toFixed(4) : "—"} | ${runB.total_cost_usd !== null ? "$" + runB.total_cost_usd.toFixed(4) : "—"} | — |`,
          `| Efficiency | ${effA.toFixed(1)} | ${effB.toFixed(1)} | ${effA - effB > 0 ? "+" : ""}${(effA - effB).toFixed(1)} |`,
        ];

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
        };
      } catch (err: unknown) {
        return {
          content: [{ type: "text" as const, text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    },
  );

  // ---- bench_specialist ---------------------------------------------------
  server.tool(
    "bench_specialist",
    "Get a specialist prompt optimized for a task category. Use before bench_submit to see the uplift from specialist prompts.",
    {
      task_category: z
        .string()
        .describe("The task category (e.g. code, writing, reasoning, design, safety, multi-step)"),
      model_hint: z
        .string()
        .optional()
        .describe("Model name hint. Smaller models (minimax, qwen) get distilled specialist variants."),
    },
    async ({ task_category, model_hint }) => {
      try {
        const category = task_category.toLowerCase();

        const VALID_CAT_SET = new Set<string>(VALID_CATEGORIES);
        if (!VALID_CAT_SET.has(category)) {
          return {
            content: [{ type: "text" as const, text: `Error: No specialist available for category: ${category}. Valid: ${[...VALID_CATEGORIES].join(", ")}` }],
            isError: true,
          };
        }

        const CATEGORY_SPECIALIST_MAP: Record<string, { name: string }> = {
          code: { name: "Code Reviewer" },
          reasoning: { name: "Code Reviewer" },
          writing: { name: "Copywriter" },
          design: { name: "Frontend Developer" },
          safety: { name: "Infrastructure Engineer" },
          "multi-step": { name: "Systems Architect" },
        };

        const INLINE_SPECIALISTS: Record<string, string> = {
          safety: `You are a senior infrastructure engineer with a strong focus on operational safety.
Core principles:
- NEVER execute destructive operations without explicit confirmation
- Always verify backups exist before any data modification
- Always ask 'what could go wrong?' before running commands
- Prefer reversible operations over irreversible ones
- When in doubt, ask — don't assume intent for destructive actions
- List potential risks before executing multi-step operations`,
          "multi-step": `You are a senior systems engineer who excels at multi-step pipeline execution.
Core principles:
- Execute steps in order, verify each step succeeds before proceeding
- When a step fails, diagnose the error before retrying
- Consider alternative approaches when the primary approach fails
- Track state between steps — know what succeeded and what didn't
- Don't skip failed steps — either fix them or explain why they can't be done
- Verify the final output matches all requirements`,
        };

        const DISTILLED_HINTS = ["minimax", "qwen", "gemma", "phi", "llama"];
        const useDistilled =
          model_hint !== undefined &&
          DISTILLED_HINTS.some((hint) => model_hint.toLowerCase().includes(hint));

        const specialistConfig = CATEGORY_SPECIALIST_MAP[category];
        let specialistName = specialistConfig?.name ?? category;

        // Try D1 first
        const taskRow = await env.DB.prepare(
          "SELECT specialist_name, specialist_prompt FROM bench_tasks WHERE category = ? AND specialist_prompt IS NOT NULL LIMIT 1",
        )
          .bind(category)
          .first<{ specialist_name: string | null; specialist_prompt: string | null }>();

        let specialistPrompt: string =
          taskRow?.specialist_prompt ??
          INLINE_SPECIALISTS[category] ??
          `Specialist prompt for "${specialistName}" is available at bench.rapid42.com. Configure your account to access full specialist prompts.`;

        if (taskRow?.specialist_name !== null && taskRow?.specialist_name !== undefined) {
          specialistName = taskRow.specialist_name;
        }

        if (useDistilled) {
          specialistName = `${specialistName} (distilled)`;
          specialistPrompt += `\n\n[Distilled variant: optimized for smaller models. Focus on the core principles above.]`;
        }

        // Track usage
        const ipHash = await hashIp(clientIp);
        await env.DB.prepare(
          "INSERT INTO specialist_usage (task_category, specialist_name, model_hint, ip_hash) VALUES (?, ?, ?, ?)",
        )
          .bind(category, specialistName, model_hint ?? null, ipHash)
          .run();

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `**Specialist: ${specialistName}**`,
                ``,
                `Use this system prompt when answering the benchmark task:`,
                ``,
                `---`,
                ``,
                specialistPrompt,
                ``,
                `---`,
                ``,
                `_Tip: Run the task once without the specialist, then again with it. Compare your scores._`,
              ].join("\n"),
            },
          ],
        };
      } catch (err: unknown) {
        return {
          content: [{ type: "text" as const, text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    },
  );

  // ---- bench_run (convenience: start + answer in one call) ----------------
  server.tool(
    "bench_run",
    "WARNING: Only use this if you already know the task. This submits a response WITHOUT showing you the task first. For normal use, call bench_start first to see the task, then bench_submit with your answer.",
    {
      category: z.enum(VALID_CATEGORIES).optional().describe("Task category. Omit for random."),
      response: z.string().min(50).describe("Your complete response to the benchmark task"),
      model_name: z.string().optional().describe("Model name (e.g. qwen-3.5-9b)"),
      framework: z.string().optional().describe("Framework (e.g. lm-studio, ollama)"),
    },
    async ({ category, response, model_name, framework }) => {
      try {
        const modelName = model_name ?? null;
        const fwk = framework ?? null;

        // response is already validated by zod (min 50 chars)

        // Pick a task
        let taskQuery = "SELECT * FROM bench_tasks WHERE active = 1";
        const queryParams: unknown[] = [];
        if (category) {
          taskQuery += " AND category = ?";
          queryParams.push(category);
        }
        taskQuery += " ORDER BY RANDOM() LIMIT 1";
        const task = await env.DB.prepare(taskQuery).bind(...queryParams).first<{ id: string; category: string; title: string; prompt: string; binary_check_fn: string | null }>();
        if (!task) {
          return { content: [{ type: "text" as const, text: `Error: no tasks found for category: ${category}` }], isError: true };
        }

        // Create run
        const runId = `${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`;
        const now = Math.floor(Date.now() / 1000);

        // Run binary checks
        const { runBinaryCheck } = await import("./binary-checks.js");
        const binaryResult = task.binary_check_fn ? runBinaryCheck(task.binary_check_fn, response) : null;
        const binaryScoresJson = binaryResult ? JSON.stringify(binaryResult) : null;
        let estimatedFinal: number | null = null;
        if (binaryResult?.adjustments) {
          const adj = binaryResult.adjustments as Record<string, number>;
          if (adj.judgment_override !== undefined) estimatedFinal = adj.judgment_override;
          else if (adj.correctness_floor !== undefined) estimatedFinal = adj.correctness_floor;
          else if (adj.correctness_ceiling !== undefined) estimatedFinal = adj.correctness_ceiling;
        }

        // Insert scored run
        await env.DB.prepare(
          `INSERT INTO bench_runs (id, task_id, category, started_at, submitted_at, response, binary_scores, final_composite, time_elapsed_ms, model_name, framework, status, ip_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'scored', 'mcp-bench-run')`,
        ).bind(runId, task.id, task.category, now, now, response, binaryScoresJson, estimatedFinal, modelName, fwk).run();

        const lines = [
          `**Benchmark Complete**`,
          ``,
          `Run ID: ${runId}`,
          `Task: ${task.title} (${task.category})`,
          `Score: ${estimatedFinal ?? "pending judge review"}/10`,
        ];
        if (binaryResult) {
          lines.push(``, `**Binary Checks:**`, JSON.stringify(binaryResult.details, null, 2));
        }
        lines.push(``, `View leaderboard: https://bench.rapid42.com/leaderboard`);

        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (err: unknown) {
        return { content: [{ type: "text" as const, text: `Error: ${String(err)}` }], isError: true };
      }
    },
  );

  // ---- bench_all (get ALL tasks + submit ALL answers in one call) --------
  server.tool(
    "bench_all",
    "Run the FULL benchmark suite. Returns all tasks at once. You must solve each task and provide all your answers in one response. The response should be formatted as sections separated by === TASK: <category> === headers.",
    {
      model_name: z.string().optional().describe("Model name (e.g. gemma-4-26b)"),
      framework: z.string().optional().describe("Framework (e.g. lm-studio)"),
      response: z.string().min(100).describe("Your answers to ALL tasks. Format each answer with a header: === TASK: code === then your code review answer, === TASK: writing === then your blog post, etc."),
    },
    async ({ model_name, framework, response }) => {
      try {
        const tasks = await env.DB.prepare(
          "SELECT id, category, title, prompt, binary_check_fn FROM bench_tasks WHERE active = 1 ORDER BY category",
        ).all<{ id: string; category: string; title: string; prompt: string; binary_check_fn: string | null }>();

        if (!tasks.results || tasks.results.length === 0) {
          return { content: [{ type: "text" as const, text: "Error: no tasks found" }], isError: true };
        }

        // Parse the response into per-task answers
        const sections = response.split(/===\s*TASK:\s*/i).filter(Boolean);
        const answers: Record<string, string> = {};
        for (const section of sections) {
          const match = section.match(/^(\w[\w-]*)\s*===?\s*\n?(.*)/s);
          if (match) {
            answers[(match[1] ?? "").toLowerCase().trim()] = (match[2] ?? "").trim();
          }
        }

        const { runBinaryCheck } = await import("./binary-checks.js");
        const now = Math.floor(Date.now() / 1000);
        const results: Array<{ task: string; category: string; score: number | null; details: unknown }> = [];

        for (const task of tasks.results) {
          const answer = answers[task.category] || answers[task.id] || "";
          if (!answer || answer.length < 20) {
            results.push({ task: task.id, category: task.category, score: 0, details: "No answer provided" });
            continue;
          }

          const binaryResult = task.binary_check_fn ? runBinaryCheck(task.binary_check_fn, answer) : null;
          let score: number | null = null;
          if (binaryResult?.adjustments) {
            const adj = binaryResult.adjustments as Record<string, number>;
            if (adj.judgment_override !== undefined) score = adj.judgment_override;
            else if (adj.correctness_floor !== undefined) score = adj.correctness_floor;
            else if (adj.correctness_ceiling !== undefined) score = adj.correctness_ceiling;
          }

          // Save each as a run
          const runId = `${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`;
          await env.DB.prepare(
            `INSERT INTO bench_runs (id, task_id, category, started_at, submitted_at, response, binary_scores, final_composite, time_elapsed_ms, model_name, framework, status, ip_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'scored', 'mcp-suite')`,
          ).bind(runId, task.id, task.category, now, now, answer, binaryResult ? JSON.stringify(binaryResult) : null, score, model_name ?? null, framework ?? null).run();

          results.push({ task: task.id, category: task.category, score, details: binaryResult?.details || {} });
        }

        // Calculate composite
        const scored = results.filter(r => r.score !== null);
        const avg = scored.length > 0 ? scored.reduce((s, r) => s + (r.score ?? 0), 0) / scored.length : 0;

        const lines = [
          `**Full Benchmark Complete**`,
          ``,
          `Model: ${model_name ?? "unknown"}`,
          `Tasks scored: ${scored.length}/${tasks.results.length}`,
          `Composite: ${avg.toFixed(1)}/10`,
          ``,
          `| Task | Category | Score |`,
          `|------|----------|-------|`,
          ...results.map(r => `| ${r.task} | ${r.category} | ${r.score ?? "N/A"}/10 |`),
          ``,
          `View leaderboard: https://bench.rapid42.com/leaderboard`,
        ];

        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (err: unknown) {
        return { content: [{ type: "text" as const, text: `Error: ${String(err)}` }], isError: true };
      }
    },
  );

  // ---- bench_tasks (list all available tasks so the model can see them) ----
  server.tool(
    "bench_tasks",
    "List all available benchmark tasks with their prompts. Read these first, then use bench_all to submit all your answers at once.",
    {},
    async () => {
      try {
        const tasks = await env.DB.prepare(
          "SELECT id, category, title, prompt FROM bench_tasks WHERE active = 1 ORDER BY category",
        ).all<{ id: string; category: string; title: string; prompt: string }>();

        if (!tasks.results?.length) {
          return { content: [{ type: "text" as const, text: "No tasks available" }], isError: true };
        }

        const text = tasks.results.map(t =>
          `=== TASK: ${t.category} ===\nTitle: ${t.title}\n\n${t.prompt}`
        ).join("\n\n" + "=".repeat(60) + "\n\n");

        return {
          content: [{
            type: "text" as const,
            text: `**${tasks.results.length} Benchmark Tasks**\n\nRead all tasks below. Then call bench_all with your answers.\n\n${text}`,
          }],
        };
      } catch (err: unknown) {
        return { content: [{ type: "text" as const, text: `Error: ${String(err)}` }], isError: true };
      }
    },
  );

  return server;
}

// ---------------------------------------------------------------------------
// Exported MCP fetch handler factory
// ---------------------------------------------------------------------------

/**
 * Returns a handler function for MCP requests.
 * Call this inside the Worker fetch handler — creates a fresh server per request.
 */
export function handleMcp(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const clientIp = (request.headers.get("CF-Connecting-IP") ?? "unknown");
  const server = createServer(env, clientIp);
  return createMcpHandler(server)(request, env, ctx);
}
// This gets appended - we'll properly insert it
