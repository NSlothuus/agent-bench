/**
 * OpenAI-compatible API caller.
 * Sends prompts to any OpenAI-compatible endpoint (LM Studio, Ollama, OpenAI, etc).
 * Zero dependencies: uses Node.js built-in fetch.
 */

const TASK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export interface ModelResponse {
  text: string;
  tokens: number;
  timeMs: number;
}

/**
 * Strip <think>...</think> blocks from model responses (reasoning/CoT output).
 */
function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

/**
 * Call an OpenAI-compatible chat completions API.
 */
export async function callModelApi(
  apiUrl: string,
  model: string,
  prompt: string,
  options?: {
    apiKey?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  },
): Promise<ModelResponse> {
  const start = Date.now();

  const messages: Array<{ role: string; content: string }> = [];

  if (options?.systemPrompt !== undefined) {
    messages.push({ role: "system", content: options.systemPrompt });
  }

  messages.push({ role: "user", content: prompt });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options?.apiKey !== undefined) {
    headers["Authorization"] = `Bearer ${options.apiKey}`;
  }

  const endpoint = apiUrl.replace(/\/+$/, "");
  const url = `${endpoint}/chat/completions`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TASK_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.0,
        max_tokens: options?.maxTokens ?? 8192,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `API returned ${response.status}: ${errorBody.slice(0, 200)}`,
      );
    }

    const json = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string };
        text?: string;
      }>;
      usage?: {
        total_tokens?: number;
        prompt_tokens?: number;
        completion_tokens?: number;
      };
    };

    const rawText =
      json.choices?.[0]?.message?.content ??
      json.choices?.[0]?.text ??
      "";

    const text = stripThinking(rawText);
    const timeMs = Date.now() - start;

    // Prefer API-reported tokens; fall back to estimate
    const tokens =
      json.usage?.total_tokens ??
      Math.ceil(rawText.length / 4);

    return { text, tokens, timeMs };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        `Model API call timed out after ${TASK_TIMEOUT_MS / 1000}s`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
