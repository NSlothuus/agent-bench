-- Migration 0010: Expand design and multi-step categories
-- 3 new design tasks (now 6 total) + 3 new multi-step tasks (now 4 total)
-- Also adds 3 new binary check functions for comprehensive scoring

-- ═══════════════════════════════════════════════════════════════════════════
-- NEW BINARY CHECK FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════
-- These are added to binary-checks.ts separately via code edit.
-- This migration just adds the tasks; the check functions are in api/src/binary-checks.ts

-- ═══════════════════════════════════════════════════════════════════════════
-- DESIGN TASKS
-- ═══════════════════════════════════════════════════════════════════════════

-- Task 1/3: API Design — Collaborative Whiteboard
-- Tests: REST endpoint design, WebSocket event design, conflict resolution,
--        authentication, error handling, pagination, rate limiting
INSERT OR REPLACE INTO bench_tasks (id, bench_type, category, title, prompt, grading_key, binary_check_fn, active, version)
VALUES (
  'design-api-collab',
  'model',
  'design',
  'API Design — Collaborative Whiteboard',
  '# Task: Design a Collaborative Whiteboard API

## Context

You're designing the API for **Miro clone** — a real-time collaborative whiteboard SaaS. Users can create boards, draw shapes, add text, and collaborate simultaneously with live cursors. Multiple users editing the same shape must not overwrite each other's changes.

## Requirements

Design the complete REST and WebSocket API for this product.

### Core Resources
- Users (signup, auth, profile)
- Organizations (team management, billing)
- Boards (CRUD, sharing, permissions)
- Elements (shapes, text, images, connectors on a board)
- Comments (threads on elements)
- Real-time presence (who is viewing which board)

### Technical Constraints
- 50ms maximum latency for real-time sync
- Offline support: changes queue locally and sync when reconnected
- Optimistic UI: client applies changes immediately, reconciles with server
- Conflict resolution: last-write-wins for text, operational transform for shapes
- 10,000 boards per organization, 100 elements per board average, 50 active users per board peak
- Webhook support for board events (element created, user joined, etc.)

### Deliverables

1. **REST API Reference** — For each resource:
   - All endpoints with HTTP methods
   - Request/response schemas (JSON)
   - Authentication method
   - Error response format and status codes
   - Rate limiting approach

2. **WebSocket Protocol** — For real-time features:
   - Connection and authentication flow
   - Event types (inbound and outbound)
   - Message format
   - Reconnection and offline-sync protocol

3. **Conflict Resolution Design**:
   - How concurrent edits are handled
   - Shape vs text conflict strategies
   - Conflict UI indicators

4. **Scalability Notes**:
   - How you'd handle 10K boards/org
   - CDN strategy for assets
   - Database sharding/partitioning approach

5. **What you'd cut for v1** — Realistically, what gets deprioritized?',
  'HIDDEN',
  'binary_check_api_design',
  1,
  1
);

-- Task 2/3: Incident Postmortem
-- Tests: Analytical writing, root cause analysis, blameless culture,
--        action item specificity, timeline reconstruction
INSERT OR REPLACE INTO bench_tasks (id, bench_type, category, title, prompt, grading_key, binary_check_fn, active, version)
VALUES (
  'design-incident-postmortem',
  'model',
  'design',
  'Incident Postmortem — Payment Processing Outage',
  '# Task: Write an Incident Postmortem

## The Incident

**Date:** March 15, 2024  
**Duration:** 2h 47m (14:23 UTC — 17:10 UTC)  
**Impact:** 12% of payment transactions failed. Affected ~3,400 customers. Total failed transactions: ~8,200. Revenue impact: ~$240K (estimated).

**Timeline (from incident log):**
```
14:23 — Monitoring alerts fire: payment_success_rate drops from 99.2% to 87.1%
14:25 — On-call engineer paged
14:28 — Engineer joins incident bridge, begins investigation
14:31 — First hypothesis: Stripe API outage. Checked status.stripe.com — all green.
14:35 — Payment team notified. 3 engineers join bridge.
14:40 — Observed: failures concentrated in subscription_renewal transactions (recurring billing)
14:44 — Checked recent deployments: payment-service v2.14.1 deployed at 13:00 UTC (1h 23m before incident)
14:47 — Rollback of payment-service v2.14.1 initiated
14:52 — Rollback complete. Success rate still at 87%.
14:55 — Rollback did not fix. Continuing investigation.
15:02 — Deep dive: failures all have error code PAYMENT_DECLINED_CARD_BALANCE
15:08 — Discovered: bank card balance check microservice (balance-checker) deployed at 12:30 UTC
         New version added a cache layer (Redis) with 60-second TTL
         Stale balance data caused decline of valid cards
15:15 — balance-checker rolled back to v1.9.3
15:22 — Success rate returns to 99.1%
16:00 — Post-incident monitoring confirms stability
17:10 — Incident declared resolved
```

**Known contributing factors:**
- Two separate services deployed within 90 minutes of each other
- No integration test environment caught the Redis TTL issue
- On-call rotation gap: senior engineer was OOO, junior engineer primary

## Your Task

Write a proper incident postmortem. This is a **blameless** postmortem — the goal is systemic improvement, not finger-pointing.

## Required Sections

### 1. Summary (3-5 sentences)
High-level: what happened, impact, duration, root cause in one sentence.

### 2. Impact
- Number of affected customers (approximate)
- Revenue impact
- Duration
- Services affected

### 3. Timeline
Reconstruct the full timeline with UTC timestamps. Add any missing details that a thorough timeline would include (what was observed vs. concluded at each step).

### 4. Root Cause Analysis
What actually caused the incident? Be specific. Trace the causal chain.

### 5. Contributing Factors
What systemic issues made this worse or harder to detect? (process, tooling, architecture, team)

### 6. Detection & Response
- Was the detection fast enough? What was the 14:23 → 14:25 gap?
- Was the escalation correct?
- Was communication adequate?

### 7. Action Items
Minimum 5 concrete, time-bound action items with owners. Each must be a specific, measurable outcome — not vague goals.

### 8. What Went Well
Honest assessment of what worked in the response.

## Style Guidelines
- Blameless tone throughout — no "engineer X made a mistake"
- Specific, not vague — "the 60-second Redis TTL caused stale balance data" not "a caching issue"
- Action items have owners and timeframes
- Technical accuracy is critical — don't invent facts not in the timeline',
  'HIDDEN',
  'binary_check_incident_postmortem',
  1,
  1
);

