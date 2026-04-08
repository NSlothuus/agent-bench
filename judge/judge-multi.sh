#!/bin/zsh
# Agent Bench — 3-Judge Panel (Claude Opus, GPT-5.4, Gemini 3.1)
# Runs in parallel, skips unavailable judges, processes up to 50 per batch.
set -euo pipefail

LOG_PREFIX="[judge-multi $(date '+%H:%M:%S')]"
echo "$LOG_PREFIX Starting 3-judge panel run..."

cd ~/sh1ft/agent-bench/api

python3 << 'PYEOF'
import json, subprocess, sys, re, os, time, shutil, concurrent.futures

WRANGLER_DB = "agent-bench-v2"
WORKING_DIR = os.path.expanduser("~/sh1ft/agent-bench/api")
MAX_PER_RUN = 50
MAX_RETRIES = 2
JUDGE_TIMEOUT = {"judge1": 120, "judge2": 180, "judge3": 300}

# ── Judge configurations ──────────────────────────────────────────────────────

def check_binary(cmd):
    """Return True if the binary exists and is executable."""
    return shutil.which(cmd[0]) is not None

JUDGES = [
    {
        "id": "judge1",
        "name": "Claude Opus",
        "cmd": ["claude", "-p", "--output-format", "json", "--model", "opus"],
        "parse_fn": "parse_claude_code",
        "available": check_binary(["claude"]),
    },
    {
        "id": "judge2",
        "name": "GPT-5.4",
        "cmd": ["codex", "exec", "--sandbox", "read-only"],
        "parse_fn": "parse_codex",
        "available": check_binary(["codex"]),
    },
    {
        "id": "judge3",
        "name": "Gemini 3.1",
        "cmd": ["gemini", "-o", "json"],
        "parse_fn": "parse_gemini",
        "available": check_binary(["gemini"]),
    },
]

available_judges = [j for j in JUDGES if j["available"]]
unavailable = [j["name"] for j in JUDGES if not j["available"]]

if unavailable:
    print(f"  ⚠️  Skipping unavailable judges: {', '.join(unavailable)}")
if not available_judges:
    print("  FATAL: No judge binaries found. Install at least one of: claude, codex, gemini")
    sys.exit(1)

print(f"  ✅ Active judges: {[j['name'] for j in available_judges]}")

# ── Parse helpers ─────────────────────────────────────────────────────────────

def parse_claude_code(raw):
    try:
        data = json.loads(raw)
        result_str = data.get("result", "")
        if isinstance(result_str, str):
            scores = json.loads(result_str)
        else:
            scores = result_str or {}
        return {
            "correctness": float(scores.get("correctness", 5)),
            "judgment": float(scores.get("judgment", 5)),
            "quality": float(scores.get("quality", 5)),
            "completeness": float(scores.get("completeness", 5)),
        }
    except (json.JSONDecodeError, KeyError, TypeError, ValueError):
        return None

def parse_json_scores(raw):
    """Try to extract a JSON object with correctness from any text."""
    raw = raw.strip()
    for try_json in [raw, re.search(r'\{[^}]*"correctness"[^}]*\}', raw, re.DOTALL)?.group()]:
        if try_json:
            try:
                scores = json.loads(try_json)
                if "correctness" in scores:
                    return {
                        "correctness": float(scores.get("correctness", 5)),
                        "judgment": float(scores.get("judgment", 5)),
                        "quality": float(scores.get("quality", 5)),
                        "completeness": float(scores.get("completeness", 5)),
                    }
            except (json.JSONDecodeError, TypeError, ValueError):
                pass
    return None

def parse_codex(output_file_path):
    try:
        if not os.path.exists(output_file_path):
            return None
        with open(output_file_path) as f:
            content = f.read().strip()
        return parse_json_scores(content)
    except Exception:
        return None

def parse_gemini(raw):
    try:
        data = json.loads(raw.strip())
        result_str = data.get("response", "") if isinstance(data, dict) else str(data)
        if isinstance(result_str, str):
            scores = json.loads(result_str)
        else:
            scores = result_str or {}
        return {
            "correctness": float(scores.get("correctness", 5)),
            "judgment": float(scores.get("judgment", 5)),
            "quality": float(scores.get("quality", 5)),
            "completeness": float(scores.get("completeness", 5)),
        }
    except (json.JSONDecodeError, KeyError, TypeError, ValueError):
        return None

def composite(scores):
    return round(
        scores["correctness"] * 0.3 +
        scores["judgment"] * 0.3 +
        scores["quality"] * 0.2 +
        scores["completeness"] * 0.2,
        2
    )

# ── Judge executors ────────────────────────────────────────────────────────────

def judge_claude(judge_cfg, prompt):
    for attempt in range(MAX_RETRIES):
        try:
            result = subprocess.run(
                judge_cfg["cmd"],
                input=prompt,
                capture_output=True, text=True, timeout=JUDGE_TIMEOUT["judge1"]
            )
            scores = parse_claude_code(result.stdout)
            if scores:
                return scores
            print(f"      [attempt {attempt+1}] parse failed")
        except subprocess.TimeoutExpired:
            print(f"      [attempt {attempt+1}] timed out")
        except Exception as e:
            print(f"      [attempt {attempt+1}] error: {e}")
        if attempt < MAX_RETRIES - 1:
            time.sleep(2 ** attempt)
    return None

