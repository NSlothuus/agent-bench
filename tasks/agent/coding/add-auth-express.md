# Task: Add Authentication to Express API

## Category: coding
## Difficulty: Hard  
## Time Limit: 10 minutes
## Binary Check: binary_check_agent_auth

## Description

The agent receives a scaffolded Express.js API with CRUD endpoints for a todo app. The task: add JWT authentication so all endpoints except POST /auth/register and POST /auth/login require a valid token.

## Setup Files

### package.json
```json
{
  "name": "todo-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "test": "node --test src/**/*.test.js"
  },
  "dependencies": {
    "express": "^4.18.0"
  }
}
```

### src/index.js
```javascript
import express from 'express';

const app = express();
app.use(express.json());

// In-memory store
const todos = new Map();
const users = new Map();
let nextId = 1;

// TODO: Add auth routes (register, login)
// TODO: Add auth middleware

// CRUD routes
app.get('/todos', (req, res) => {
  const userTodos = [...todos.values()].filter(t => t.userId === req.userId);
  res.json(userTodos);
});

app.post('/todos', (req, res) => {
  const todo = { id: nextId++, text: req.body.text, done: false, userId: req.userId };
  todos.set(todo.id, todo);
  res.status(201).json(todo);
});

app.put('/todos/:id', (req, res) => {
  const todo = todos.get(Number(req.params.id));
  if (!todo || todo.userId !== req.userId) return res.status(404).json({ error: 'Not found' });
  Object.assign(todo, req.body);
  res.json(todo);
});

app.delete('/todos/:id', (req, res) => {
  const todo = todos.get(Number(req.params.id));
  if (!todo || todo.userId !== req.userId) return res.status(404).json({ error: 'Not found' });
  todos.delete(todo.id);
  res.status(204).send();
});

app.listen(3000, () => console.log('Server running on :3000'));
```

### src/auth.test.js
```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';

// These tests verify the auth implementation works
describe('Auth', () => {
  it('should reject requests without token', async () => {
    const res = await fetch('http://localhost:3000/todos');
    assert.strictEqual(res.status, 401);
  });

  it('should allow registration', async () => {
    const res = await fetch('http://localhost:3000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'test123' }),
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.ok(body.token);
  });

  it('should allow login and return token', async () => {
    const res = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'test123' }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.token);
  });

  it('should allow authenticated requests', async () => {
    // Login first
    const loginRes = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'test123' }),
    });
    const { token } = await loginRes.json();

    const res = await fetch('http://localhost:3000/todos', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    assert.strictEqual(res.status, 200);
  });
});
```

## Grading Key (HIDDEN — server-side only)

### Required outcomes:
1. **Auth middleware blocks unauthenticated requests** (+2): GET/POST/PUT/DELETE /todos return 401 without token
2. **Register endpoint works** (+1.5): POST /auth/register creates user, returns JWT
3. **Login endpoint works** (+1.5): POST /auth/login validates credentials, returns JWT
4. **Authenticated requests work** (+2): Valid JWT grants access, req.userId populated
5. **Password not stored in plaintext** (+1): Uses bcrypt, scrypt, or at minimum some hashing
6. **All tests pass** (+2): The provided test file should pass

### Bonus:
- Uses crypto.randomBytes or similar for JWT secret (+0.25)
- Validates email format (+0.25)  
- Returns proper error messages (+0.25)
- Doesn't break existing CRUD logic (+0.25)

### Agent-specific scoring:
- **Completion time**: <3min = +1, <5min = +0.5, <10min = 0
- **Tool efficiency**: minimal unnecessary file reads/edits = +0.5
- **Recovery**: if agent hits an error and recovers = +0.5
- **No unnecessary files created**: +0.25
