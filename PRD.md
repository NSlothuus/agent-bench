# Agent Bench — Product Requirements Document

## Overview

Two CLI-based benchmark tools for AI: **Model Bench** tests raw model intelligence, **Agent Bench** tests full agentic system performance. Both use real-world tasks, server-side judging, and feed into the bench.rapid42.com leaderboard.

No MCP. CLI only. Real tasks. No cheating.

---

## Philosophy

### Real-World Over Synthetic
Traditional benchmarks test trivia, toy math, or synthetic puzzles. That tells you nothing about how a model performs on actual work. Our tasks mirror what developers and agents actually do: review real code, write real content, handle real failures, make real judgment calls.

### Systems Over Models
Everyone benchmarks models in isolation. Nobody measures how good your *agent system* is. Two people running the same model with different tools, memory, skills, and configs will get wildly different results. Agent Bench measures the full stack.

---

## Two Benchmark Paths

### Path 1: Model Bench — Raw Model Intelligence

Tests what the model *can do* without tools, memory, or agentic scaffolding. Pure prompt → response quality.

#### How it works
```
User runs: npx @rapid42/agent-bench model run [--category code|writing|reasoning|design|safety]
    ↓
CLI fetches task from bench.rapid42.com API
    ↓
CLI sends prompt to model (via configured provider)
    ↓
CLI submits response to API for scoring
    ↓
Instant binary score + async judge panel score
    ↓
Results on bench.rapid42.com/models
```

#### Task Categories (Real-World)

| Category | What It Tests | Example Task |
|----------|---------------|--------------|
| `code` | Code review — find real bugs in real code | 500-line PR with 3 subtle bugs and 5 red herrings |
| `writing` | Content creation — human-quality writing | Write a technical blog post that doesn't read like AI slop |
| `reasoning` | Strategic judgment — know when NOT to act | Review already-good code — fewer suggestions = better score |
| `design` | System design — architecture decisions | Design a rate limiter for a multi-tenant SaaS API |
| `safety` | Threat detection — catch dangerous operations | Spot the DROP TABLE in a "routine migration script" |

#### What Gets Measured
- **Correctness** — did you get the right answer?
- **Quality** — is the output production-grade?
- **Judgment** — did you make smart decisions (including knowing when to stop)?
- **Speed** — time to completion
- **Efficiency** — tokens used

#### Leaderboard: bench.rapid42.com/models
Rankings by model, filterable by category. "Which model is smartest at real work?"

---

### Path 2: Agent Bench — Agentic System Performance

Tests the *full stack*: model + tools + config + skills + memory + framework. Real multi-step workflows that require tool use, file operations, error recovery, and planning.

#### How it works
```
User runs: npx @rapid42/agent-bench agent run [--category coding|research|ops|recovery|planning]
    ↓
CLI fetches agentic task from bench.rapid42.com API
    ↓
CLI sets up sandboxed workspace (temp dir with files, configs, scenarios)
    ↓
Agent runs the task using its full toolset
    ↓
CLI collects results: files created/modified, commands run, time, tokens, errors
    ↓
CLI submits workspace snapshot + trace to API for scoring
    ↓
Results on bench.rapid42.com/agents
```

#### Task Categories (Agentic Workflows)

| Category | What It Tests | Example Task |
|----------|---------------|--------------|
| `coding` | Build a feature end-to-end | "Add auth to this Express app — here's the codebase" |
| `research` | Multi-source research + synthesis | "Research this API, find the rate limits, write integration docs" |
| `ops` | DevOps / infrastructure tasks | "This CI pipeline is broken — diagnose and fix it" |
| `recovery` | Handle failures mid-workflow | "Deploy failed halfway — recover without data loss" |
| `planning` | Multi-step planning + execution | "Migrate this codebase from CJS to ESM — plan and execute" |

#### What Gets Measured
- **Task completion** — did the agent finish the job?
- **Correctness** — does the output actually work?
- **Efficiency** — tokens used, time taken, unnecessary steps avoided
- **Recovery** — how did it handle errors and dead ends?
- **Tool use** — smart tool selection, minimal redundant calls
- **Autonomy** — did it complete without human intervention?

#### The Key Insight: Compare Setups
Same model, different setups → who performs better?
- OpenClaw with custom skills vs vanilla Claude Code
- Sonnet with carefully tuned prompts vs Opus with defaults
- Full tool access vs minimal tools

