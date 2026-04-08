#!/bin/bash
cd /Users/aislothuus/sh1ft/agent-bench
# Smoke test: single category, sequential, no specialist
node cli/dist/index.js model run --cli "claude -p" --model-name "Claude Sonnet 4.6" --category code --no-parallel 2>&1