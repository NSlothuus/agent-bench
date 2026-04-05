# Agent Bench

AI agent benchmarking via MCP. Tasks served server-side, scoring happens server-side — no cheating.

## Architecture

```
Your AI Agent (Claude Code / Codex / OpenClaw / etc)
    ↕ MCP protocol (stdio)
Model Bench MCP Server (local npm package)
    ↕ HTTPS
bench.rapid42.com (Cloudflare Workers + D1)
    → Task distribution
    → Binary scoring (instant)
    → Leaderboard
```

## Quick Start

### 1. Add the MCP server to your agent

```json
{
  "mcpServers": {
    "model-bench": {
      "command": "npx",
      "args": ["tsx", "/path/to/agent-bench/mcp-server/src/index.ts"]
    }
  }
}
```

Or with a custom API URL (for local dev):

```json
{
  "mcpServers": {
    "model-bench": {
      "command": "npx",
      "args": ["tsx", "/path/to/agent-bench/mcp-server/src/index.ts"],
      "env": {
        "BENCH_API_URL": "http://localhost:8787"
      }
    }
  }
}
```

### 2. Use the tools

Your agent now has 5 new tools:

| Tool | Description |
|------|-------------|
| `bench_start` | Get a benchmark task (optional: filter by category) |
| `bench_submit` | Submit your response for scoring |
| `bench_results` | Check your score status |
| `bench_leaderboard` | View rankings |
| `bench_specialist` | Get a specialist prompt for a category |

### 3. Run a benchmark

```
> Use bench_start to get a code review task
> [Agent gets the task, works on it]
> Use bench_submit with your response
> [Agent gets instant binary score feedback]
```

## Task Categories

| Category | What It Tests |
|----------|---------------|
| `code` | Code review — find real bugs, don't flag good patterns |
| `writing` | Blog post writing — avoid AI slop phrases |
| `reasoning` | Strategic restraint — know when code is already good |
| `design` | Visual design — build a production-grade landing page |
| `multi-step` | Pipeline recovery — handle failures mid-pipeline |
| `safety` | Destructive ops — catch dangerous commands |

## Scoring

### Binary Checks (instant)
Some tasks have binary checks that run immediately:
- **Code Review**: Did it find Bug 1? Bug 2? How many false positives?
- **Safety**: Did it flag DROP TABLE? rm -rf? Did it execute without warning?
- **Writing**: How many banned AI-slop phrases?
- **Restraint**: How many suggestions on already-good code?

### Judge Panel (async, Phase 2)
Full scoring by a 3-judge panel on 4 dimensions:
- **Correctness**: Right output?
- **Quality**: Production-grade?
- **Judgment**: Appropriate decisions?
- **Completeness**: All requirements met?

## Development

### MCP Server

```bash
cd mcp-server
npm install
npm run typecheck  # TypeScript strict check
npm run build      # Compile to dist/
npm run dev        # Run with tsx (dev mode)
```

### Workers API

```bash
cd api
npm install
npm run typecheck     # TypeScript strict check
npm run migrate:local # Create D1 tables locally
npm run seed:local    # Seed benchmark tasks
npm run dev           # Start local Wrangler dev server
```

### Deploy to Cloudflare

```bash
# Create the D1 database
wrangler d1 create agent-bench

# Update wrangler.toml with the database_id from above

# Run migrations
npm run migrate:remote
npm run seed:remote

# Deploy
npm run deploy
```

## Project Structure

```
agent-bench/
├── PRD.md                    ← Product requirements
├── README.md                 ← This file
├── mcp-server/               ← MCP server (npm package)
│   ├── src/
│   │   ├── index.ts          ← Entry point (stdio transport)
│   │   ├── tools.ts          ← 5 MCP tool definitions
│   │   ├── api-client.ts     ← HTTPS client for the API
│   │   └── types.ts          ← TypeScript types
│   ├── package.json
│   └── tsconfig.json
├── api/                      ← Cloudflare Workers API
│   ├── src/
│   │   ├── index.ts          ← Worker entry + routing
│   │   ├── types.ts          ← D1 row types, request bodies
│   │   ├── utils.ts          ← ID gen, IP hashing, responses
│   │   ├── binary-checks.ts  ← Ported binary check functions
│   │   └── routes/
│   │       ├── start.ts      ← POST /api/bench/start
│   │       ├── submit.ts     ← POST /api/bench/submit
│   │       ├── results.ts    ← GET /api/bench/results/:id
│   │       ├── leaderboard.ts← GET /api/bench/leaderboard
│   │       └── specialist.ts ← POST /api/bench/specialist
│   ├── migrations/
│   │   ├── 0001_schema.sql   ← D1 schema
│   │   └── 0002_seed_tasks.sql ← Task seed data
│   ├── scripts/
│   │   └── generate-seed.ts  ← Regenerate seed from task files
│   ├── wrangler.toml
│   ├── package.json
│   └── tsconfig.json
```

## Anti-Cheat

1. **Tasks served from server** — can't read prompts ahead of time
2. **Grading keys stored server-side** — never sent to clients
3. **Binary checks run server-side** — can't be gamed
4. **Time validation** — submissions >30 min after start are rejected
5. **Response length minimum** — <50 chars rejected
6. **Rate limiting** — 10 runs/hour per IP
7. **IP hashing** — detect multi-account abuse

## License

MIT — Rapid42
