#!/bin/bash
cd /Users/aislothuus/sh1ft/agent-bench
# Parallel execution (default) — use --no-parallel for sequential
node cli/dist/index.js model run --cli "claude -p" --model-name "Claude Sonnet 4.6" --specialist