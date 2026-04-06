# Task: Write API Documentation

## Category: writing
## Difficulty: Medium
## Binary Check: binary_check_api_docs

## Prompt

Write clear, developer-friendly documentation for this webhook endpoint. A developer integrating with your platform should be able to implement webhook handling from just this documentation.

Here's the endpoint spec:

```
POST /webhooks/events
Content-Type: application/json
X-Webhook-Signature: sha256=<hex-encoded HMAC-SHA256>
X-Webhook-Timestamp: <unix-timestamp>

Body: {
  "id": "evt_abc123",
  "type": "order.completed" | "order.refunded" | "payment.failed" | "customer.created" | "subscription.renewed" | "subscription.cancelled",
  "created_at": "2026-03-15T14:30:00Z",
  "data": { ... event-specific payload ... }
}

Expected response: 200 OK (within 5 seconds)
Retry policy: 5 attempts with exponential backoff (1min, 5min, 30min, 2hr, 24hr)
Signature: HMAC-SHA256 of "timestamp.raw_body" using your webhook secret
```

Write documentation that includes:
1. Overview of what webhooks are and when to use them
2. How to verify the signature (with code example in at least one language)
3. All event types with example payloads
4. Best practices (idempotency, ordering, error handling)
5. Testing/debugging section

## Grading Key (HIDDEN)

### Content completeness:
1. **Signature verification with code** (+2): Shows actual code (any language) for HMAC-SHA256 verification including the timestamp.body concatenation
2. **All 6 event types documented** (+1.5): Lists each event type with at least a brief description
3. **Example payloads** (+1): Shows realistic JSON payloads for at least 2 events
4. **Retry policy explained** (+0.5): Mentions the 5 attempts with specific timing
5. **Best practices section** (+1): Idempotency keys, async processing, 200 response quickly
6. **Testing section** (+0.5): How to test locally (ngrok, CLI tool, or test endpoint)

### Writing quality:
7. **Clear structure** (+1): Logical flow, scannable headings, easy to navigate
8. **Code examples work** (+1): Code is syntactically correct and would actually work
9. **No banned AI phrases** (-0.5 each, max -3): Same banned phrase list as writing tasks
10. **Concise** (+0.5): Gets to the point without unnecessary preamble

### Bonus:
- Mentions constant-time comparison for signature: +0.5
- Mentions replay attack prevention (check timestamp age): +0.5
- Mentions responding 200 immediately and processing async: +0.25