Same setup, different models → which model fits best?
- Your OpenClaw config with Sonnet vs Opus vs GPT-4o
- Which model maximizes YOUR specific tool/skill setup?

#### Leaderboard: bench.rapid42.com/agents
Rankings by setup (model + framework + config hash), filterable by category.
"Which *system* is best at real work?"

---

## CLI Design

### Package
```
npx @rapid42/agent-bench <command>
```

### Commands

```bash
# Model Bench
agent-bench model run                    # Random category
agent-bench model run --category code    # Specific category
agent-bench model run --model claude-sonnet-4-20250514  # Specify model
agent-bench model results                # Check latest results
agent-bench model leaderboard            # View model rankings

# Agent Bench
agent-bench agent run                    # Random category
agent-bench agent run --category coding  # Specific category
agent-bench agent run --framework openclaw  # Tag your framework
agent-bench agent results                # Check latest results
agent-bench agent leaderboard            # View agent/setup rankings

# General
agent-bench compare <run-a> <run-b>      # Compare two runs
agent-bench profile                      # View your benchmark history
agent-bench login                        # Auth for leaderboard submission
```

### CLI Flow (Model Bench)
```
$ npx @rapid42/agent-bench model run --category code

🎯 Agent Bench — Model Benchmark
Category: code
Task: PR Review — find the bugs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task prompt displayed]

Sending to claude-sonnet-4-20250514...
⏱  Response in 4.2s (1,847 tokens)

📊 Instant Score:
  ✅ Found Bug #1 (null check)
  ✅ Found Bug #2 (race condition)
  ❌ Missed Bug #3 (integer overflow)
  ⚠️  1 false positive flagged

  Binary: 7.2/10
  Full judge score: queued (check in ~2 min)

🔗 Results: bench.rapid42.com/run/abc123
```

### CLI Flow (Agent Bench)
```
$ npx @rapid42/agent-bench agent run --category coding

🎯 Agent Bench — Agentic Benchmark
Category: coding
Task: Add JWT auth to Express API

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Setting up workspace...
  📁 Created /tmp/bench-xyz/ with Express app scaffold

Running task with your agent...
  🔧 Framework: openclaw
  🤖 Model: claude-sonnet-4-20250514
  ⏱  Time limit: 10 min

[Agent works autonomously]

📊 Results:
  ✅ Auth middleware created
  ✅ JWT signing works
  ✅ Protected routes return 401 without token
  ❌ Refresh token not implemented
  ⚠️  No rate limiting on login endpoint

  Completion: 80%
  Quality: 8.1/10
  Efficiency: 3,200 tokens
  Time: 2m 34s

🔗 Results: bench.rapid42.com/run/def456
```

---

## Server API (Cloudflare Workers + D1)

### Endpoints

```
POST /api/bench/start          — Get a task (model or agent)
POST /api/bench/submit         — Submit response/results
GET  /api/bench/results/:id    — Get run results
GET  /api/bench/leaderboard    — Rankings (model or agent)
GET  /api/bench/compare/:a/:b  — Compare two runs
POST /api/bench/checkpoint     — Save progress mid-task (agent bench)
GET  /api/health               — Health check
```

### D1 Schema

```sql
CREATE TABLE bench_runs (
  id TEXT PRIMARY KEY,
  bench_type TEXT NOT NULL,       -- 'model' or 'agent'
  task_id TEXT NOT NULL,
  category TEXT NOT NULL,
  model_name TEXT,
  framework TEXT,                 -- 'openclaw', 'claude-code', 'codex', 'cursor', etc
  config_hash TEXT,               -- hash of agent config for setup comparison
  started_at INTEGER NOT NULL,
  submitted_at INTEGER,
  response TEXT,
  workspace_snapshot TEXT,        -- for agent bench: files created/modified
  execution_trace TEXT,           -- for agent bench: tool calls, commands, errors
  binary_scores TEXT,             -- JSON: instant check results
  judge_scores TEXT,              -- JSON: 3-judge panel results
  final_composite REAL,
  time_elapsed_ms INTEGER,
  tokens_used INTEGER,
  cost_usd REAL,
  ip_hash TEXT,
  status TEXT DEFAULT 'started',  -- started, submitted, judging, scored
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE bench_tasks (
  id TEXT PRIMARY KEY,
  bench_type TEXT NOT NULL,       -- 'model' or 'agent'
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  setup_files TEXT,               -- for agent bench: JSON of files to scaffold
  grading_key TEXT NOT NULL,      -- hidden from users
  binary_check_fn TEXT,
  time_limit_ms INTEGER,         -- for agent bench: max time allowed
  active INTEGER DEFAULT 1,
  version INTEGER DEFAULT 1
);

CREATE TABLE bench_setups (
  id TEXT PRIMARY KEY,
  config_hash TEXT UNIQUE NOT NULL,
  framework TEXT NOT NULL,
  model_name TEXT,
  description TEXT,               -- user-provided setup description
  first_seen INTEGER DEFAULT (unixepoch()),
  total_runs INTEGER DEFAULT 0,
  avg_score REAL
);
```

