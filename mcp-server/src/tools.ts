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
    "Submit your response to a benchmark task for scoring. Binary checks run immediately; full judge scoring is async.",
    {
      run_id: z.string().describe("The run_id from bench_start"),
      response: z.string().describe("Your complete response to the benchmark task"),
    },
    async ({ run_id, response }) => {
      try {
        const result = await api.benchSubmit(run_id, response);
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
    "View the benchmark leaderboard. Sort by quality (default), speed, or efficiency.",
    {
      sort_by: z
        .enum(["quality", "speed", "efficiency"])
        .optional()
        .describe("Sort order. Default: quality."),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe("Number of entries to return. Default: 10."),
    },
    async ({ sort_by, limit }) => {
      try {
        const result = await api.benchLeaderboard(sort_by, limit);
        const lines = [
          `**Agent Bench Leaderboard** (sorted by ${sort_by ?? "quality"})`,
          ``,
          `| Rank | Model | Score | Time | Tokens |`,
          `|------|-------|-------|------|--------|`,
        ];

        for (const entry of result.data.entries) {
          lines.push(
            `| #${entry.rank} | ${entry.model} | ${entry.score.toFixed(1)} | ${(entry.time_ms / 1000).toFixed(1)}s | ${entry.tokens} |`,
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
