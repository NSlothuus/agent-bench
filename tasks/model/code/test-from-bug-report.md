# Task: Write Tests from a Bug Report

## Category: code
## Difficulty: Medium
## Binary Check: binary_check_test_writing

## Prompt

A QA engineer filed this bug report. Your job: write comprehensive test cases that would have caught this bug before it shipped.

---

**Bug Report: PROJ-2847 — "Order confirmation emails sent to wrong customers"**

**Severity:** P1 (customer data exposure)

**Description:**
After the v2.3.1 deploy on March 28th, confirmation emails for completed orders are occasionally delivered to the wrong customer. Affected orders appear to have been placed within a 30-second window around the same time. Investigation found that the order confirmation email job processes orders in batches of 10, and when two orders from different customers have the same `created_at` timestamp (rounded to the second), the email job sometimes sends Customer A's order details to Customer B's email address.

**Steps to reproduce:**
1. Place order A at exactly 14:32:07
2. Place order B within 30 seconds of order A (anywhere in the 14:32:07-14:32:37 window)
3. Wait for batch email job to run
4. Observe: one customer receives the other's order details

**Expected behavior:**
Each customer receives only their own order confirmation email.

**Root cause (found in code review):**
The `email job` queries orders with `WHERE status = 'completed' AND email_sent = false AND created_at >= $1 AND created_at < $2` using a batch window. The query returns orders correctly, but the email sending loop uses a shared `order` variable in a closure, causing a race condition in the async email dispatch loop. Additionally, the `email_sent` flag update happens after the email is sent (not before), so a crash between sending and flagging causes duplicate sends.

---

Write a test file that covers this bug thoroughly. Use the testing framework of your choice (Vitest, Jest, etc.). The code under test has these relevant exports:

```typescript
// src/services/orderConfirmation.ts
export interface Order {
  id: string;
  customerId: string;
  customerEmail: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  totalCents: number;
  items: OrderItem[];
  createdAt: Date;
  emailSent: boolean;
}

export async function sendOrderConfirmations(batchStart: Date, batchEnd: Date): Promise<{
  sent: number;
  failed: number;
  errors: Array<{ orderId: string; error: string }>;
}>

export async function markEmailSent(orderId: string): Promise<void>

// src/db.ts
export async function getOrdersForEmailBatch(start: Date, end: Date): Promise<Order[]>
export async function updateEmailSent(orderId: string, sent: boolean): Promise<void>
```

## Grading Key (HIDDEN)

### Bug Coverage (+5):
- Test for the race condition with same-timestamp orders (+1.5)
- Test for concurrent email dispatches causing cross-contamination (+1.5)
- Test that `email_sent` flag is set BEFORE email is sent (not after) (+1)
- Test for the batch window boundary (order at exactly `batchEnd`): (+0.5)
- Test for duplicate send prevention (crash recovery scenario): (+0.5)

### Test Quality (+3):
- Tests are independent (don't rely on execution order) (+0.75)
- Mocks/stubs are appropriate (email service, database) (+0.75)
- Edge cases at the timestamp boundary are tested (+0.75)
- Tests would fail on the buggy code, pass on fixed code (+0.75)

### Test Structure (+1):
- Uses a real testing framework (not pseudo-code) (+0.5)
- Descriptive test names that explain what's being tested (+0.5)

### Completeness (+1):
- Tests both the "same timestamp" and "concurrent dispatch" scenarios (+0.5)
- Tests that crash between send and flagging causes issues (+0.5)

### Red Flags:
- Only tests happy path: -1
- Tests don't actually call `sendOrderConfirmations`: -1
- Mocks the entire function instead of testing it: -0.5
- Uses `setTimeout` to simulate concurrency (flaky): -0.5