-- Task 3/3: SLO and Alerting Design
-- Tests: SLO definition, error budget math, SLI selection, alerting thresholds,
--        on-call runbooks, dashboard design
INSERT OR REPLACE INTO bench_tasks (id, bench_type, category, title, prompt, grading_key, binary_check_fn, active, version)
VALUES (
  'design-slo',
  'model',
  'design',
  'SLO and Alerting Design — SaaS Analytics Platform',
  '# Task: Design SLOs and Alerting for a SaaS Analytics Platform

## Context

You're the platform engineer at **Metriq** — a B2B SaaS analytics platform. Customers pay based on data volume and seat count. They expect 99.5% availability and sub-2s dashboard load times. Your CEO just told you "we need proper SLOs before the next enterprise deal closes in 3 weeks."

You need to:
1. Define SLOs that are ambitious but achievable
2. Design the SLIs that measure them
3. Set alerting thresholds that catch degradation before it becomes an outage
4. Create a framework for error budgets
5. Define on-call runbook triggers

## The System

**Architecture:**
- API tier: Node.js REST API on Kubernetes (50 pods, autoscaling)
- Data pipeline: Kafka → Flink → ClickHouse
- Storage: PostgreSQL (metadata), ClickHouse (analytics data), Redis (sessions, rate limiting)
- CDN: CloudFront for static assets
- Auth: JWT with 1-hour expiry, refresh tokens

**Key user journeys:**
1. Dashboard load (primary product) — user opens a dashboard, data queries run against ClickHouse
2. Report generation — async job, user waits, gets notified when done
3. Data ingestion — customer's data flows through Kafka → Flink → ClickHouse
4. User management — SSO, seat management, billing

**Current state:**
- No formal SLOs
- PagerDuty alerts fire on anything red
- No distinction between "warning" and "critical"
- On-call is chaotic — 3am pages for things that could wait

## Your Deliverables

### 1. SLO Definitions
For each key user journey, define:
- SLO target (e.g., 99.5% of dashboard loads in <2s)
- Measurement window (30-day rolling)
- What "good" means (SLI definition)
- Why that target is the right target

Include a table:

| Journey | SLO | SLI | Measurement |
|---------|-----|-----|-------------|
| Dashboard load | 99.5% < 2s | p99 latency < 2s over 30d | ... |

### 2. Error Budget Policy
- How much downtime/error budget does each SLO allow per month?
- What happens when error budget is 50% consumed?
- What happens at 100%?

### 3. Alerting Hierarchy
Design a 3-tier alerting framework:
- **Warning** (yellow): Degradation, investigate within 4h
- **Critical** (red): SLO at risk, respond within 30m
- **Emergency** (page): Active outage, immediate response

For each tier, define:
- What triggers it (specific metrics and thresholds)
- Who gets paged
- Expected response time
- Example runbook trigger

### 4. Key Metrics Dashboard
List the 10-15 metrics that should be on the main SLO dashboard. For each:
- Metric name
- What it tells you
- Normal range

### 5. On-Call Runbook Framework
Design the template for an on-call runbook. Include:
- What to check first (and why)
- Common failure patterns and their fixes
- Escalation criteria
- Communication template for status page updates

### 6. What to Instrument First
You have 3 weeks. List what matters most to have SLOs for, in priority order, with rationale.',
  'HIDDEN',
  'binary_check_slo_design',
  1,
  1
);

