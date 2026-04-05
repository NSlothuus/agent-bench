/**
 * HTTPS client for bench.rapid42.com API.
 * Uses native fetch — no external dependencies.
 */

import type {
  ApiErrorResponse,
  BenchStartResponse,
  BenchSubmitResponse,
  BenchResultsResponse,
  BenchLeaderboardResponse,
  BenchSpecialistResponse,
  BenchCheckpointResponse,
  BenchCompareResponse,
} from "./types.js";

const DEFAULT_BASE_URL = "https://bench.rapid42.com";
const REQUEST_TIMEOUT_MS = 30_000;

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const init: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "model-bench-mcp/0.1.0",
        },
        signal: controller.signal,
      };

      if (body !== undefined && method === "POST") {
        init.body = JSON.stringify(body);
      }

      const res = await fetch(url, init);
      const json = (await res.json()) as T | ApiErrorResponse;

      if (!res.ok) {
        const errMsg =
          (json as ApiErrorResponse).error ?? `HTTP ${res.status}: ${res.statusText}`;
        throw new Error(errMsg);
      }

      return json as T;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms: ${method} ${path}`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  async benchStart(category?: string): Promise<BenchStartResponse> {
    return this.request<BenchStartResponse>("POST", "/api/bench/start", {
      ...(category !== undefined ? { category } : {}),
    });
  }

  async benchSubmit(
    runId: string,
    response: string,
    options?: {
      model_name?: string;
      framework?: string;
      total_tokens?: number;
      total_cost_usd?: number;
      models_used?: string[];
    },
  ): Promise<BenchSubmitResponse> {
    return this.request<BenchSubmitResponse>("POST", "/api/bench/submit", {
      run_id: runId,
      response,
      ...options,
    });
  }

  async benchResults(runId?: string): Promise<BenchResultsResponse> {
    const path = runId !== undefined
      ? `/api/bench/results/${encodeURIComponent(runId)}`
      : "/api/bench/results/latest";
    return this.request<BenchResultsResponse>("GET", path);
  }

  async benchLeaderboard(
    sortBy?: string,
    limit?: number,
    framework?: string,
    model?: string,
  ): Promise<BenchLeaderboardResponse> {
    const params = new URLSearchParams();
    if (sortBy !== undefined) params.set("sort_by", sortBy);
    if (limit !== undefined) params.set("limit", String(limit));
    if (framework !== undefined) params.set("framework", framework);
    if (model !== undefined) params.set("model", model);
    const qs = params.toString();
    const path = `/api/bench/leaderboard${qs ? `?${qs}` : ""}`;
    return this.request<BenchLeaderboardResponse>("GET", path);
  }

  async benchCheckpoint(data: {
    run_id: string;
    step_name: string;
    model_used: string;
    tokens_in: number;
    tokens_out: number;
    cost_usd: number;
    duration_ms: number;
  }): Promise<BenchCheckpointResponse> {
    return this.request<BenchCheckpointResponse>("POST", "/api/bench/checkpoint", data);
  }

  async benchCompare(
    runIdA: string,
    runIdB: string,
  ): Promise<BenchCompareResponse> {
    return this.request<BenchCompareResponse>(
      "GET",
      `/api/bench/compare/${encodeURIComponent(runIdA)}/${encodeURIComponent(runIdB)}`,
    );
  }

  async benchSpecialist(
    taskCategory: string,
    modelHint?: string,
  ): Promise<BenchSpecialistResponse> {
    return this.request<BenchSpecialistResponse>("POST", "/api/bench/specialist", {
      task_category: taskCategory,
      ...(modelHint !== undefined ? { model_hint: modelHint } : {}),
    });
  }
}
