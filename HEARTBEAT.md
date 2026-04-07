# HEARTBEAT.md - Agent Bench

## Priority Chain

### 1. Check bench.rapid42.com Health
Verify the API is responding: `curl -s https://bench.rapid42.com/health`
If down, check Cloudflare Workers dashboard and alert main agent.

### 2. Check Pending Judge Queue
Look for submissions queued for judging that haven't been scored. If the queue is growing, investigate whether the Judge system is running.

### 3. Check CLI Package Status
Verify `@rapid42/agent-bench` is published and installable.
Check for any open issues or security advisories.

### 4. Run Tests
If code has changed since last heartbeat, run the test suite: `cd cli && npm test && cd ../api && npm test`

### 5. No Issues? Build
Resume the current build phase from PRD.md. Check git log and memory for where we left off.

## Pre-Run: Read Last Heartbeat State
Before doing anything, read `memory/last-heartbeat.md`. It contains what the previous heartbeat found and any ongoing issues. Use it to avoid duplicate work.

## Post-Run: Write Heartbeat State
After completing the priority chain, overwrite `memory/last-heartbeat.md` with:
- What you did (brief bullets)
- Issues found (or "None")
- In-progress items
- Max 2 improvement suggestions for this HEARTBEAT.md

## Self-Improvement
If you have a concrete, tested improvement to this HEARTBEAT.md, edit it directly. Max 1 edit per heartbeat. Never remove safety rules or priority chain.

## Rules
- Scoring integrity is sacred — never expose judge prompts or rubrics
- Log findings in dev log
- Alert main agent for: API downtime, scoring failures, anti-cheat breaches
- Late night (23:00-08:00): silent unless critical