-- ═══════════════════════════════════════════════════════════════════════════
-- MULTI-STEP TASKS
-- ═══════════════════════════════════════════════════════════════════════════

-- Task 1/3: Multi-Step Debug — 3-Tier Cascading Failure
-- Tests: systematic debugging, cross-service investigation, fix + verification
-- Pattern: same as binaryCheckMultiStep (recognize, diagnose, fix, continue)
INSERT OR REPLACE INTO bench_tasks (id, bench_type, category, title, prompt, grading_key, binary_check_fn, active, version)
VALUES (
  'multi-step-debug',
  'multi-step',
  'Multi-Step Debug — Cascading 3-Tier Failure',
  '# Task: Debug a Cascading System Failure

## The Problem

Users are reporting that dashboard pages are blank. The engineering dashboard shows the API is returning HTTP 500 for dashboard data requests. You need to find and fix the root cause.

## Architecture (simplified)

```
Browser → API Gateway → analytics-api (Node.js) → Redis (cache) → PostgreSQL
                                                          ↘ ClickHouse (analytics DB)
```

## The 3 Services

### analytics-api (port 3000)
Express.js REST API. Endpoint: `GET /api/dashboard/:userId`
Fetches from Redis cache, falls back to ClickHouse on cache miss.

### analytics-cache (Redis, port 6379)
Caches user dashboard data. Key pattern: `dashboard:{userId}`.
TTL: 300 seconds.

### analytics-db (ClickHouse, port 8123)
Analytics data store. Table: `user_dashboards`.
Schema: `(user_id String, widget_data String, updated_at DateTime)`.

## Initial Error

```
[API Gateway] GET /api/dashboard/user_abc123 → 500
Body: {"error": "Internal server error", "requestId": "req_7f3k2"}

[analytics-api logs]
ERROR: connect ECONNREFUSED 10.0.0.42:6379
  at RedisClient.connect (/app/node_modules/redis/index.js:1234:45)
```

## Your Investigation Steps

### Step 1: Reproduce the Error
Confirm the issue. Run:
```bash
curl -v http://localhost:3000/api/dashboard/user_abc123
```
Document what you see.

### Step 2: Check the Redis Connection
The error says ECONNREFUSED on 10.0.4.2:6379. Something is wrong with the Redis connection.
- Is Redis running?
- What is the actual Redis host/port in the config?
- Is there a network connectivity issue?

Check the config file at `/app/config/redis.json`.

### Step 3: Fix the Redis Configuration
If you find a misconfiguration, fix it. Restart the service if needed.

### Step 4: Verify Cache is Working
After fixing Redis, test again:
```bash
curl http://localhost:3000/api/dashboard/user_abc123
```
Does it return data now? Or a different error?

### Step 5: Check ClickHouse (Downstream)
If the cache fix didn't fully resolve it, the ClickHouse query might be failing.
Check the ClickHouse connection. Table: `user_dashboards`. 
Look for schema mismatches or permission issues.

### Step 6: Verify Full Resolution
Run the full test suite and confirm the dashboard loads correctly:
```bash
curl http://localhost:3000/api/dashboard/user_abc123
# Should return JSON with widget_data
```

## Success Criteria

All 6 steps must be completed:
1. Error reproduced and documented
2. Redis misconfiguration identified (host/port was wrong in config)
3. Redis config fixed
4. Cache working (cache hit or cache miss with fallback working)
5. ClickHouse verified (if it was also broken)
6. Full resolution confirmed — dashboard returns valid data

## What to output

For each step: what you checked, what you found, what you changed, and the result.
At the end: a summary of the root cause and the complete fix.',
  'HIDDEN',
  'binary_check_multi_step',
  1,
  1
);

