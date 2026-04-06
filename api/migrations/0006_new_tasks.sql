-- New real-world benchmark tasks for Phase 3
-- Model bench tasks (7) + Agent bench tasks (5)

-- Model Bench: Code tasks
INSERT OR REPLACE INTO bench_tasks (id, bench_type, category, title, prompt, grading_key, binary_check_fn, active, version)
VALUES (
  'code-auth-bypass',
  'model',
  'code',
  'PR Review — Authentication Bypass',
  'You''re reviewing a pull request that adds JWT authentication middleware to an Express.js API. The team lead approved it, but you''re doing a final review before merge. The PR description says: "Adds JWT auth middleware. All endpoints except /health and /login are now protected."

Review the code below. Identify any security issues, bugs, or concerns. Be precise — flag real problems, not style preferences. If something looks unusual but works correctly, say so.

```typescript
// middleware/auth.ts
import jwt from ''jsonwebtoken'';
import { Request, Response, NextFunction } from ''express'';

const JWT_SECRET = process.env.JWT_SECRET || ''development-secret-key'';

const PUBLIC_PATHS = [''/health'', ''/login'', ''/api/v1/login'', ''/api/v1/register''];

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (PUBLIC_PATHS.some(path => req.path.startsWith(path))) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: ''No authorization header'' });
  }

  const token = authHeader.split('' '')[1];
  if (!token) {
    return res.status(401).json({ error: ''Invalid authorization format'' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: ''Token expired'' });
    }
    return res.status(401).json({ error: ''Invalid token'' });
  }
}

// middleware/rateLimit.ts
import { Request, Response, NextFunction } from ''express'';

interface RateLimitEntry { count: number; resetAt: number; }
const store = new Map<string, RateLimitEntry>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || ''unknown'';
    const now = Date.now();
    let entry = store.get(key);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }
    entry.count++;
    if (entry.count > maxRequests) {
      res.setHeader(''Retry-After'', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ error: ''Rate limit exceeded'' });
    }
    res.setHeader(''X-RateLimit-Remaining'', maxRequests - entry.count);
    next();
  };
}

// routes/admin.ts
import { Router } from ''express'';
import { rateLimit } from ''../middleware/rateLimit'';
const router = Router();
router.use(rateLimit(10, 60000));

router.get(''/api/v1/admin/users'', async (req, res) => {
  const { role } = (req as any).user;
  if (role !== ''admin'') return res.status(403).json({ error: ''Admin access required'' });
  res.json({ users: [] });
});

router.post(''/api/v1/admin/users/:id/promote'', async (req, res) => {
  const { role } = (req as any).user;
  if (role !== ''admin'') return res.status(403).json({ error: ''Admin access required'' });
  const targetUser = await findUser(req.params.id);
  if (!targetUser) return res.status(404).json({ error: ''User not found'' });
  await updateUserRole(targetUser.id, req.body.newRole);
  res.json({ success: true });
});

router.delete(''/api/v1/admin/users/:id'', async (req, res) => {
  const { role, sub } = (req as any).user;
  if (role !== ''admin'') return res.status(403).json({ error: ''Admin access required'' });
  await deleteUser(req.params.id);
  res.json({ success: true });
});
export default router;
```

Provide your review. For each issue found, explain the severity (Critical/High/Medium/Low), what could go wrong, and how to fix it.',
  'HIDDEN',
  'binary_check_auth_bypass',
  1,
  1
);

INSERT OR REPLACE INTO bench_tasks (id, bench_type, category, title, prompt, grading_key, binary_check_fn, active, version)
VALUES (
  'code-memory-leak',
  'model',
  'code',
  'Debug — Memory Leak in WebSocket Server',
  'Your team''s WebSocket chat server is running out of memory in production after ~12 hours. The process starts at 150MB RSS and grows to 2GB+ before getting OOM-killed. You need to review this code and identify all memory leak sources. The server handles ~500 concurrent connections.

Find ALL memory leak sources. For each one, explain: (1) why it leaks, (2) the growth rate under the described load, (3) how to fix it.

[Code provided in task - ChatServer class with WebSocket handling, rooms, users, event subscriptions]',
  'HIDDEN',
  'binary_check_memory_leak',
  1,
  1
);

-- Model Bench: Safety tasks
INSERT OR REPLACE INTO bench_tasks (id, bench_type, category, title, prompt, grading_key, binary_check_fn, active, version)
VALUES (
  'safety-migration',
  'model',
  'safety',
  'Safety Review — Database Migration Script',
  'A junior developer submitted this database migration script for review. They say: "This migration adds the new analytics tables and cleans up some legacy data. Ready for production Friday night." Review this script. Should it run in production as-is? What are the risks?

[8-step SQL migration including CREATE TABLE, DROP CASCADE, DELETE FROM users, UPDATE all rows, REINDEX, etc.]',
  'HIDDEN',
  'binary_check_migration_safety',
  1,
  1
);

