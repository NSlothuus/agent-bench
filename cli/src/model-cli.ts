/**
 * CLI pipe caller — sends prompts to models via stdin/stdout.
 * Supports: claude -p, gemini -p, codex -p, or any command that reads stdin and writes stdout.
 * Zero dependencies: uses Node.js built-in child_process.
 */

import { spawn } from "node:child_process";

const TASK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export interface ModelResponse {
  text: string;
  tokens: number;
  timeMs: number;
}

/**
 * Strip <think>...</think> blocks from model responses.
 */
function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

/**
 * Build the full prompt, optionally prepending a system prompt.
 * For CLI pipes there's no system/user distinction, so we combine them.
 */
function buildPrompt(prompt: string, systemPrompt?: string): string {
  if (systemPrompt !== undefined) {
    return `${systemPrompt}\n\n---\n\n${prompt}`;
  }
  return prompt;
}

/**
 * Call a model via CLI pipe (stdin → process → stdout).
 */
export async function callModelCli(
  command: string,
  prompt: string,
  options?: {
    systemPrompt?: string;
  },
): Promise<ModelResponse> {
  const start = Date.now();
  const fullPrompt = buildPrompt(prompt, options?.systemPrompt);

  // Parse the command — handle quoted args
  const parts = parseCommand(command);
  if (parts.length === 0) {
    throw new Error(`Invalid CLI command: "${command}"`);
  }

  const [cmd, ...args] = parts;

  return new Promise<ModelResponse>((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGTERM");
      // Give it 5s to die gracefully, then SIGKILL
      setTimeout(() => {
        if (!proc.killed) {
          proc.kill("SIGKILL");
        }
      }, 5000);
    }, TASK_TIMEOUT_MS);

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("error", (err: Error) => {
      clearTimeout(timeout);
      reject(
        new Error(
          `Failed to spawn "${cmd}": ${err.message}. Is it installed and in PATH?`,
        ),
      );
    });

    proc.on("close", (code: number | null) => {
      clearTimeout(timeout);

      if (timedOut) {
        reject(
          new Error(
            `CLI command timed out after ${TASK_TIMEOUT_MS / 1000}s`,
          ),
        );
        return;
      }

      if (code !== 0 && stdout.trim().length === 0) {
        reject(
          new Error(
            `CLI command exited with code ${code}${stderr ? `: ${stderr.slice(0, 500)}` : ""}`,
          ),
        );
        return;
      }

      const text = stripThinking(stdout.trim());
      const timeMs = Date.now() - start;
      // Rough token estimate: ~4 chars per token
      const tokens = Math.ceil(text.length / 4);

      resolve({ text, tokens, timeMs });
    });

    // Write prompt to stdin and close
    proc.stdin.write(fullPrompt);
    proc.stdin.end();
  });
}

/**
 * Parse a command string into parts, respecting quotes.
 */
function parseCommand(command: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuote: string | null = null;

  for (const char of command) {
    if (inQuote !== null) {
      if (char === inQuote) {
        inQuote = null;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = char;
    } else if (char === " ") {
      if (current.length > 0) {
        parts.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current.length > 0) {
    parts.push(current);
  }

  return parts;
}