-- Task 2/3: Multi-Step Incident Response
-- Tests: triage → investigate → mitigate → resolve → postmortem
INSERT OR REPLACE INTO bench_tasks (id, bench_type, category, title, prompt, grading_key, binary_check_fn, active, version)
VALUES (
  'multi-step-incident',
  'multi-step',
  'Multi-Step Incident Response',
  '# Task: Full Incident Response Lifecycle

## Scenario

PagerDuty fires at 02:47 AM. Alert: "payment_success_rate < 80% — CRITICAL"

You're the on-call engineer. Your phone is ringing.

## The System (simplified)

```
User → API Gateway → payment-service → Stripe API
                            ↘ webhook-receiver (async)
```

payment-service logs show:
```
[02:43] WARN: Stripe API response time > 5s
[02:44] ERROR: Stripe timeout after 30s, returning 502
[02:45] WARN: Retry 1/3 for txn_abc123
[02:45] ERROR: Retry 2/3 failed: timeout
[02:46] ERROR: txn_abc123: MAX_RETRIES_EXCEEDED
[02:47] CRITICAL: payment success rate 79.2% (threshold: 95%)
```

## Your Response Steps

### Step 1: Triage (2 minutes)
- Acknowledge the alert
- Assess severity: is this a full outage or partial?
- Check: is Stripe itself down? Check status.stripe.com
- Determine: do you need to wake up more people?
- Write your initial status page update (2-3 sentences)

### Step 2: Investigate (10 minutes)
- What changed recently? Check deployment history
- Are failures concentrated in a specific region, payment method, or customer tier?
- Is this Stripe's API or your integration?
- Identify the blast radius: how many customers affected?

### Step 3: Mitigate (15 minutes)
- What can you do right now to reduce impact?
- Consider: feature flags, fallback payment methods, rate limiting adjustments
- Implement your mitigation
- Document what you did and why

### Step 4: Resolve (30 minutes)
- Root cause identified and fixed?
- Rollback if necessary
- Monitor success rate returning to normal
- When to declare resolved

### Step 5: Postmortem Draft (write this while it is fresh)
Write the skeleton of your postmortem:
- Timeline (you have the logs above, fill in gaps)
- Root cause (specific, not "Stripe was slow")
- Action items (minimum 3, specific and time-bound)

## Success Criteria

All 5 steps completed with specific, detailed responses:
1. Triage: severity assessed, initial status update written
2. Investigation: root cause area identified, blast radius estimated
3. Mitigation: at least one concrete mitigation action taken
4. Resolution: confirmed stable with evidence
5. Postmortem: timeline + root cause + 3+ action items written

## What to output

A detailed incident response document, step by step. Be specific — "Stripe's API was timing out because their EU region had elevated error rates" not "there was an outage."',
  'HIDDEN',
  'binary_check_multi_step',
  1,
  1
);

-- Task 3/3: Multi-Step Migration
-- Tests: phased execution, validation gates, rollback capability
INSERT OR REPLACE INTO bench_tasks (id, bench_type, category, title, prompt, grading_key, binary_check_fn, active, version)
VALUES (
  'multi-step-migration',
  'multi-step',
  'Multi-Step Database Migration with Validation Gates',
  '# Task: Execute a Phased Database Migration

## Context

You need to migrate the user accounts table from a legacy schema to a new one. The migration must be zero-downtime and reversible.

## The Migration

**Old table: `users_legacy`**
```sql
CREATE TABLE users_legacy (
  id INTEGER PRIMARY KEY,
  email VARCHAR(255),
  created_at TIMESTAMP,
  plan VARCHAR(50)  -- 'free', 'pro', 'enterprise'
);
```

**New table: `users`**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'free',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  CONSTRAINT valid_plan CHECK (plan IN ('free', 'pro', 'enterprise', 'trial'))
);
```

**The challenge:** 4.2 million rows. Zero downtime. No rollbacks that lose data.

## Your 6 Steps

### Step 1: Create New Table and Metadata JSONB Column
Create the `users` table with the new schema.
Add the `metadata` JSONB column (empty `{}` as default).

### Step 2: Validate Row Count Before Migration
Before moving data, validate:
- `users_legacy` row count = 4,200,000 (with ±1000 tolerance)
- No NULL emails in legacy table
- Plan values are only valid enum values

### Step 3: Run the Migration (with batching)
Migrate in batches of 10,000 rows using cursor-based pagination (ORDER BY id).
For each batch:
- Insert into `users` with new UUIDs
- Map old `id` → new `user_uuid` in a `user_id_map` table
- Commit each batch

### Step 4: Validate Post-Migration
After migration completes:
- Count in `users` = count in `users_legacy`
- All emails present in both tables
- `user_id_map` has 4.2M entries
- Sample 100 rows: verify data integrity

### Step 5: Switch Over
- Update application config to read from `users` instead of `users_legacy`
- Verify a sample of real user logins work with new table
- Monitor error rates for 5 minutes

### Step 6: Rollback Plan (document, don't execute)
If something goes wrong after switchover:
- Describe exactly how to rollback without losing the migrated data
- How to point the app back at `users_legacy`
- What data might be lost in a rollback (new signups during migration window)

## Success Criteria

All 6 steps with specific evidence:
1. New table created with correct schema
2. Pre-migration validation: counts and constraints verified
3. Migration ran in batches, IDs mapped correctly
4. Post-migration validation: row counts match, data integrity confirmed
5. Switchover successful: application reads from new table
6. Rollback plan: detailed, specific, no data loss for existing users

## What to output

For each step: the SQL commands run, the output/results, what was verified.',
  'HIDDEN',
  'binary_check_multi_step',
  1,
  1
);
