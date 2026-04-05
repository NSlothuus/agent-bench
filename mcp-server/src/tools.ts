/**
 * MCP Tool definitions for Model Bench.
 * Each tool maps to an API endpoint on bench.rapid42.com.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "./api-client.js";

export function registerTools(server: McpServer, api: ApiClient): void {
  // ---- bench_start ----
  server.tool(
    "bench_start",
    "Get a benchmark task. Optionally filter by category: code, writing, reasoning, design, multi-step, safety. Omit for a random task.",
    {
      category: z
        .enum(["code", "writing", "reasoning", "design", "multi-step", "safety"])
        .optional()
        .describe("Task category. Omit for random."),
    },
    async ({ category }) => {
      try {
        const result = await api.benchStart(category);
        return {
          content: [
            {
              type: "text" as const,
              text: [
                `**Benchmark Task Started**`,
                ``,
                `Run ID: ${result.data.run_id}`,
                `Category: ${result.data.category}`,
                `Started: ${result.data.started_at}`,
                ``,
                `---`,
                ``,
                result.data.task_prompt,
                ``,
                `---`,
                ``,
                `Submit your response with bench_submit using run_id: ${result.data.run_id}`,
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

  // ---- bench_submit ----
  server.tool(
    "bench_submit",
    "Submit your response to a benchmark task for scoring. Binary checks run immediately; full judge scoring is async. Optionally include telemetry data.",
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
        const result = await api.benchSubmit(run_id, response, {
          model_name,
          framework,
          total_tokens,
          total_cost_usd,
          models_used,
        });
        const lines = [
          `**Submission Received**`,
          ``,
          `Run ID: ${result.data.run_id}`,
          `Status: ${result.data.status}`,
        ];

        if (result.data.binary_score) {
          lines.push(
            ``,
            `**Binary Check Results:**`,
            `Check: ${result.data.binary_score.check_name}`,
            `Details: ${JSON.stringify(result.data.binary_score.details, null, 2)}`,
          );
        }

        if (result.data.estimated_final !== undefined) {
          lines.push(``, `Estimated Score: ${result.data.estimated_final}/10`);
        }

        if (result.data.efficiency_score !== undefined) {
          lines.push(``, `Efficiency Score: ${result.data.efficiency_score.toFixed(2)}`);
        }

        lines.push(``, `Leaderboard: ${result.data.leaderboard_url}`);

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

  // ---- bench_results ----
  server.tool(
    "bench_results",
    "Check the scoring status and results for a benchmark run. Omit run_id for your latest run.",
    {
      run_id: z.string().optional().describe("Run ID to check. Omit for latest."),
    },
    async ({ run_id }) => {
      try {
        const result = await api.benchResults(run_id);
        const lines = [
          `**Benchmark Results**`,
          ``,
          `Run ID: ${result.data.run_id}`,
          `Status: ${result.data.status}`,
        ];

        if (result.data.scores) {
          lines.push(
            ``,
            `**Scores:**`,
            `  Quality: ${result.data.scores.quality}/10`,
            `  Judgment: ${result.data.scores.judgment}/10`,
            `  Completeness: ${result.data.scores.completeness}/10`,
            `  Composite: ${result.data.scores.composite}/10`,
          );
        }

        if (result.data.rank !== undefined) {
          lines.push(``, `Rank: #${result.data.rank}`);
        }

        if (result.data.status === "pending") {
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

  // ---- bench_leaderboard ----
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
        const result = await api.benchLeaderboard(sort_by, limit, framework, model);
        const lines = [
          `**Agent Bench Leaderboard** (sorted by ${sort_by ?? "quality"})`,
          ``,
          `| Rank | Model | Score | Time | Tokens | Efficiency |`,
          `|------|-------|-------|------|--------|------------|`,
        ];

        for (const entry of result.data.entries) {
          const efficiency = entry.efficiency_score !== undefined
            ? entry.efficiency_score.toFixed(1)
            : "—";
          lines.push(
            `| #${entry.rank} | ${entry.model} | ${entry.score.toFixed(1)} | ${(entry.time_ms / 1000).toFixed(1)}s | ${entry.tokens} | ${efficiency} |`,
          );
        }

        lines.push(``, `Total entries: ${result.data.total}`);

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

  // ---- bench_checkpoint ----
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
        const result = await api.benchCheckpoint({
          run_id,
          step_name,
          model_used,
          tokens_in,
          tokens_out,
          cost_usd,
          duration_ms,
        });
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
                `Checkpoints so far: ${result.data.checkpoints_so_far}`,
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

  // ---- bench_compare ----
  server.tool(
    "bench_compare",
    "Compare two benchmark runs side-by-side. See score, time, cost, and efficiency differences.",
    {
      run_id_a: z.string().describe("First run ID to compare"),
      run_id_b: z.string().describe("Second run ID to compare"),
    },
    async ({ run_id_a, run_id_b }) => {
      try {
        const result = await api.benchCompare(run_id_a, run_id_b);
        const { run_a, run_b, comparison } = result.data;

        const lines = [
          `**Run Comparison**`,
          ``,
          `| Metric | Run A | Run B | Diff |`,
          `|--------|-------|-------|------|`,
          `| Run ID | ${run_a.run_id} | ${run_b.run_id} | — |`,
          `| Model | ${run_a.model_name ?? "unknown"} | ${run_b.model_name ?? "unknown"} | — |`,
          `| Framework | ${run_a.framework ?? "unknown"} | ${run_b.framework ?? "unknown"} | — |`,
          `| Category | ${run_a.category} | ${run_b.category} | — |`,
          `| Score | ${run_a.final_composite?.toFixed(1) ?? "—"} | ${run_b.final_composite?.toFixed(1) ?? "—"} | ${comparison.score_diff > 0 ? "+" : ""}${comparison.score_diff.toFixed(1)} |`,
          `| Time | ${run_a.time_elapsed_ms !== null ? (run_a.time_elapsed_ms / 1000).toFixed(1) + "s" : "—"} | ${run_b.time_elapsed_ms !== null ? (run_b.time_elapsed_ms / 1000).toFixed(1) + "s" : "—"} | ${comparison.time_diff_ms > 0 ? "+" : ""}${(comparison.time_diff_ms / 1000).toFixed(1)}s |`,
          `| Cost | ${run_a.total_cost_usd !== null ? "$" + run_a.total_cost_usd.toFixed(4) : "—"} | ${run_b.total_cost_usd !== null ? "$" + run_b.total_cost_usd.toFixed(4) : "—"} | — |`,
          `| Efficiency | ${run_a.efficiency_score?.toFixed(1) ?? "—"} | ${run_b.efficiency_score?.toFixed(1) ?? "—"} | ${comparison.efficiency_diff > 0 ? "+" : ""}${comparison.efficiency_diff.toFixed(1)} |`,
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

  // ---- bench_specialist ----
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
        const result = await api.benchSpecialist(task_category, model_hint);
        return {
          content: [
            {
              type: "text" as const,
              text: [
                `**Specialist: ${result.data.specialist_name}**`,
                ``,
                `Use this system prompt when answering the benchmark task:`,
                ``,
                `---`,
                ``,
                result.data.specialist_prompt,
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
}
