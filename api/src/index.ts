/**
 * Agent Bench API — Cloudflare Worker
 *
 * Endpoints:
 *   POST /api/bench/start       — get a benchmark task
 *   POST /api/bench/submit      — submit response for scoring
 *   GET  /api/bench/results/:id — check score status
 *   GET  /api/bench/leaderboard — view rankings
 *   POST /api/bench/specialist  — get specialist prompt
 */

import type { Env } from "./types.js";
import { handleStart } from "./routes/start.js";
import { handleSubmit } from "./routes/submit.js";
import { handleResults } from "./routes/results.js";
import { handleLeaderboard } from "./routes/leaderboard.js";
import { handleSpecialist } from "./routes/specialist.js";
import { jsonResponse, errorResponse } from "./utils.js";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // POST /api/bench/start
      if (path === "/api/bench/start" && request.method === "POST") {
        return handleStart(request, env);
      }

      // POST /api/bench/submit
      if (path === "/api/bench/submit" && request.method === "POST") {
        return handleSubmit(request, env);
      }

      // GET /api/bench/results/:run_id
      const resultsMatch = path.match(/^\/api\/bench\/results\/(.+)$/);
      if (resultsMatch !== null && request.method === "GET") {
        const runId = resultsMatch[1];
        if (runId === undefined) {
          return errorResponse("Missing run_id", 400);
        }
        return handleResults(runId, env);
      }

      // GET /api/bench/leaderboard
      if (path === "/api/bench/leaderboard" && request.method === "GET") {
        return handleLeaderboard(request, env);
      }

      // POST /api/bench/specialist
      if (path === "/api/bench/specialist" && request.method === "POST") {
        return handleSpecialist(request, env);
      }

      // Health check
      if (path === "/health" || path === "/") {
        return jsonResponse({
          success: true,
          data: {
            service: "agent-bench-api",
            version: "0.1.0",
            status: "ok",
          },
        });
      }

      return errorResponse("Not found", 404);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return errorResponse(message, 500);
    }
  },
} satisfies ExportedHandler<Env>;
