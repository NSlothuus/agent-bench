# Agent Bench

Real-world benchmarks for AI models and agent systems. CLI-driven, server-side scoring, no cheating.

## Two Benchmarks

### 🧠 Model Bench — Raw Intelligence
Test what the model *can do*. Real tasks, not toy puzzles.

```bash
npx @rapid42/agent-bench model run
npx @rapid42/agent-bench model run --category code
npx @rapid42/agent-bench model leaderboard
```

**Categories:** `code` · `writing` · `reasoning` · `design` · `safety`

### 🤖 Agent Bench — System Performance
Test the *full stack*: model + tools + config + skills + memory. Compare setups, not just models.
No sandbox — your agent runs the benchmark from inside its own environment.

```bash
# Via CLI
npx @rapid42/agent-bench agent run --cli "claude -p" --framework claude-code
npx @rapid42/agent-bench agent run --cli "openclaw run" --framework openclaw
npx @rapid42/agent-bench agent leaderboard

# Or the agent calls the API directly:
#   POST /api/bench/start {"bench_type":"agent"} → get task
#   Agent works on task using its full capabilities
#   POST /api/bench/submit {"run_id":"...","response":"..."} → get score
```

**Categories:** `coding` · `research` · `ops` · `recovery` · `planning`

## How It Works

**Model Bench:**
```
CLI sends prompt to model → model responds → CLI submits for scoring
```

**Agent Bench:**
```
Agent fetches task → works on it using real tools & environment → submits for scoring
```

## Why Agent Bench?

Everyone benchmarks models in isolation. Nobody measures how good your agent *system* is.

- **Same model, different setups** → Who performs better?
  - OpenClaw with custom skills vs vanilla Claude Code
  - Sonnet with tuned prompts vs Opus with defaults
- **Same setup, different models** → Which model fits best?
  - Your config with Sonnet vs Opus vs GPT-4o
- **Real-world tasks** → Not trivia. Actual work.
  - Code review with real bugs and red herrings
  - Multi-step workflows with real failure modes
  - System design with real constraints

## Commands

```bash
# Model Bench (CLI wraps a model)
agent-bench model run --api http://localhost:11434/v1 --model llama3.1
agent-bench model run --cli "claude -p" --model-name "Claude Sonnet"
agent-bench model run --category code
agent-bench model results --run <id>
agent-bench model leaderboard

# Agent Bench (your agent runs it from inside)
agent-bench agent run --cli "claude -p" --framework claude-code
agent-bench agent run --cli "openclaw run" --framework openclaw --category coding
agent-bench agent results --run <id>
agent-bench agent leaderboard

# General
agent-bench compare <run-a> <run-b>        # Compare two runs
agent-bench profile                        # Your history
```

## Scoring

### Instant Binary Checks
- **Code:** Found bug #1? #2? False positives?
- **Safety:** Caught the DROP TABLE? Flagged rm -rf?
- **Writing:** AI-slop phrase count?
- **Reasoning:** Unnecessary suggestions on good code?

### Judge Panel (async)
3-judge panel scores on: Correctness · Quality · Judgment · Completeness

### Agent-Specific Metrics
Task completion · Tool efficiency · Error recovery · Autonomy · Token usage

## Anti-Cheat

1. Tasks served from server — can't preview prompts
2. Grading keys never leave the server
3. Binary checks run server-side
4. Time limits enforced
5. Execution trace analysis (agent bench)
6. Task rotation — 3+ tasks per category
7. Rate limiting — 10 runs/hour

## Development

### CLI
```bash
cd cli
npm install
npm run build
npm run dev
```

### API (Cloudflare Workers)
```bash
cd api
npm install
npm run migrate:local
npm run seed:local
npm run dev
```

### Deploy
```bash
cd api
npm run migrate:remote
npm run deploy
```

## Project Structure

```
agent-bench/
├── cli/                  ← CLI package (@rapid42/agent-bench)
├── api/                  ← Cloudflare Workers API + D1
├── judge/                ← 3-panel judge system
├── tasks/                ← Task definitions
│   ├── model/            ← Model bench tasks (code, writing, reasoning, design, safety)
│   └── agent/            ← Agent bench tasks (coding, research, ops, recovery, planning)
└── docs/                 ← Documentation
```

## Leaderboards

- **Models:** [bench.rapid42.com/models](https://bench.rapid42.com/models)
- **Agents:** [bench.rapid42.com/agents](https://bench.rapid42.com/agents)

## License

MIT — Rapid42
