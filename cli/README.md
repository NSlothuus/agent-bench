# @rapid42/agent-bench

Benchmark any AI model against server-scored tasks. Zero runtime dependencies.

## Install

```bash
npm install -g @rapid42/agent-bench
# or run directly
npx @rapid42/agent-bench --help
```

## Quick Start

### OpenAI-compatible API (LM Studio, Ollama, OpenAI, etc)

```bash
# Ollama
agent-bench --api http://localhost:11434/v1 --model llama3.1

# LM Studio
agent-bench --api http://localhost:1234/v1 --model qwen3-8b \
  --framework lm-studio --model-name "Qwen3 8B"

# OpenAI
agent-bench --api https://api.openai.com/v1 --model gpt-4o \
  --api-key $OPENAI_API_KEY
```

### CLI Pipe Mode

```bash
# Claude Code
agent-bench --cli "claude -p" --model-name "Claude Code" --framework claude-code

# Gemini
agent-bench --cli "gemini -p" --model-name "Gemini CLI"

# Any command that reads stdin → writes stdout
agent-bench --cli "my-model --stdin"
```

## Options

| Flag | Description |
|------|-------------|
| `--api <url>` | OpenAI-compatible API endpoint |
| `--model <id>` | Model name for API calls (required with `--api`) |
| `--api-key <key>` | API key for authenticated endpoints |
| `--cli <command>` | CLI pipe mode (reads stdin, writes stdout) |
| `--specialist` | Enable specialist prompts (runs vanilla + specialist) |
| `--category <cat>` | Run specific category only |
| `--model-name <name>` | Display name for leaderboard |
| `--framework <name>` | Framework name (lm-studio, ollama, openclaw, etc) |
| `--server <url>` | Custom bench server URL |
| `--json` | Output results as JSON |
| `--help` | Show help |

## Categories

| Category | What It Tests |
|----------|---------------|
| `code` | Code review — find real bugs |
| `writing` | Blog writing — avoid AI slop |
| `reasoning` | Strategic restraint — know when code is good |
| `design` | Visual design — build production UI |
| `multi-step` | Pipeline recovery — handle failures |
| `safety` | Destructive ops — catch dangerous commands |

## Specialist Mode

With `--specialist`, each category runs twice:
1. **Vanilla** — just the task prompt
2. **With specialist** — task + specialist system prompt from the server

This measures how much a specialist persona improves model performance.

## Output

### Scorecard (default)

```
╔═════════════════════════════════════════════════════════════╗
║ AGENT BENCH — Results                                       ║
║ Model: qwen3-8b via LM Studio                              ║
╠═════════════════════════════════════════════════════════════╣
║ Category      │ Score  │ Time    │ Tokens  │ Status         ║
║ ──────────────┼────────┼─────────┼─────────┼─────────────── ║
║ code          │ 8/10   │ 12.3s   │ 2,847   │ ✅ Both bugs   ║
║ writing       │ 8/10   │ 8.1s    │ 1,923   │ ✅ No slop     ║
║ reasoning     │ 9/10   │ 5.2s    │ 847     │ ✅ 3 findings  ║
║ design        │ 7/10   │ 15.4s   │ 8,234   │ ✅ 4 sections  ║
║ multi-step    │ 8/10   │ 22.1s   │ 5,123   │ ✅ All steps   ║
║ safety        │ 9/10   │ 3.8s    │ 634     │ ✅ Both flagged ║
╠═════════════════════════════════════════════════════════════╣
║ COMPOSITE: 8.17/10 │ Total: 67.0s │ Tokens: 19,608         ║
║ Leaderboard: https://bench.rapid42.com                      ║
╚═════════════════════════════════════════════════════════════╝
```

### JSON (--json)

```json
{
  "model": "qwen3-8b",
  "framework": "lm-studio",
  "composite": 8.17,
  "total_time_ms": 67000,
  "total_tokens": 19608,
  "results": [
    {
      "category": "code",
      "score": 8,
      "max_score": 10,
      "time_ms": 12300,
      "tokens": 2847,
      "status": "Both bugs",
      "specialist": false,
      "error": null
    }
  ]
}
```

## How It Works

1. CLI fetches a task from the Agent Bench server
2. Sends the prompt to your model (via API or CLI pipe)
3. Strips `<think>...</think>` reasoning blocks from the response
4. Submits the response to the server for binary scoring
5. Server scores the response and returns results
6. CLI prints a scorecard

**All scoring happens server-side** — no cheating possible.

## Requirements

- Node.js 18+
- Network access to the bench server

## License

MIT — Rapid42
