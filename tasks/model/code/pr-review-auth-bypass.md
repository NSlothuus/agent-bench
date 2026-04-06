# Task: PR Review — Authentication Bypass in Middleware

## Category: code
## Difficulty: Hard
## Binary Check: binary_check_auth_bypass

## Prompt

You're reviewing a pull request that adds JWT authentication middleware to an Express.js API. The team lead approved it, but you're doing a final review before merge. The PR description says: "Adds JWT auth middleware. All endpoints except /health and /login are now protected."

Review the code below. Identify any security issues, bugs, or concerns. Be precise — flag real problems, not style preferences. If something looks unusual but works correctly, say so.

```typescript
// middleware/auth.ts
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';

const PUBLIC_PATHS = ['/health', '/login', '/api/v1/login', '/api/v1/register'];

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip auth for public paths
  if (PUBLIC_PATHS.some(path => req.path.startsWith(path))) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Invalid authorization format' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// middleware/rateLimit.ts
import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    let entry = store.get(key);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    if (entry.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    res.setHeader('X-RateLimit-Remaining', maxRequests - entry.count);
    next();
  };
}

// routes/admin.ts
import { Router } from 'express';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

router.use(rateLimit(10, 60000));

router.get('/api/v1/admin/users', async (req, res) => {
  const { role } = (req as any).user;
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  // ... fetch users
  res.json({ users: [] });
});

router.post('/api/v1/admin/users/:id/promote', async (req, res) => {
  const { role } = (req as any).user;
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const targetUser = await findUser(req.params.id);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  await updateUserRole(targetUser.id, req.body.newRole);
  res.json({ success: true });
});

router.delete('/api/v1/admin/users/:id', async (req, res) => {
  const { role, sub } = (req as any).user;
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  await deleteUser(req.params.id);
  res.json({ success: true });
});

export default router;
```

Provide your review. For each issue found, explain the severity (Critical/High/Medium/Low), what could go wrong, and how to fix it.

## Grading Key (HIDDEN — server-side only)

### Critical Bugs (must find):
1. **Path traversal auth bypass** (CRITICAL): `req.path.startsWith(path)` means `/api/v1/login/../admin/users` or `/health/../../admin/users` bypasses auth. Should use exact match or normalize the path first.
2. **Hardcoded fallback secret** (HIGH): `JWT_SECRET || 'development-secret-key'` means if env var is missing in production, all tokens are signed with a known secret. Should throw if not set.
3. **No role validation in JWT** (HIGH): The JWT payload's `role` claim is trusted without verification. An attacker who can forge a token (see bug #2) can set any role.

### Important Issues (should find):
4. **Admin can delete themselves** (MEDIUM): No check preventing `sub === req.params.id` in the delete endpoint.
5. **No input validation on promote** (MEDIUM): `req.body.newRole` is passed directly — could be set to any string including 'superadmin' or empty.
6. **In-memory rate limiter** (MEDIUM): Map grows unbounded, no cleanup. In multi-process/cluster setup, each process has its own store.

### Acceptable patterns (should NOT flag):
- The `(req as any).user` cast is ugly but standard Express pattern without custom type augmentation
- The rate limiter's basic structure is fine for a single-process setup
- The token format check (split on space, take index 1) is standard Bearer token parsing

### Scoring:
- Found bug 1 (path traversal): +3 points
- Found bug 2 (hardcoded secret): +2 points  
- Found bug 3 (role trust): +1 point
- Found bugs 4-6: +0.5 each
- Each genuine false positive: -0.5 (max -2)
- Flagging acceptable patterns as bugs: -1 each
