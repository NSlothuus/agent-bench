# Task: Research — Write Integration Documentation

## Category: research
## Difficulty: Medium
## Time Limit: 8 minutes
## Binary Check: binary_check_agent_research

## Description

The agent receives a partially documented API client and must research the API (using provided docs/examples), fill in the missing documentation, and write a getting-started guide.

## Setup Files

### README.md
```markdown
# Stripe-like Payment API Client

A Node.js client for the Acme Payments API.

## TODO
- Document all available methods
- Add error handling examples
- Write getting started guide
```

### src/client.js
```javascript
export class AcmePayments {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.acme-payments.example.com/v1';
  }

  async createCharge(amount, currency, source, description) {
    // Creates a new charge
  }

  async getCharge(chargeId) {
    // Retrieves a charge by ID
  }

  async refundCharge(chargeId, amount) {
    // Refunds a charge (full or partial)
  }

  async listCharges(customerId, limit, startingAfter) {
    // Lists charges, supports pagination
  }

  async createCustomer(email, name, metadata) {
    // Creates a new customer
  }

  async attachPaymentMethod(customerId, paymentMethodId) {
    // Attaches a payment method to a customer
  }
}
```

### docs/api-reference.txt
```
ACME PAYMENTS API v1

Authentication: Bearer token in Authorization header
Base URL: https://api.acme-payments.example.com/v1

POST /charges
  Body: { amount: integer (cents), currency: string, source: string, description?: string }
  Returns: { id: string, amount: integer, currency: string, status: "pending"|"succeeded"|"failed", created: integer }
  Errors: 400 (invalid params), 402 (card declined), 429 (rate limited)

GET /charges/:id
  Returns: charge object

POST /charges/:id/refund
  Body: { amount?: integer } — omit amount for full refund
  Returns: { id: string, charge_id: string, amount: integer, status: "pending"|"succeeded" }

GET /charges?customer=:id&limit=:n&starting_after=:id
  Returns: { data: charge[], has_more: boolean }

POST /customers
  Body: { email: string, name?: string, metadata?: object }
  Returns: { id: string, email: string, name: string, metadata: object, created: integer }

POST /customers/:id/payment-methods
  Body: { payment_method_id: string }
  Returns: { id: string, customer_id: string, type: string, last4: string }

Rate limits: 100 requests per minute per API key
Idempotency: Send Idempotency-Key header for POST requests

Error format: { error: { type: string, message: string, code?: string } }
Common error types: "invalid_request", "card_error", "rate_limit_error", "api_error"
```

### docs/examples.txt
```
Example: Create a charge

  curl -X POST https://api.acme-payments.example.com/v1/charges \
    -H "Authorization: Bearer sk_test_123" \
    -H "Content-Type: application/json" \
    -d '{"amount": 2000, "currency": "usd", "source": "tok_visa"}'

  Response:
  {
    "id": "ch_1abc",
    "amount": 2000,
    "currency": "usd",
    "status": "succeeded",
    "created": 1712000000
  }

Example: Handle errors

  try {
    const charge = await client.createCharge(2000, 'usd', 'tok_declined');
  } catch (err) {
    if (err.type === 'card_error') {
      // Card was declined — ask customer for different card
    } else if (err.type === 'rate_limit_error') {
      // Too many requests — back off and retry
    }
  }
```

## Expected Output

The agent should produce:
1. Updated README.md with complete documentation
2. JSDoc comments on all client methods
3. A getting-started guide section
4. Error handling documentation
5. Pagination examples

## Grading Key (HIDDEN)

### Documentation Quality:
1. **All 6 methods documented** (+2): Each method has params, return type, description
2. **Error handling section** (+1.5): Covers error types, how to catch them
3. **Getting started guide** (+1.5): Install, init client, make first charge
4. **Pagination example** (+1): Shows how to use listCharges with cursor
5. **Code examples** (+1.5): At least 3 working code examples
6. **Accurate to API spec** (+1.5): Doesn't invent features not in the docs
7. **Idempotency documented** (+0.5): Mentions Idempotency-Key header
8. **Rate limiting documented** (+0.5): Mentions 100 req/min limit

### Agent-specific:
- Read both docs files before writing (+0.5)
- Didn't hallucinate API features (+0.5)
- Clean, well-formatted output (+0.5)
