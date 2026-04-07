#!/bin/zsh
# Agent Bench — 3-Judge Panel Service
# Runs Claude Sonnet, GPT-5.4, and Gemini 3.1 in parallel in parallel per submission.
# Stores per-judge scores + composite in D1.
set -euo pipefail

LOG_PREFIX="[judge-multi $(date '+%H:%M:%S')]"
echo "$LOG_PREFIX Starting 3-judge panel run..."

cd ~/sh1ft/agent-bench/api

python3 << 'PYEOF'
import json, subprocess, sys, re, os, asyncio

WRANGLER_DB = "agent-bench-v2"
WORKING_DIR = os.path.expanduser("~/sh1ft/agent-bench/api")

def run_wrangler(sql, timeout=30):
    result = subprocess.run(
        ["wrangler", "d1", "execute", WRANGLER_DB, "--remote", "--command", sql],
        capture_output=True, text=True, timeout=timeout,
        cwd=WORKING_DIR
    )
    try:
        idx = result.stdout.index("[")
        data = json.loads(result.stdout[idx:])
        return data[0].get("results", []) if data else []
    except (ValueError, json.JSONDecodeError, IndexError):
        return []

# ── Judge configurations ──────────────────────────────────────────────────────

JUDGES = [
    {
        "id": "judge1",
        "name": "Claude Opus",
        "cmd": ["claude", "-p", "--output-format", "json", "--model", "opus", "--no-chrome"],
        "parse_fn": "parse_claude_code",
    },
    {
        "id": "judge2",
        "name": "GPT-5.4",
        "cmd": ["codex", "exec", "--sandbox", "read-only", "-m", "gpt-5.4"],
        "parse_fn": "parse_codex",
    },
    {
        "id": "judge3",
        "name": "Gemini 3.1",
        "cmd": ["gemini", "-o", "json"],
        "parse_fn": "parse_gemini",
    },
]

# ── Parse helpers ─────────────────────────────────────────────────────────────

def parse_claude_code(raw_output):
    """Claude Code -p --output-format json → { correctness, judgment, quality, completeness }"""
    try:
        data = json.loads(raw_output)
        result_str = data.get("result", "")
        if isinstance(result_str, str):
            scores = json.loads(result_str)
        else:
            scores = result_str
        return {
            "correctness": float(scores.get("correctness", 5)),
            "judgment": float(scores.get("judgment", 5)),
            "quality": float(scores.get("quality", 5)),
            "completeness": float(scores.get("completeness", 5)),
        }
    except (json.JSONDecodeError, KeyError) as e:
        return None

def parse_codex(output_file_path):
    """Codex --output-last-message → file contains clean JSON"""
    try:
        with open(output_file_path) as f:
            content = f.read().strip()
        # Try to extract JSON object
        match = re.search(r'\{[^{}]*"correctness"[^{}]*\}', content, re.DOTALL)
        if match:
            scores = json.loads(match.group())
            return {
                "correctness": float(scores.get("correctness", 5)),
                "judgment": float(scores.get("judgment", 5)),
                "quality": float(scores.get("quality", 5)),
                "completeness": float(scores.get("completeness", 5)),
            }
        # Fallback: try direct parse
        scores = json.loads(content)
        return {
            "correctness": float(scores.get("correctness", 5)),
            "judgment": float(scores.get("judgment", 5)),
            "quality": float(scores.get("quality", 5)),
            "completeness": float(scores.get("completeness", 5)),
        }
    except Exception:
        return None

def parse_gemini(output):
    """Gemini CLI -p -o json → stdout contains JSON with response field"""
    try:
        data = json.loads(output.strip())
        # Gemini wraps the actual response in a "response" string field
        result_str = data.get("response", "") if isinstance(data, dict) else str(data)
        if isinstance(result_str, str):
            scores = json.loads(result_str)
        else:
            scores = result_str
        return {
            "correctness": float(scores.get("correctness", 5)),
            "judgment": float(scores.get("judgment", 5)),
            "quality": float(scores.get("quality", 5)),
            "completeness": float(scores.get("completeness", 5)),
        }
    except (json.JSONDecodeError, KeyError, TypeError):
        return None

def composite(scores):
    return round(
        scores["correctness"] * 0.3 +
        scores["judgment"] * 0.3 +
        scores["quality"] * 0.2 +
        scores["completeness"] * 0.2,
        2
    )

# ── Build judge prompt ─────────────────────────────────────────────────────────

JUDGE_PROMPT_TEMPLATE = """You are a strict benchmark judge. Score this AI model response to a {category} task.

Dimensions (1-10 each):
- correctness: Is the output technically correct?
- judgment: Does it show good decision-making and appropriate restraint?
- quality: Is it well-structured and professional?
- completeness: Does it address all requirements?

RESPONSE:
{response}

Output ONLY valid JSON (no markdown, no explanation):
{{"correctness": N, "judgment": N, "quality": N, "completeness": N}}"""

# ── Execute single judge ───────────────────────────────────────────────────────

def judge_claude(judge_cfg, prompt, timeout=120):
    """Execute Claude Code judge (Sonnet or Opus)."""
    try:
        result = subprocess.run(
            judge_cfg["cmd"],
            input=prompt,
            capture_output=True, text=True, timeout=timeout
        )
        return parse_claude_code(result.stdout)
    except subprocess.TimeoutExpired:
        return None
    except Exception:
        return None

