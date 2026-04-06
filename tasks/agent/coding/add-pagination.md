# Task: Multi-File Feature — Add Pagination

## Category: coding
## Difficulty: Medium
## Time Limit: 8 minutes

## Description

The agent receives an Express API with a `/api/posts` endpoint that returns all posts. Add cursor-based pagination across route, controller, and tests.

## Prompt

The `/api/posts` endpoint currently returns ALL posts in the database (no limit). Add cursor-based pagination:

- Default limit: 20 items per page
- Cursor: use the post's `created_at` timestamp (ISO string)
- Support `?limit=N&cursor=<timestamp>` query params
- Response format: `{ data: [...], pagination: { hasMore, nextCursor, total } }`
- Update the existing test to verify pagination works

**src/routes/posts.js**
```javascript
import { Router } from 'express';
import { getAllPosts, getPostById } from '../controllers/posts.js';

const router = Router();

router.get('/api/posts', getAllPosts);
router.get('/api/posts/:id', getPostById);

export default router;
```

**src/controllers/posts.js**
```javascript
import { db } from '../db.js';

export async function getAllPosts(req, res) {
  const result = await db.query('SELECT * FROM posts ORDER BY created_at DESC');
  res.json({ data: result.rows });
}

export async function getPostById(req, res) {
  const result = await db.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Post not found' });
  res.json({ data: result.rows[0] });
}
```

**src/__tests__/posts.test.js**
```javascript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('Posts API', () => {
  it('returns all posts', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns a single post by id', async () => {
    const res = await request(app).get('/api/posts/1');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });
});
```

Implement cursor-based pagination. Update the controller, and add/update tests.

## Grading Key (HIDDEN)

### Implementation (+6):
- Uses cursor (created_at) for pagination, not OFFSET (+1.5)
- Respects limit param with default of 20 (+1)
- SQL uses WHERE created_at < cursor with ORDER BY created_at DESC LIMIT N+1 pattern (+1.5)
- Response includes hasMore, nextCursor, total (+1)
- getPostById unchanged / still works (+0.5)
- Validates limit param (reasonable max, number check) (+0.5)

### Tests (+2.5):
- Test for default pagination (20 items) (+0.5)
- Test for custom limit (+0.5)
- Test for cursor navigation (page 2) (+1)
- Test for hasMore = false on last page (+0.5)

### Quality (+1.5):
- No SQL injection via cursor param (+0.5)
- Clean code, no unnecessary changes (+0.5)
- Total count doesn't slow down the query (separate COUNT or estimated) (+0.5)
