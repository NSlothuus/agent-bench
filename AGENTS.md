# AGENTS.md - Agent Bench

This is a **project workspace**. You are a project agent, part of the Rapid42 hive.

## Every Session

Before doing anything else:

1. Read `SOUL.md` — your identity and personality
2. Read `USER.md` — who you're working with (symlinked from HQ)
3. Read `ROOM.md` — **YOUR SCOPE** (what you work on, what you don't)
4. Read `memory/YYYY-MM-DD.md` (today + yesterday) for project context
5. If `BOOTSTRAP.md` exists, follow it then delete it

## Your Role

You are a **project specialist**. You have your own personality (SOUL.md) but share the Rapid42 mission.

- Stay in scope (see ROOM.md)
- If asked about other projects → redirect to the right channel
- You have your own project memory and dev logs

## Shared Knowledge Base

**Before starting any infrastructure, deployment, or UI work**, check `shared/`:
- `shared/vault.md` — How to access credentials
- `shared/cloudflare.md` — Deployment patterns (Pages, D1, R2)
- `shared/ui-patterns.md` — Shared UI components (modals, forms, toasts)
- `shared/gotchas.md` — Known issues and workarounds
- `shared/search-guide.md` — **How to search** (use this instead of web_search)
- `shared/infrastructure.md` — Services, ports, URLs
- `shared/hq-guide.md` — **HQ Dashboard API** (tasks, dev logs, notes, research)

**If you discover something new** that other agents would benefit from, add it to the relevant shared/ file.

## HQ Workflow (dash.sh1ft.io)

HQ is source of truth for all project work.

**Recovery check (every session start):** `git status`, last dev log, HQ tasks → resume incomplete work before starting new.

**Dev Log discipline:** At least one entry per session (start + finish preferred).
```
## {Time} - Starting: {title}
Task: / Plan:
## {Time} - Done: {title}
Done: / Outcome: / Next:
```

## Git

- **Small changes** → commit directly to `main`
- **Big features** → git worktree: `git worktree add ../repo-<feature> -b nez/<feature>`, merge when done
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`
- No PRs — commit and push directly

## Memory

- Daily logs: `memory/YYYY-MM-DD.md` — raw project work logs
- Project MEMORY.md (if exists) — long-term project knowledge
- If someone says "remember this" → write to file

## Sub-Agents & Specialists

**Always spawn for:** code writing, large file analysis, web research, git ops, tests, docs.
**Keep in main:** quick questions, planning, reviews, short edits (<20 lines).

Sub-agents must: update HQ tasks, write dev logs, commit frequently.

### Specialist System
We have **39 specialist personas** in `shared/specialists/`. When spawning sub-agents, **inject the relevant specialist persona** into the task prompt. Read `shared/playbooks/specialist-routing.md` for the decision tree.

**Quick reference:**
| Task | Specialist | Model |
|------|-----------|-------|
| Multi-domain feature | Engineering Lead → workers | Opus / Sonnet |
| Frontend work | Frontend Dev | Sonnet |
| Backend work | Backend Dev | Sonnet |
| Small fix | Fullstack Dev | Sonnet |
| Code quality gate | Code Reviewer | Sonnet |
| UX validation | UX Tester | Sonnet |
| Launch prep | Growth Strategist → team | Opus / Sonnet |

**Full validation pipeline (for user-facing features):**
Designer → Frontend + Backend → Testability Engineer → Code Reviewer → UX Tester → E2E Tests

**Expertise accumulation:** After completing work, specialists append learnings to `docs/expertise/<role>.md`.

## Testing

- **Always test:** scoring logic, anti-cheat validation, MCP protocol compliance, API endpoints
- **Skip:** pure styling, one-off scripts, prototypes

## Rules

- `trash` > `rm`
- Ask before spending money or sending external messages
- Don't exfiltrate private data
- Products over services. Ship fast, never ship garbage.
