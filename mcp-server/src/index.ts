#!/usr/bin/env node
/**
 * Model Bench MCP Server
 *
 * An MCP server that lets any AI agent benchmark itself.
 * Tasks are served from bench.rapid42.com — scoring happens server-side.
 *
 * Usage:
 *   npx tsx src/index.ts
 *   BENCH_API_URL=http://localhost:8787 npx tsx src/index.ts
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ApiClient } from "./api-client.js";
import { registerTools } from "./tools.js";

const API_URL = process.env["BENCH_API_URL"] ?? "https://bench.rapid42.com";

async function main(): Promise<void> {
  const server = new McpServer({
    name: "model-bench",
    version: "0.1.0",
  });

  const api = new ApiClient(API_URL);

  registerTools(server, api);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  process.stderr.write(`Fatal: ${String(err)}\n`);
  process.exit(1);
});
