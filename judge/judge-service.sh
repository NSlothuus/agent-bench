#!/bin/zsh
# Agent Bench Judge Service — polls D1, judges via Claude Opus, updates scores
set -euo pipefail

LOG_PREFIX="[judge $(date '+%H:%M:%S')]"
echo "$LOG_PREFIX Starting judge run..."

cd ~/sh1ft/agent-bench/api

python3 << 'PYEOF'
import json, subprocess, sys, re, os

def run_wrangler(sql):
    """Run D1 query via wrangler and return parsed results."""
    result = subprocess.run(
        ['wrangler', 'd1', 'execute', 'agent-bench-v2', '--remote', '--command', sql],
        capture_output=True, text=True, timeout=30,
        cwd=os.path.expanduser('~/sh1ft/agent-bench/api')
    )
    output = result.stdout
    try:
        idx = output.index('[')
        data = json.loads(output[idx:])
        return data[0].get('results', []) if data else []
    except (ValueError, json.JSONDecodeError):
        return []

# Get unscored submissions
submissions = run_wrangler(
    "SELECT id, category FROM bench_runs WHERE status = 'scored' AND final_composite IS NULL AND response IS NOT NULL LIMIT 5;"
)

print(f"  Found {len(submissions)} unscored submissions")

if not submissions:
    print("  Nothing to judge. Done.")
    sys.exit(0)

for sub in submissions:
    run_id = sub['id']
    category = sub['category']
    
    # Get the response separately (avoid control char issues in JSON)
    resp_rows = run_wrangler(f"SELECT substr(response, 1, 6000) as resp FROM bench_runs WHERE id = '{run_id}';")
    if not resp_rows:
        print(f"  ❌ {run_id}: Could not fetch response")
        continue
    
    response = resp_rows[0].get('resp', '')
    if not response or len(response) < 50:
        print(f"  ❌ {run_id}: Response too short ({len(response)} chars)")
        continue
    
    print(f"  Judging {run_id} ({category}, {len(response)} chars)...")
    
    # Write prompt to temp file (avoids shell escaping issues)
    prompt = f"""You are a strict benchmark judge. Score this AI model response to a {category} task.

Dimensions (1-10 each):
- correctness: Is the output technically correct?
- judgment: Does it show good decision-making and appropriate restraint?
- quality: Is it well-structured and professional?
- completeness: Does it address all requirements?

RESPONSE:
{response}

Output ONLY valid JSON (no markdown, no explanation):
{{"correctness": N, "judgment": N, "quality": N, "completeness": N}}"""

    prompt_file = f'/tmp/judge-prompt-{run_id}.txt'
    with open(prompt_file, 'w') as f:
        f.write(prompt)
    
    try:
        result = subprocess.run(
            ['claude', '-p', '--output-format', 'text', '--permission-mode', 'bypassPermissions',
             '--model', 'sonnet', prompt],
            capture_output=True, text=True, timeout=120
        )
        
        output = result.stdout.strip()
        
        # Parse JSON
        json_match = re.search(r'\{[^}]*"correctness"[^}]*\}', output, re.DOTALL)
        if json_match:
            scores = json.loads(json_match.group())
            composite = round(
                scores.get('correctness', 5) * 0.3 +
                scores.get('judgment', 5) * 0.3 +
                scores.get('quality', 5) * 0.2 +
                scores.get('completeness', 5) * 0.2,
                1
            )
            
            # Update D1
            scores_json = json.dumps(scores).replace("'", "''")
            run_wrangler(
                f"UPDATE bench_runs SET final_composite = {composite} WHERE id = '{run_id}';"
            )
            print(f"    ✅ {run_id}: {composite}/10 (c={scores.get('correctness')}, j={scores.get('judgment')}, q={scores.get('quality')}, comp={scores.get('completeness')})")
        else:
            print(f"    ❌ {run_id}: Could not parse: {output[:150]}")
    
    except subprocess.TimeoutExpired:
        print(f"    ❌ {run_id}: Timed out")
    except Exception as e:
        print(f"    ❌ {run_id}: {e}")
    
    # Cleanup
    try:
        os.remove(prompt_file)
    except:
        pass

print("  Judge run complete.")
PYEOF

echo "$LOG_PREFIX Done."
