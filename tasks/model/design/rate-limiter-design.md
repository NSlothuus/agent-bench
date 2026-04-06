# Task: System Design — Multi-Tenant Rate Limiter

## Category: design
## Difficulty: Hard
## Binary Check: binary_check_system_design

## Prompt

Design a rate limiting system for a multi-tenant SaaS API platform. The platform serves 200+ customers ranging from free tier (100 req/min) to enterprise (50,000 req/min).

Requirements:
1. Per-tenant rate limiting with configurable limits per plan tier
2. Must handle 100K+ requests/second across all tenants
3. Burst allowance: tenants can spike to 2x their limit for 10 seconds
4. Rate limit headers in every response (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
5. Graceful degradation: if the rate limiter goes down, traffic should still flow (fail-open)
6. Dashboard visibility: tenants can see their usage in real-time
7. Distributed: works across multiple API gateway instances

Constraints:
- You're running on AWS (EKS, ElastiCache/Redis, DynamoDB available)
- P99 latency budget for the rate limit check: 5ms
- Cannot add more than 10ms latency to any API call
- Budget-conscious: don't over-engineer

Provide:
1. Architecture diagram (ASCII or description)
2. Data model / key structure
3. Algorithm choice with rationale
4. How you handle the distributed case
5. Failure modes and mitigations
6. What you'd cut if you had to ship in 1 week

## Grading Key (HIDDEN — server-side only)

### Must include:
1. **Algorithm choice** (sliding window, token bucket, leaky bucket, or fixed window): +1.5
   - Token bucket or sliding window log = best for burst support
   - Fixed window alone = misses the burst requirement
   - Explains WHY they chose it: +0.5 bonus

2. **Redis/ElastiCache as the backing store**: +1
   - It's the right tool for this (sub-ms reads, atomic operations)
   - Using DynamoDB alone would blow the 5ms P99 budget
   
3. **Key structure for multi-tenancy**: +1
   - Something like `rl:{tenant_id}:{window}` or `rl:{tenant_id}:tokens`
   - Must be tenant-isolated (one key per tenant, not global)

4. **Distributed handling**: +1.5
   - Redis atomic operations (MULTI/EXEC, Lua scripts, or INCR+EXPIRE)
   - OR: local counters with periodic sync (more complex but lower latency)
   - Acknowledges race conditions between instances

5. **Fail-open design**: +1
   - If Redis is down, allow traffic through (not block everything)
   - Local fallback counters, circuit breaker on Redis connection
   - Mentions this explicitly

6. **Burst handling**: +1
   - Token bucket naturally handles bursts
   - OR: separate burst quota with faster refill
   - OR: sliding window with burst multiplier

7. **What to cut for 1-week ship**: +0.5
   - Shows pragmatic thinking
   - Good cuts: dashboard (use Redis CLI), burst support (add later), per-endpoint limits

### Bonus:
- Mentions Lua script for atomic check-and-decrement: +0.5
- Mentions rate limit headers implementation: +0.5
- Mentions monitoring/alerting on limit hits: +0.25
- Mentions quota sync for billing: +0.25

### Red flags (deductions):
- Over-engineers (Kafka, ML-based, custom consensus): -1
- No Redis (invents a custom distributed counter): -1
- Ignores the 5ms P99 budget: -0.5
- No failure mode discussion: -1
