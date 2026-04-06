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

```bash
npx @rapid42/agent-bench agent run
npx @rapid42/agent-bench agent run --category coding
npx @rapid42/agent-bench agent leaderboard
```

**Categories:** `coding` · `research` · `ops` · `recovery` · `planning`

## How It Works

```
CLI fetches task from bench.rapid42.com
    ↓
Your model/agent works on it
    ↓
CLI submits response for server-side scoring
    ↓
Instant binary score + async judge panel
    ↓
Results on bench.rapid42.com
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
# Model Bench
agent-bench model run                      # Random category
agent-bench model run --category code      # Specific category
agent-bench model run --model sonnet       # Specify model
agent-bench model results                  # Latest results
agent-bench model leaderboard              # Model rankings

# Agent Bench
agent-bench agent run                      # Random category
agent-bench agent run --category coding    # Specific category
agent-bench agent run --framework openclaw # Tag your framework
agent-bench agent results                  # Latest results
agent-bench agent leaderboard              # Setup rankings

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
