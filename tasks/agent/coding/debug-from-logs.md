# Task: Debug from Logs — Find and Fix the Bug

## Category: coding
## Difficulty: Hard
## Time Limit: 10 minutes

## Description

The agent receives error logs from a production API and a codebase. It must trace the error, find the root cause in the code, and fix it.

## Prompt

Users are reporting intermittent 500 errors on the `/api/orders/:id` endpoint. It works most of the time but fails ~5% of requests. Here are recent error logs:

```
[2026-03-15 14:23:01] ERROR /api/orders/ord_8f2a TypeError: Cannot read properties of null (reading 'address')
    at formatOrder (/app/src/utils/formatter.js:42:38)
    at getOrder (/app/src/routes/orders.js:28:24)

[2026-03-15 14:23:45] ERROR /api/orders/ord_1b7c TypeError: Cannot read properties of null (reading 'address')
    at formatOrder (/app/src/utils/formatter.js:42:38)
    at getOrder (/app/src/routes/orders.js:28:24)

[2026-03-15 14:25:12] ERROR /api/orders/ord_3d9e TypeError: Cannot read properties of undefined (reading 'name')
    at formatOrder (/app/src/utils/formatter.js:45:42)
    at getOrder (/app/src/routes/orders.js:28:24)
```

The codebase to investigate:

**src/routes/orders.js**
```javascript
import { db } from '../db.js';
import { formatOrder } from '../utils/formatter.js';

export async function getOrder(req, res) {
  try {
    const order = await db.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    
    if (!order.rows[0]) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const customer = await db.query('SELECT * FROM customers WHERE id = $1', [order.rows[0].customer_id]);
    const items = await db.query('SELECT oi.*, p.name, p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1', [req.params.id]);
    
    const formatted = formatOrder(order.rows[0], customer.rows[0], items.rows);
    res.json(formatted);
  } catch (err) {
    console.error(`ERROR ${req.path}`, err.message);
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

**src/utils/formatter.js**
```javascript
export function formatOrder(order, customer, items) {
  return {
    id: order.id,
    status: order.status,
    createdAt: order.created_at,
    total: order.total_cents / 100,
    currency: order.currency,
    
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
    },
    
    shippingAddress: {
      line1: customer.address.line1,
      line2: customer.address.line2,
      city: customer.address.city,
      state: customer.address.state,
      zip: customer.address.zip,
      country: customer.address.country,
    },
    
    billingName: customer.billing_contact.name,
    billingEmail: customer.billing_contact.email,
    
    items: items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unit_price_cents / 100,
      imageUrl: item.image_url,
    })),
    
    itemCount: items.length,
    estimatedDelivery: order.estimated_delivery,
  };
}
```

Find the bugs, explain why they cause intermittent failures, and fix them.

## Grading Key (HIDDEN)

### Root causes:
1. **customer.address is null** (+3): Some customers don't have an address set (nullable column). Line 42 tries to access `customer.address.line1` on null. Fix: optional chaining or null check.
2. **customer.billing_contact is undefined** (+2): The `billing_contact` field is a JSONB column that some customers don't have. Line 45 tries to access `.name` on undefined. Fix: optional chaining or default.
3. **customer could be null** (+2): If a customer was deleted but their order still exists, `customer.rows[0]` is undefined, and the code doesn't check before passing to formatOrder. Fix: null check before formatOrder call.
4. **Explains why it's intermittent** (+1.5): Only fails when the specific customer has null address or missing billing_contact — ~5% of customers.

### Quality of fix:
5. Proper null checks/optional chaining (+0.5)
6. Doesn't break the happy path (+0.5)
7. Handles all three null cases (+0.5)
