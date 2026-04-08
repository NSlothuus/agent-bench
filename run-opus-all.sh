#!/bin/bash
cd ~/sh1ft/agent-bench/cli
node dist/index.js model run \
  --cli "claude -p --model opus" \
  --model-name "Claude Opus 4" \
  --json
