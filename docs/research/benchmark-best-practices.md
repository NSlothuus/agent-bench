# Research: AI Benchmark Design Best Practices

**Date:** 2026-04-06
**Confidence:** High (3 backends, 20+ sources, strong cross-reference)

## Executive Summary

We researched how SWE-bench, Chatbot Arena, AgentBench, WebArena, Terminal-Bench, and others are designed. The key insight: most popular benchmarks are actually flawed. The Agentic Benchmark Checklist (ABC) scored SWE-bench Verified only 60.3/100 despite being the most-cited benchmark. NIST found cheating rates of 0.1-4.8% across major benchmarks. The best practices are clear but rarely followed together.

## Key Principles to Adopt

### 1. Task Validity + Outcome Validity (ABC Framework)
- **Task Validity:** Task is solvable if and only if the agent has the target capability
- **Outcome Validity:** Evaluation correctly indicates whether the task was solved
- Most benchmarks fail on outcome validity (SWE-bench uses insufficient test cases, TAU-bench counts empty responses as successful)

### 2. Real-World Tasks Over Synthetic
- SWE-bench pulls from actual GitHub issues — real bugs, real code
- Terminal-Bench uses real CLI workflows (compiling, configuring, error recovery)
- Synthetic benchmarks miss nuance of real user behavior
- Best practice: tasks that mirror actual developer work

### 3. Anti-Cheat Is Non-Negotiable
**NIST identified two cheating categories:**
- **Solution contamination:** Models accessing answers via internet/package managers
- **Grader gaming:** Models exploiting scoring system gaps

**Best practices from NIST + ABC:**
- Server-side scoring (grading keys never leave server)
- Limit internet access during evaluations
- Transcript/execution trace review
- Task rotation + periodic refresh
- Rate limits on submissions
- Red-team audits of scoring functions

### 4. Measure Cost + Efficiency, Not Just Accuracy
- HAL (Princeton) addresses the gap: most benchmarks only measure accuracy
- Track: tokens used, time elapsed, cost per task, tool calls made
- Efficiency score = quality / cost — this is what matters in production

### 5. Evaluate the Full Stack (Scaffold + Model)
- SWE-bench explicitly evaluates both the agentic harness AND the foundation model
- Agent Bench should compare setups, not just models — this is our differentiator
- Config hashing to enable setup-vs-setup comparison

### 6. Process-Based Evaluation
- Don't just check if the final answer is right
- Evaluate HOW the agent got there: tool selection, error recovery, unnecessary steps
- Binary checks for specific behaviors + holistic judge scoring

### 7. Contamination Resistance
- SWE-bench Pro uses copyleft/proprietary code as legal barriers
- LiveSWEBench continuously refreshes tasks
- Our approach: server-side task serving, task rotation, periodic new tasks

### 8. Multi-Run Statistical Rigor
- τ-Bench tests reliability over repeated trials
- Single-run scores are noisy — multiple runs give confidence intervals
- Agent benchmarks should report consistency, not just peak performance

## What Makes Us Different

Nobody else does setup-vs-setup comparison for agent systems. The closest is SWE-bench's dual reporting (scaffold + model), but they don't have a leaderboard for setups. Our Agent Bench fills this gap:
- Same model, different setups → who performs better?
- Same setup, different models → which model fits your tools?
- Cost-efficiency comparison → who gets the job done cheapest?

## Sources (Top 14)

| # | Title | Authority | Date |
|---|-------|-----------|------|
| 1 | ABC - Agentic Benchmark Checklist (Zhu et al.) | Highest | 2025-07 |
| 2 | NIST/CAISI: Cheating On AI Agent Evaluations | Highest | 2025-12 |
| 3 | SWE-Bench Pro (Scale AI) | Highest | 2025-09 |
| 4 | Evaluation and Benchmarking of LLM Agents Survey | Highest | 2025-07 |
| 5 | Terminal-Bench | High | 2026-01 |
| 6 | SkillsBench | High | 2026-02 |
| 7 | HAL Harness (Princeton) | High | unknown |
| 8 | SWE-bench Comprehensive Review | High | 2025-12 |
| 9 | Epoch AI SWE-bench Verified Tracker | High | unknown |
| 10 | Synthetic vs Real-World Benchmarks (Label Studio) | Medium-high | 2025-12 |
| 11 | Everybody Is Cheating: Fixing AI Benchmarks | Medium-high | 2025-05 |
| 12 | 8 Benchmarks Shaping Next-Gen AI Agents | Medium-high | 2025-11 |
| 13 | Evaluating AI Agents in Practice (InfoQ) | Medium-high | 2026-03 |
| 14 | 10 AI Agent Benchmarks (Evidently AI) | Medium-high | unknown |
