# Task: Write Tests from Bug Report

## Category: coding
## Difficulty: Medium
## Time Limit: 10 minutes

## Description

The agent receives a bug report and a codebase. It must write tests that reproduce the bug — tests that fail on the buggy code and pass on the fixed code. Writing regression tests from bug reports is a critical real-world skill.

## Prompt

A bug was filed: "Users can delete their own account while they have active subscriptions. The deletion succeeds even though it should be blocked."

**Setup Files:**

**src/models/User.ts**
```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface Subscription {
  id: string;
  userId: string;
  status: 'active' | 'cancelled' | 'expired';
  planId: string;
  expiresAt: Date;
}
```

**src/services/userService.ts**
```typescript
import { db } from '../db';
import { User, Subscription } from '../models/User';

export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const user = await db.query<User>('SELECT * FROM users WHERE id = $1', [userId]);
  
  if (!user.rows[0]) {
    return { success: false, error: 'User not found' };
  }
  
  if (user.rows[0].deletedAt !== null) {
    return { success: false, error: 'User already deleted' };
  }
  
  await db.query('DELETE FROM users WHERE id = $1', [userId]);
  
  return { success: true };
}

export async function getUserSubscriptions(userId: string): Promise<Subscription[]> {
  const result = await db.query<Subscription>(
    'SELECT * FROM subscriptions WHERE user_id = $1',
    [userId]
  );
  return result.rows;
}
```

**Tests to write:**

Write a test file at `src/__tests__/userDeletion.test.ts` that:
1. Tests that deleting a user WITH an active subscription fails (the bug)
2. Tests that deleting a user WITH a cancelled subscription succeeds
3. Tests that deleting a user WITH no subscriptions succeeds
4. Tests that the correct error message is returned when deletion is blocked

Use Vitest. Mock the database. Write tests that would FAIL with the current code and PASS after the bug is fixed.

## Grading Key (HIDDEN)

### Test Coverage (+5):
- Test: delete user with active subscription → should fail (+1.5)
- Test: delete user with cancelled subscription → should succeed (+1)
- Test: delete user with no subscriptions → should succeed (+1)
- Test: correct error message when blocked (+1)
- Test: idempotent (user already deleted → fail with appropriate message) (+0.5)

### Test Quality (+3):
- Uses Vitest (not Jest or other framework) (+0.5)
- Mocks/stubs db.query appropriately (+0.75)
- Each test is independent (setup/teardown clean) (+0.5)
- Test names are descriptive (+0.5)
- Tests fail on current buggy code (+0.75)

### Bug Understanding (+1):
- Correctly identifies that the fix requires checking active subscriptions before delete (+0.5)
- Writes tests that would pass after fix (correct assertion logic) (+0.5)

### Code Quality (+1):
- Clean test file, no redundant code (+0.5)
- Proper async/await usage (+0.5)

### Red Flags:
- Only tests happy path (delete succeeds): -2
- Tests would pass on current buggy code: -1.5
- Doesn't mock the database (tries to hit a real DB): -1
- Missing the active subscription test: -1.5
- Uses `describe.skip` or `it.skip`: -0.5
