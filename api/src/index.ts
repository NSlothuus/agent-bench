/**
 * Agent Bench API — Cloudflare Worker
 *
 * Endpoints:
 *   POST /api/bench/start              — get a benchmark task
 *   POST /api/bench/submit             — submit response for scoring
 *   POST /api/bench/checkpoint         — record progress checkpoint
 *   GET  /api/bench/results/:id        — check score status
 *   GET  /api/bench/compare/:a/:b      — compare two runs
 *   GET  /api/bench/leaderboard        — view rankings
 *   GET  /api/bench/setups             — view agent setup rankings
 *   POST /api/bench/specialist         — get specialist prompt
 */

import type { Env } from "./types.js";
import { LEADERBOARD_HTML } from "./leaderboard-html.js";

import { handleStart } from "./routes/start.js";
import { handleSubmit } from "./routes/submit.js";
import { handleResults } from "./routes/results.js";
import { handleLeaderboard } from "./routes/leaderboard.js";
import { handleSpecialist } from "./routes/specialist.js";
import { handleCheckpoint } from "./routes/checkpoint.js";
import { handleCompare } from "./routes/compare.js";
import { handleSetups } from "./routes/setups.js";
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

      // POST /api/bench/checkpoint
      if (path === "/api/bench/checkpoint" && request.method === "POST") {
        return handleCheckpoint(request, env);
      }

      // GET /api/bench/compare/:run_a/:run_b
      const compareMatch = path.match(/^\/api\/bench\/compare\/([^/]+)\/([^/]+)$/);
      if (compareMatch !== null && request.method === "GET") {
        const runIdA = compareMatch[1];
        const runIdB = compareMatch[2];
        if (runIdA === undefined || runIdB === undefined) {
          return errorResponse("Missing run IDs for comparison", 400);
        }
        return handleCompare(runIdA, runIdB, env);
      }

      // GET /api/bench/leaderboard
      if (path === "/api/bench/leaderboard" && request.method === "GET") {
        return handleLeaderboard(request, env);
      }

      // GET /api/bench/setups
      if (path === "/api/bench/setups" && request.method === "GET") {
        return handleSetups(request, env);
      }

      // POST /api/bench/specialist
      if (path === "/api/bench/specialist" && request.method === "POST") {
        return handleSpecialist(request, env);
      }

      // Health check
      if (path === "/health") {
        return jsonResponse({
          success: true,
          data: { service: "agent-bench-api", version: "0.3.0", status: "ok" },
        });
      }

      // Serve leaderboard HTML at root
      if (path === "/" || path === "/leaderboard") {
        return new Response(LEADERBOARD_HTML, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      return errorResponse("Not found", 404);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return errorResponse(message, 500);
    }
  },
} satisfies ExportedHandler<Env>;
