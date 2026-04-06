# Task: Write Incident Postmortem

## Category: writing
## Difficulty: Hard
## Binary Check: binary_check_postmortem

## Prompt

Write a blameless incident postmortem based on this timeline. The audience is your engineering team + leadership. Follow industry best practices for postmortem writing.

**Incident Timeline:**

```
2026-03-12 14:23 UTC — Deploy of v4.2.1 to production (includes new caching layer for user profiles)
2026-03-12 14:25 UTC — Monitoring shows P95 latency for /api/users/* drops from 180ms to 45ms ✅
2026-03-12 14:30 UTC — Cache hit rate: 94%. Team celebrates in Slack.
2026-03-12 16:45 UTC — Customer support tickets start: "I'm seeing someone else's profile data"
2026-03-12 16:52 UTC — 3 more tickets. Support escalates to engineering.
2026-03-12 17:01 UTC — On-call engineer investigates. Finds cache key is `user:${userId}` but userId is being read from the session cookie, not the URL parameter.
2026-03-12 17:03 UTC — Root cause identified: When user A views user B's profile (/users/B), the cache key uses A's session userId, not B's profile userId. So user A sees their own cached profile instead of B's.
2026-03-12 17:05 UTC — Worse: when the cache is cold, B's profile data gets cached under A's key. Now anyone who views the page sees B's data.
2026-03-12 17:08 UTC — Incident declared SEV-1. Cache invalidation started.
2026-03-12 17:12 UTC — Full Redis FLUSHDB executed.
2026-03-12 17:15 UTC — Cache disabled via feature flag. Rolled back to v4.2.0.
2026-03-12 17:18 UTC — Verified: profiles now showing correctly.
2026-03-12 17:45 UTC — Audit: ~2,100 users were affected. 340 had profile data exposed to other users.

Impact: 340 users had personal profile data (name, email, avatar, bio) visible to other users for ~2 hours and 20 minutes.
```

## Grading Key (HIDDEN)

### Structure (+3):
- Has clear sections: Summary, Impact, Timeline, Root Cause, Action Items (+1.5)
- Timeline is chronological and factual (+0.5)
- Has severity level mentioned (+0.25)
- Has "what went well" section (+0.5)
- Estimated time-to-detect and time-to-resolve (+0.25)

### Root Cause Analysis (+2.5):
- Correctly identifies cache key bug (session userId vs profile userId) (+1)
- Explains the cross-contamination mechanism (+0.5)
- Identifies WHY it wasn't caught: missing test for multi-user cache scenarios (+0.5)
- Identifies the code review gap (+0.5)

### Action Items (+2.5):
- Fix the cache key (use profile userId, not session userId) (+0.5)
- Add integration tests for cache behavior with multiple users (+0.5)
- Add data isolation checks to CI/CD pipeline (+0.5)
- Notify affected users about data exposure (+0.5)
- Privacy/security review process for caching PII (+0.5)

### Writing Quality (+2):
- Blameless tone (no "developer X made a mistake") (+1)
- Factual, not emotional (+0.5)
- No banned AI-slop phrases (-0.5 each)
- Concise — doesn't pad with unnecessary prose (+0.5)

### Red flags:
- Blames an individual: -2
- Misidentifies root cause: -1.5
- No action items: -1
- Overly vague action items ("improve testing"): -0.5