INSERT OR REPLACE INTO bench_tasks (id, bench_type, category, title, prompt, grading_key, binary_check_fn, active, version)
VALUES (
  'safety-devops',
  'model',
  'safety',
  'Safety — DevOps Command Review',
  'Your colleague sends you a Kubernetes cleanup script for staging. The staging and prod clusters share the same namespace prefix but different contexts. Review each command for safety.

[Bash script with kubectl commands using --all-namespaces, rollout restart, secret deletion, image pruning]',
  'HIDDEN',
  'binary_check_devops_safety',
  1,
  1
);

-- Model Bench: Writing task
INSERT OR REPLACE INTO bench_tasks (id, bench_type, category, title, prompt, grading_key, binary_check_fn, active, version)
VALUES (
  'writing-blog-v2',
  'model',
  'writing',
  'Technical Blog Post — Error Handling',
  'Write a technical blog post (800-1200 words) titled: "Error Handling That Doesn''t Suck: Lessons from 3 Production Outages"

Target audience: Mid-level backend developers. Requirements: specific code examples, real-world outage references, clear thesis, human voice (not a textbook).',
  'HIDDEN',
  'binary_check_writing_v2',
  1,
  1
);

-- Model Bench: Reasoning task
INSERT OR REPLACE INTO bench_tasks (id, bench_type, category, title, prompt, grading_key, binary_check_fn, active, version)
VALUES (
  'reasoning-restraint-v2',
  'model',
  'reasoning',
  'Restraint — Review Already-Good Code',
  'Your team''s senior architect wrote this utility module before going on vacation. Review it "just in case." Be honest about what you find. If the code is solid, say so.

[Well-written TypeScript retry utility with exponential backoff, jitter, custom error class, configurable predicates]',
  'HIDDEN',
  'binary_check_restraint_v2',
  1,
  1
);

-- Model Bench: Design task
INSERT OR REPLACE INTO bench_tasks (id, bench_type, category, title, prompt, grading_key, binary_check_fn, active, version)
VALUES (
  'design-rate-limiter',
  'model',
  'design',
  'System Design — Multi-Tenant Rate Limiter',
  'Design a rate limiting system for a multi-tenant SaaS API platform. 200+ customers, free to enterprise tiers. Must handle 100K+ req/s, burst allowance, distributed across gateway instances, fail-open, P99 <5ms.

Provide: architecture, data model, algorithm choice with rationale, distributed handling, failure modes, what to cut for 1-week ship.',
  'HIDDEN',
  'binary_check_system_design',
  1,
  1
);

-- Agent Bench tasks (stubs — full prompts served with setup files)
INSERT OR REPLACE INTO bench_tasks (id, bench_type, category, title, prompt, grading_key, binary_check_fn, active, version)
VALUES (
  'agent-coding-auth',
  'agent',
  'coding',
  'Add Authentication to Express API',
  'Add JWT authentication to this Express.js todo API. All endpoints except POST /auth/register and POST /auth/login should require a valid token. Setup files provided in workspace.',
  'HIDDEN',
  NULL,
  1,
  1
);

INSERT OR REPLACE INTO bench_tasks (id, bench_type, category, title, prompt, grading_key, binary_check_fn, active, version)
VALUES (
  'agent-ops-ci',
  'agent',
  'ops',
  'Fix Broken CI Pipeline',
  'The CI pipeline (GitHub Actions) is failing with 3 distinct issues. Diagnose and fix all of them without breaking anything else. Setup files provided in workspace.',
  'HIDDEN',
  NULL,
  1,
  1
);

INSERT OR REPLACE INTO bench_tasks (id, bench_type, category, title, prompt, grading_key, binary_check_fn, active, version)
VALUES (
  'agent-recovery-deploy',
  'agent',
  'recovery',
  'Failed Deployment Recovery',
  'A deployment script failed halfway through a database migration + code deploy. Assess the damage, recover to a consistent state, and complete the deployment. Setup files provided in workspace.',
  'HIDDEN',
  NULL,
  1,
  1
);

INSERT OR REPLACE INTO bench_tasks (id, bench_type, category, title, prompt, grading_key, binary_check_fn, active, version)
VALUES (
  'agent-planning-esm',
  'agent',
  'planning',
  'Migrate CJS to ESM',
  'Migrate this 8-file Node.js project from CommonJS to ES Modules. Handle all gotchas: require→import, __dirname, .js extensions, package.json type, JSON imports. Setup files provided in workspace.',
  'HIDDEN',
  NULL,
  1,
  1
);

INSERT OR REPLACE INTO bench_tasks (id, bench_type, category, title, prompt, grading_key, binary_check_fn, active, version)
VALUES (
  'agent-research-docs',
  'agent',
  'research',
  'Write API Integration Docs',
  'Research the provided API (using docs and examples in workspace), document all methods, write a getting-started guide with error handling examples. Setup files provided in workspace.',
  'HIDDEN',
  NULL,
  1,
  1
);
