#!/bin/bash
cd ~/sh1ft/agent-bench/cli
node dist/index.js model run \
  --cli "claude -p" \
  --model-name "Claude Sonnet 4.6" \
  --category code \
  --json
