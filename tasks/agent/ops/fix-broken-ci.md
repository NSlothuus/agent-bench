# Task: Fix Broken CI Pipeline

## Category: ops
## Difficulty: Hard
## Time Limit: 8 minutes
## Binary Check: binary_check_agent_ci_fix

## Description

The agent receives a project where the CI pipeline (GitHub Actions) is failing. There are 3 distinct issues causing failures. The agent must diagnose and fix all of them without breaking anything else.

## Setup Files

### .github/workflows/ci.yml
```yaml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_TOKEN }}
```

### package.json
```json
{
  "name": "my-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "lint": "eslint src/ --ext .ts",
    "test": "vitest run",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^1.6.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.57.0",
    "tsx": "^4.0.0",
    "wrangler": "^3.0.0"
  }
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true,
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*.ts"]
}
```

### .eslintrc.json
```json
{
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "no-unused-vars": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "no-console": "error"
  }
}
```

### src/index.ts
```typescript
import { Hono } from 'hono';
import { logger } from './middleware/logger';
import { healthCheck } from './routes/health';
import { userRoutes } from './routes/users';

const app = new Hono();

app.use('*', logger);
app.route('/health', healthCheck);
app.route('/users', userRoutes);

export default app;
```

### src/middleware/logger.ts
```typescript
import { Context, Next } from 'hono';

export async function logger(c: Context, next: Next) {
  const start = Date.now();
  console.log(`→ ${c.req.method} ${c.req.url}`);
  await next();
  const ms = Date.now() - start;
  console.log(`← ${c.res.status} ${ms}ms`);
}
```

### src/routes/health.ts
```typescript
import { Hono } from 'hono';

export const healthCheck = new Hono();

healthCheck.get('/', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

### src/routes/users.ts
```typescript
import { Hono } from 'hono';
import { validateEmail } from '../utils/validation';

export const userRoutes = new Hono();

interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

const users: User[] = [];
let nextId = 1;

userRoutes.get('/', (c) => {
  return c.json(users);
});

userRoutes.post('/', async (c) => {
  const body = await c.req.json();
  
  if (!validateEmail(body.email)) {
    return c.json({ error: 'Invalid email' }, 400);
  }

  const user: User = {
    id: nextId++,
    email: body.email,
    name: body.name,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  return c.json(user, 201);
});
```

### src/utils/validation.ts
```typescript
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeInput(input: string): string {
  return input.replace(/[<>&"']/g, '');
}
```

### src/__tests__/health.test.ts
```typescript
import { describe, it, expect } from 'vitest';
import app from '../index';

describe('Health endpoint', () => {
  it('returns ok status', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
```

### src/__tests__/users.test.ts
```typescript
import { describe, it, expect } from 'vitest';
import app from '../index';

describe('Users endpoint', () => {
  it('returns empty users list', async () => {
    const res = await app.request('/users');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('creates a user', async () => {
    const res = await app.request('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', name: 'Test' }),
    });
    expect(res.status).toBe(201);
  });

  it('rejects invalid email', async () => {
    const res = await app.request('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', name: 'Test' }),
    });
    expect(res.status).toBe(400);
  });
});
```

## The 3 Bugs

### Bug 1: ESLint `no-console` rule
The `logger.ts` middleware uses `console.log`, but ESLint has `"no-console": "error"`. The lint step fails.

**Expected fix:** Either disable the rule for the logger file, or replace console.log with a proper logging approach that satisfies the rule.

### Bug 2: Unused export in validation.ts  
`sanitizeInput` is exported but never imported anywhere. ESLint's `no-unused-vars` catches exports that aren't used (with the TS plugin). Combined with `@typescript-eslint/no-unused-vars: "error"`, this fails.

**Expected fix:** Either use the function somewhere, remove it, or prefix with underscore.

### Bug 3: TypeScript strict mode + vitest globals
`tsconfig.json` has `"types": ["vitest/globals"]` but `vitest.config.ts` is missing (no config to enable globals). The tests import from 'vitest' explicitly which works, but TypeScript compilation fails because the vitest/globals types conflict.

**Expected fix:** Either add a vitest.config.ts with globals: true, or remove the types entry from tsconfig.json since tests import explicitly.

## Grading Key (HIDDEN)

### Outcomes:
1. **Fixed lint (console.log)** (+2.5): Logger no longer causes lint failure
2. **Fixed lint (unused export)** (+2.5): sanitizeInput no longer causes lint failure  
3. **Fixed TypeScript/vitest config** (+2.5): `tsc --noEmit` passes
4. **All tests still pass** (+1.5): Didn't break anything
5. **Build succeeds** (+1): `npm run build` works

### Agent-specific:
- Diagnosed all 3 issues before fixing (+0.5)
- Didn't introduce new issues (+0.5)
- Completion time <5min (+0.5)
- Minimal file changes (surgical fixes) (+0.5)
