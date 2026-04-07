/**
 * Server API client — communicates with the Agent Bench API.
 * Zero dependencies: uses Node.js built-in fetch.
 */

const DEFAULT_SERVER = "https://bench.rapid42.com";
const REQUEST_TIMEOUT_MS = 30_000;

export interface StartResponse {
  run_id: string;
  task_id: string;
  task_prompt: string;
  category: string;
  started_at: string;
}

export interface SubmitResponse {
  run_id: string;
  status: "scored" | "queued";
  binary_score: BinaryScore | null;
  estimated_final: number | null;
  efficiency_score: number | null;
  leaderboard_url: string;
}

export interface BinaryScore {
  checks: Record<string, boolean>;
  adjustments: Record<string, number>;
  summary: string;
}

export interface SpecialistResponse {
  specialist_prompt: string;
  specialist_name: string;
}

export interface LeaderboardEntry {
  model: string;
  score: number;
  rank: number;
  time_ms: number;
  tokens: number;
  framework?: string;
  efficiency_score?: number;
  cost_usd?: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ApiClient {
  private readonly serverUrl: string;

  constructor(serverUrl?: string) {
    this.serverUrl = (serverUrl ?? DEFAULT_SERVER).replace(/\/+$/, "");
  }

  async start(category?: string, benchType?: string): Promise<StartResponse> {
    const body: Record<string, string> = {};
    if (category !== undefined) {
      body.category = category;
    }
    if (benchType !== undefined) {
      body.bench_type = benchType;
    }

    const result = await this.post<StartResponse>("/api/bench/start", body);
    return result;
  }

  async submit(
    runId: string,
    response: string,
    metadata: {
      model_name?: string;
      framework?: string;
      total_tokens?: number;
      total_cost_usd?: number;
      config_hash?: string;
      specialist_mode?: "raw" | "specialist";
    },
  ): Promise<SubmitResponse> {
    const body = {
      run_id: runId,
      response,
      ...metadata,
    };

    const result = await this.post<SubmitResponse>("/api/bench/submit", body);
    return result;
  }

  async specialist(
    taskCategory: string,
    modelHint?: string,
  ): Promise<SpecialistResponse> {
    const body: Record<string, string> = { task_category: taskCategory };
    if (modelHint !== undefined) {
      body.model_hint = modelHint;
    }

    const result = await this.post<SpecialistResponse>(
      "/api/bench/specialist",
      body,
    );
    return result;
  }

  async leaderboard(options?: {
    sort?: string;
    limit?: number;
    framework?: string;
    model?: string;
    bench_type?: string;
  }): Promise<LeaderboardResponse> {
    const params = new URLSearchParams();
    if (options?.sort !== undefined) params.set("sort_by", options.sort);
    if (options?.limit !== undefined)
      params.set("limit", String(options.limit));
    if (options?.framework !== undefined)
      params.set("framework", options.framework);
    if (options?.model !== undefined) params.set("model", options.model);
    if (options?.bench_type !== undefined)
      params.set("bench_type", options.bench_type);

    const qs = params.toString();
    const path = `/api/bench/leaderboard${qs ? `?${qs}` : ""}`;

    const result = await this.get<LeaderboardResponse>(path);
    return result;
  }

  async results(runId: string): Promise<unknown> {
    const result = await this.get<unknown>(`/api/bench/results/${encodeURIComponent(runId)}`);
    return result;
  }

  async profile(): Promise<unknown> {
    const result = await this.get<unknown>("/api/bench/profile");
    return result;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  private async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.serverUrl}${path}`;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "agent-bench-cli/0.1.0",
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const json = (await response.json()) as ApiResponse<T>;

      if (!response.ok || !json.success) {
        throw new Error(
          json.error ?? `Server returned ${response.status}`,
        );
      }

      if (json.data === undefined) {
        throw new Error("Server returned success but no data");
      }

      return json.data;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Request to ${path} timed out after ${REQUEST_TIMEOUT_MS}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
