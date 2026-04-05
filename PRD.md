# Agent Bench — Product Requirements Document

## Overview
Two MCP-based benchmark tools for AI agents. Server-side judging prevents cheating.

## Phase 1: Model Bench MCP

### What it does
An MCP server that any AI agent can connect to. The agent calls tools to get benchmark tasks, submit responses, and check scores. Judging happens server-side — the user never sees scoring criteria.

### Architecture
```
User's agent (Claude Code / Codex / OpenClaw / etc)
    ↕ MCP protocol (stdio)
Model Bench MCP Server (local npm package)
    ↕ HTTPS
bench.rapid42.com (Cloudflare Workers + D1)
    → Task distribution
    → Binary scoring (instant)
    → Queued judge scoring (async)
    → Leaderboard
```

### MCP Tools

#### `bench_start`
- Input: `{ category?: string }` (optional: "code", "writing", "reasoning", "design", "multi-step", "safety", or omit for random)
- Output: `{ run_id: string, task_id: string, task_prompt: string, category: string, started_at: string }`
- Server creates a run record, starts timer
- Task prompts are served from the server (not bundled locally)

#### `bench_submit`
- Input: `{ run_id: string, response: string }`
- Output: `{ run_id: string, status: "scored" | "queued", binary_score?: object, estimated_final?: number, leaderboard_url: string }`
- Server validates run_id, checks time elapsed
- Runs binary checks immediately (code: did it find bugs? safety: did it flag destructive ops? writing: banned phrases?)
- Returns preliminary score from binary checks
- Queues for full judge panel scoring (async)

#### `bench_results`
- Input: `{ run_id?: string }` (omit for latest)
- Output: `{ run_id: string, status: "pending" | "scored", scores?: { quality, judgment, completeness, composite }, rank?: number }`

#### `bench_leaderboard`
- Input: `{ sort_by?: "quality" | "speed" | "efficiency", limit?: number }`
- Output: `{ entries: [{ model, score, rank, time, tokens }], total: number }`

#### `bench_specialist`
- Input: `{ task_category: string, model_hint?: string }`
- Output: `{ specialist_prompt: string, specialist_name: string }`
- Returns the appropriate specialist persona for the task
- If model_hint contains "minimax" or "qwen", returns distilled variant
- This is how we expose our specialists — users see the uplift and want more

### Server API (Cloudflare Workers)

#### POST /api/bench/start
- Creates run in D1
- Returns task prompt
- Rate limit: 10 starts per hour per IP

#### POST /api/bench/submit
- Validates run_id exists and hasn't expired (30 min max)
- Runs binary checks
- Stores response
- Queues for judge panel
- Returns preliminary score

#### GET /api/bench/results/:run_id
- Returns current score status

#### GET /api/bench/leaderboard
- Returns ranked entries with filters

#### POST /api/bench/specialist
- Returns specialist prompt for category
- Tracks specialist usage for analytics

### D1 Schema

```sql
CREATE TABLE bench_runs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  category TEXT NOT NULL,
  model_name TEXT,
  framework TEXT,         -- "claude-code", "openclaw", "codex", etc
  started_at INTEGER NOT NULL,
  submitted_at INTEGER,
  response TEXT,
  binary_scores TEXT,     -- JSON blob from instant checks
  judge_scores TEXT,      -- JSON blob from 3-judge panel
  final_composite REAL,
  time_elapsed_ms INTEGER,
  tokens_used INTEGER,
  cost_usd REAL,
  ip_hash TEXT,           -- for rate limiting, hashed
  status TEXT DEFAULT 'started',  -- started, submitted, judging, scored
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE bench_tasks (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  grading_key TEXT NOT NULL,  -- hidden from users
  binary_check_fn TEXT,       -- function name for instant scoring
  active INTEGER DEFAULT 1,
  version INTEGER DEFAULT 1
);
```

### npm Package Structure

```
@rapid42/model-bench/
├── package.json
├── src/
│   ├── index.ts          ← MCP server entry point
│   ├── tools.ts          ← Tool definitions (start, submit, results, leaderboard, specialist)
│   ├── api-client.ts     ← HTTPS client for bench.rapid42.com
│   └── types.ts          ← TypeScript types
├── tsconfig.json
└── README.md
```

### Key Design Decisions

1. **Tasks served from server, not bundled** — prevents reading task prompts ahead of time
2. **Binary checks are instant** — user gets immediate feedback
3. **Judge panel is async** — results appear on leaderboard within minutes
4. **Specialist tool is optional** — users can request a specialist prompt before submitting, creating the vanilla vs specialist comparison
5. **Framework detection** — MCP server detects which framework is connecting (Claude Code sends user-agent, OpenClaw has identifiable patterns)
6. **No auth required for running** — anyone can benchmark. Leaderboard submission requires a free Rapid42 account (email only)

### Anti-Cheat Measures

1. Task rotation: pool of 3+ tasks per category, server picks randomly
2. Time validation: submissions > 30 min after start are rejected
3. Response length: < 50 chars flagged as invalid
4. Rate limiting: 10 runs/hour, 3 runs per model per day for leaderboard
5. IP hashing: detect multi-account abuse
6. Binary checks can't be gamed: they test for specific content (bug detection, safety flags)
7. Judge prompts never leave the server

## Tech Requirements

- TypeScript, MCP SDK (@modelcontextprotocol/sdk)
- Cloudflare Workers for the API
- D1 for storage
- No external dependencies in the MCP server beyond the MCP SDK
- Works with Node.js 18+
