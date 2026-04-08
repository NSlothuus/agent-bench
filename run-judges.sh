#!/bin/zsh
# Run judge panel with correct wrangler path
export PATH="/opt/homebrew/bin:$PATH"
cd ~/sh1ft/agent-bench
bash judge/judge-multi.sh 2>&1
echo "EXIT_CODE: $?"