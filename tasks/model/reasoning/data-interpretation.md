# Task: Data Interpretation — Production Metrics Analysis

## Category: reasoning
## Difficulty: Medium
## Binary Check: binary_check_data_interpretation

## Prompt

You're on-call and got paged at 3 AM. Here are the metrics from your API service dashboard for the last 6 hours:

```
Time     | P50 (ms) | P95 (ms) | P99 (ms) | RPS  | Error Rate | CPU % | Memory %
---------|----------|----------|----------|------|------------|-------|----------
21:00    | 45       | 120      | 250      | 850  | 0.1%       | 35%   | 62%
22:00    | 48       | 125      | 260      | 720  | 0.1%       | 32%   | 63%
23:00    | 44       | 118      | 245      | 380  | 0.1%       | 22%   | 63%
00:00    | 52       | 180      | 890      | 200  | 0.3%       | 18%   | 64%
01:00    | 68       | 350      | 2100     | 180  | 1.2%       | 16%   | 72%
02:00    | 95       | 580      | 4500     | 160  | 3.8%       | 14%   | 81%
03:00    | 210      | 1200     | 8900     | 140  | 8.2%       | 12%   | 89%
```

Additional context:
- 3 pods running behind a load balancer (Kubernetes)
- PostgreSQL RDS (db.r6g.large, 2 vCPU, 16GB RAM)
- Redis cluster for caching (3 nodes)
- No recent deployments (last deploy was 2 days ago)
- Cron job runs at midnight: "daily report generation"

What's going wrong? What would you investigate first? What's your immediate action plan?

## Grading Key (HIDDEN)

### Key observations the model should make:

1. **Latency is degrading while RPS is DECREASING** (+2): This is the critical insight. Normally high latency correlates with high load. Here, traffic is dropping (850→140 RPS) but latency is exploding (45ms→210ms P50). Something is consuming resources independently of traffic.

2. **Memory is growing steadily** (+1.5): 62%→89% over 6 hours. This is a memory leak or an accumulating process. The system will OOM soon.

3. **CPU is DECREASING** (+1): CPU drops from 35%→12% as traffic drops. The bottleneck is NOT CPU. This rules out a compute-bound issue.

4. **The midnight cron job is the likely trigger** (+2): Latency spike starts at 00:00, exactly when "daily report generation" runs. The cron job is likely: consuming database connections, holding locks, causing table bloat, or filling memory.

5. **Error rate correlates with memory** (+1): Errors spike as memory grows. Likely OOM kills or GC pressure causing timeouts.

### Investigation plan (should include):
6. **Check the cron job** — is it still running? How much memory/CPU? (+0.5)
7. **Check database** — active queries, locks, connection count (+0.5)
8. **Check pod memory** — which pod is consuming most? Any OOM restarts? (+0.5)
9. **Check Redis** — is cache being evicted? (+0.25)

### Immediate actions (should include):
10. **Kill or pause the cron job** if it's still running (+0.5)
11. **Consider pod restart** if memory is critical (+0.25)
12. **Don't just restart everything** — diagnose first (+0.25)

### Red flags:
- Suggests scaling up pods (treats it as a load issue): -1
- Misses the inverse correlation (latency up + traffic down): -1.5
- Focuses on network issues: -0.5
- Doesn't mention the cron job: -1
