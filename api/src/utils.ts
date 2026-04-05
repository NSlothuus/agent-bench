/**
 * Shared utility functions for the API.
 */

/** Generate a short random ID */
export function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const segments: string[] = [];
  for (let s = 0; s < 3; s++) {
    let segment = "";
    for (let i = 0; i < 4; i++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    segments.push(segment);
  }
  return segments.join("-");
}

/** Hash an IP address for privacy-preserving rate limiting */
export async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + "agent-bench-salt-2025");
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Build a JSON response */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/** Build an error response */
export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ success: false, error: message }, status);
}