def judge_codex(judge_cfg, prompt):
    import uuid
    output_file = f"/tmp/codex-judge-{uuid.uuid4().hex}.json"
    for attempt in range(MAX_RETRIES):
        try:
            cmd = list(judge_cfg["cmd"]) + ["--output-last-message", output_file, prompt]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=JUDGE_TIMEOUT["judge2"])
            scores = parse_codex(output_file)
            if scores:
                try: os.remove(output_file)
                except: pass
                return scores
            print(f"      [attempt {attempt+1}] parse failed")
            # Log debug info
            snippet = result.stdout[:200] if result.stdout else "(empty)"
            file_content = "(no file)"
            if os.path.exists(output_file):
                with open(output_file) as f:
                    file_content = f.read()[:200]
            print(f"      debug: rc={result.returncode} file={file_content!r} stdout={snippet!r}")
        except subprocess.TimeoutExpired:
            print(f"      [attempt {attempt+1}] timed out")
        except Exception as e:
            print(f"      [attempt {attempt+1}] error: {e}")
        if attempt < MAX_RETRIES - 1:
            time.sleep(2 ** attempt)
    try: os.remove(output_file)
    except: pass
    return None

def judge_gemini(judge_cfg, prompt):
    for attempt in range(MAX_RETRIES):
        try:
            result = subprocess.run(
                judge_cfg["cmd"],
                input=prompt,
                capture_output=True, text=True, timeout=JUDGE_TIMEOUT["judge3"]
            )
            scores = parse_gemini(result.stdout)
            if scores:
                return scores
            print(f"      [attempt {attempt+1}] parse failed")
        except subprocess.TimeoutExpired:
            print(f"      [attempt {attempt+1}] timed out")
        except Exception as e:
            print(f"      [attempt {attempt+1}] error: {e}")
        if attempt < MAX_RETRIES - 1:
            time.sleep(2 ** attempt)
    return None

JUDGE_CALLERS = {
    "judge1": judge_claude,
    "judge2": judge_codex,
    "judge3": judge_gemini,
}

# ── Wrangler helper ─────────────────────────────────────────────────────────────

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

# ── Judge prompt template ───────────────────────────────────────────────────────

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

# ── Main ────────────────────────────────────────────────────────────────────────

submissions = run_wrangler(
    f"SELECT id, category, substr(response, 1, 8000) as response "
    f"FROM bench_runs "
    f"WHERE status = 'scored' AND judge_scores IS NULL "
    f"AND response IS NOT NULL AND length(response) > 50 "
    f"LIMIT {MAX_PER_RUN};"
)

print(f"  Found {len(submissions)} unscored submissions (max {MAX_PER_RUN}/run)")

if not submissions:
    print("  Nothing to judge. Done.")
    sys.exit(0)

judged = 0
skipped = 0

for idx, sub in enumerate(submissions):
    run_id = sub["id"]
    category = sub.get("category", "unknown")
    response = sub.get("response", "")

    if not response or len(response) < 50:
        print(f"  [{idx+1}] {run_id}: response too short ({len(response)} chars), skipping")
        skipped += 1
        continue

    prompt = JUDGE_PROMPT_TEMPLATE.format(category=category, response=response)
    print(f"\n  [{idx+1}/{len(submissions)}] Judging {run_id} ({category}, {len(response)} chars)...")
    print(f"  Running {len(available_judges)} judges in parallel: "
          f"{', '.join(j['name'] for j in available_judges)}")

    results = {}  # judge_id → { name, scores, composite }

    # Run all available judges in parallel using threads
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(available_judges)) as executor:
        futures = {
            executor.submit(JUDGE_CALLERS[j["id"]], j, prompt): j
            for j in available_judges
        }
        for future in concurrent.futures.as_completed(futures, timeout=max(JUDGE_TIMEOUT.values()) * MAX_RETRIES + 10):
            judge_cfg = futures[future]
            try:
                scores = future.result()
                if scores:
                    c = composite(scores)
                    results[judge_cfg["id"]] = {
                        "name": judge_cfg["name"],
                        "scores": scores,
                        "composite": c,
                    }
                    print(f"    {judge_cfg['name']}: {c}/10 "
                          f"(c={scores['correctness']}, j={scores['judgment']}, "
                          f"q={scores['quality']}, comp={scores['completeness']})")
                else:
                    print(f"    {judge_cfg['name']}: ❌ all attempts parse failed")
            except Exception as e:
                print(f"    {judge_cfg['name']}: ❌ {e}")

    if not results:
        print(f"  ❌ {run_id}: all judges failed — will retry on next run")
        skipped += 1
        continue

    # Aggregate: mean of successful judges (at least 1 succeeded)
    composites = [r["composite"] for r in results.values()]
    final_composite = round(sum(composites) / len(composites), 2)

    # Store in D1 — use parameterized-safe update
    judge_scores_json = json.dumps(results, separators=(",", ":")).replace("'", "''")
    run_wrangler(
        f"UPDATE bench_runs "
        f"SET judge_scores = '{judge_scores_json}', "
        f"final_composite = {final_composite} "
        f"WHERE id = '{run_id}';"
    )

    print(f"  ✅ {run_id}: final_composite={final_composite}/10 "
          f"(from {len(results)} judges)")
    judged += 1

    time.sleep(0.3)  # gentle rate limit

print(f"\n  ✅ Judged: {judged} | Skipped: {skipped} | Total: {len(submissions)}")
print("  Judge panel run complete.")
PYEOF

echo "$LOG_PREFIX Done."