def judge_codex(judge_cfg, prompt, timeout=180):
    """Execute Codex / GPT judge."""
    import uuid
    output_file = f"/tmp/codex-judge-{uuid.uuid4().hex}.json"
    cmd = list(judge_cfg["cmd"]) + ["--output-last-message", output_file, prompt]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        # Debug: always log first 200 chars of stderr when scores is None
        scores = parse_codex(output_file)
        if scores is None:
            stderr_snippet = result.stderr[:300] if result.stderr else "(empty)"
            stdout_snippet = result.stdout[:200] if result.stdout else "(empty)"
            file_content = "(no file)"
            if os.path.exists(output_file):
                with open(output_file) as f:
                    file_content = f.read()[:200]
            print(f"    [GPT-5.4 debug] rc={result.returncode} file={repr(file_content)} stderr={repr(stderr_snippet)}")
        return scores
    except subprocess.TimeoutExpired:
        print(f"    [codex timed out after {timeout}s]")
        return None
    except Exception as e:
        print(f"    [codex exception: {e}]")
        return None
    finally:
        try:
            os.remove(output_file)
        except FileNotFoundError:
            pass

def judge_gemini(judge_cfg, prompt, timeout=300):
    """Execute Gemini judge."""
    try:
        result = subprocess.run(
            judge_cfg["cmd"],
            input=prompt,
            capture_output=True, text=True, timeout=timeout
        )
        scores = parse_gemini(result.stdout)
        if scores is None:
            snippet = result.stdout[:200] if result.stdout else "(empty)"
            print(f"    [Gemini debug] rc={result.returncode} stdout={repr(snippet)}")
        return scores
    except subprocess.TimeoutExpired:
        print(f"    [Gemini timed out after {timeout}s]")
        return None
    except Exception as e:
        print(f"    [Gemini exception: {e}]")
        return None

def call_judge(judge_cfg, prompt):
    judge_id = judge_cfg["id"]
    if judge_id == "judge1":
        return judge_claude(judge_cfg, prompt)
    elif judge_id == "judge2":
        return judge_codex(judge_cfg, prompt)
    elif judge_id == "judge3":
        return judge_gemini(judge_cfg, prompt)
    else:
        return judge_codex(judge_cfg, prompt)

# ── Fetch unscored submissions ─────────────────────────────────────────────────

submissions = run_wrangler(
    "SELECT id, category, substr(response, 1, 6000) as response "
    "FROM bench_runs "
    "WHERE status = 'scored' AND judge_scores IS NULL AND response IS NOT NULL AND length(response) > 50 "
    "LIMIT 5;"
)

print(f"  Found {len(submissions)} unscored submissions")

if not submissions:
    print("  Nothing to judge. Done.")
    sys.exit(0)

# ── Process each submission ────────────────────────────────────────────────────

for sub in submissions:
    run_id = sub["id"]
    category = sub.get("category", "unknown")
    response = sub.get("response", "")
    prompt = JUDGE_PROMPT_TEMPLATE.format(category=category, response=response)

    print(f"\n  Judging {run_id} ({category}, {len(response)} chars)...")
    print(f"  Running 3 judges in parallel: Claude Opus, GPT-5.4, Gemini 3.1")

    results = {}  # judge_id → { model, scores, composite }

    # Run all 3 judges in parallel using threads
    import concurrent.futures

    def run_all_judges():
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = {
                executor.submit(call_judge, judge_cfg, prompt): judge_cfg
                for judge_cfg in JUDGES
            }
            for future in concurrent.futures.as_completed(futures, timeout=180):
                judge_cfg = futures[future]
                try:
                    scores = future.result()
                    judge_id = judge_cfg["id"]
                    if scores:
                        c = composite(scores)
                        results[judge_id] = {
                            "name": judge_cfg["name"],
                            "scores": scores,
                            "composite": c,
                        }
                        print(f"    {judge_cfg['name']}: {c}/10 "
                              f"(c={scores['correctness']}, j={scores['judgment']}, "
                              f"q={scores['quality']}, comp={scores['completeness']})")
                    else:
                        print(f"    {judge_cfg['name']}: ❌ parse failed")
                except Exception as e:
                    print(f"    {futures[future]['name']}: ❌ {e}")

    try:
        run_all_judges()
    except Exception as e:
        print(f"  ⚠️ Parallel execution error: {e}")
        # Fallback to sequential
        for judge_cfg in JUDGES:
            scores = call_judge(judge_cfg, prompt)
            if scores:
                c = composite(scores)
                results[judge_cfg["id"]] = {"name": judge_cfg["name"], "scores": scores, "composite": c}
                print(f"    {judge_cfg['name']}: {c}/10")

    if not results:
        print(f"  ❌ {run_id}: All judges failed")
        continue

    # Aggregate: median composite of successful judges
    composites = [r["composite"] for r in results.values()]
    final_composite = round(sum(composites) / len(composites), 2)

    # Store in D1
    judge_scores_json = json.dumps(results, separators=(",", ":"))
    judge_scores_escaped = judge_scores_json.replace("'", "''")

    run_wrangler(
        f"UPDATE bench_runs "
        f"SET judge_scores = '{judge_scores_escaped}', "
        f"final_composite = {final_composite} "
        f"WHERE id = '{run_id}';"
    )

    print(f"  ✅ {run_id}: final_composite={final_composite}/10 "
          f"(from {len(results)} judges)")

print("\n  Judge panel run complete.")
PYEOF

echo "$LOG_PREFIX Done."
