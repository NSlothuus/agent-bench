# MEMORY.md — Agent Bench

## Project
**Agent Bench** — Model benchmarking framework for Sh1ft agents

- **API:** https://bench.rapid42.com (Workers)
- **API version:** 4380da73
- **Stack:** Cloudflare Workers + D1 + Workers AI
- **Health check:** bench.rapid42.com responding ✅

## Scoring
- **Claude Sonnet 4.6:** best 8.8, avg 6.9
- **Claude Opus 4.6:** best 8.9, avg 7.1
- specialist_mode tracking implemented (raw vs specialist, migration 0008 applied to remote D1)

## Tasks
5 tasks per run: code, writing, reasoning, editing, math
Scoring: 1–10 per task

## Recent Work
- Specialist mode tracking: CLI, API, migration 0008
- Migration applied to remote D1
- API deployed (version 4380da73)

## Key Files
- `memory/` — daily logs (last: April 7 22:39)
- `DREAMS.md` + `memory/.dreams/` — dreaming

## Configuration
- `memorySearch.sources: ["memory", "sessions"]`
- Session indexing enabled (30-day retention)