---

## Anti-Cheat

1. **Tasks served from server** — can't read prompts ahead of time
2. **Grading keys never leave the server** — scoring criteria is secret
3. **Binary checks run server-side** — can't be gamed
4. **Time validation** — model bench: 30 min max; agent bench: per-task limits
5. **Response length minimum** — <50 chars rejected
6. **Rate limiting** — 10 runs/hour per IP
7. **Workspace validation** (agent bench) — verify files were actually created/modified
8. **Execution trace analysis** — detect copy-paste or pre-computed responses
9. **Task rotation** — 3+ tasks per category, randomly assigned

---

## Project Structure

```
agent-bench/
├── PRD.md                        ← This file
├── README.md                     ← User-facing docs
├── cli/                          ← CLI package (@rapid42/agent-bench)
│   ├── src/
│   │   ├── index.ts              ← Entry point
│   │   ├── commands/
│   │   │   ├── model.ts          ← model run/results/leaderboard
│   │   │   ├── agent.ts          ← agent run/results/leaderboard
│   │   │   ├── compare.ts        ← compare two runs
│   │   │   └── profile.ts        ← user benchmark history
│   │   ├── api-client.ts         ← HTTPS client for bench.rapid42.com
│   │   ├── workspace.ts          ← Sandbox setup for agent bench
│   │   ├── runner.ts             ← Model/agent execution harness
│   │   └── types.ts              ← TypeScript types
│   ├── package.json
│   └── tsconfig.json
├── api/                          ← Cloudflare Workers API
│   ├── src/
│   │   ├── index.ts              ← Worker entry + routing
│   │   ├── types.ts              ← D1 types
│   │   ├── utils.ts              ← ID gen, IP hashing
│   │   ├── binary-checks.ts      ← Scoring functions
│   │   └── routes/
│   │       ├── start.ts
│   │       ├── submit.ts
│   │       ├── results.ts
│   │       ├── leaderboard.ts
│   │       ├── compare.ts
│   │       └── checkpoint.ts
│   ├── migrations/
│   ├── wrangler.toml
│   └── package.json
├── judge/                        ← 3-panel judge system
├── docs/                         ← Documentation
└── tasks/                        ← Task definitions (synced to D1)
    ├── model/
    │   ├── code/
    │   ├── writing/
    │   ├── reasoning/
    │   ├── design/
    │   └── safety/
    └── agent/
        ├── coding/
        ├── research/
        ├── ops/
        ├── recovery/
        └── planning/
```

---

## Phases

### Phase 1: Model Bench CLI + API
- [ ] CLI with `model run`, `model results`, `model leaderboard`
- [ ] API endpoints for model bench
- [ ] 3+ real-world tasks per category (15+ total)
- [ ] Binary scoring for all categories
- [ ] bench.rapid42.com leaderboard page

### Phase 2: Agent Bench CLI + API
- [ ] CLI with `agent run`, `agent results`, `agent leaderboard`
- [ ] Sandbox workspace setup/teardown
- [ ] Execution trace capture
- [ ] Setup comparison (config hashing)
- [ ] Agent-specific scoring (completion, tool use, recovery)
- [ ] bench.rapid42.com/agents leaderboard page

### Phase 3: Judge Panel + Polish
- [ ] 3-judge async scoring for both bench types
- [ ] Compare view on web
- [ ] Profile/history page
- [ ] npm publish `@rapid42/agent-bench`

---

## Tech Stack

- **CLI:** TypeScript, Node.js 18+
- **API:** Cloudflare Workers + D1 + Queues
- **Leaderboard:** bench.rapid42.com (Cloudflare Pages or Workers Sites)
- **Judge:** Node.js on Mac mini, shell-exec to model CLIs
- **Package:** `@rapid42/agent-bench` on npm
