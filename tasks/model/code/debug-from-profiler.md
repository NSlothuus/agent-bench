# Task: Debug from Profiler — Find the Performance Bottleneck

## Category: code
## Difficulty: Hard
## Binary Check: binary_check_debug_profiler

## Prompt

Your team's API is slow. P95 latency is 1.8 seconds when it should be under 200ms. The team suspects the database but isn't sure. You're given a CPU profile and a heap snapshot analysis.

Analyze the profiler output below and identify the root cause(s). Then look at the code and propose a fix.

---

**CPU Profile (top 10 functions by self-time):**
```
Function                              self(ms)  total(ms)  calls
────────────────────────────────────────────────────────────────
IncomingMessage.onCommmon(http)         1203      1802       1
── ServerResponse.emit(.............)    890      1001       2
─────── Router.requestHandler          801       1205       1
───────── getProductListing            780       1103       1
─────────── db.query                  702       702        3
─────────── JSON.stringify             312       312        1
─────────── products.forEach           45        89        147
───────────── calculateDiscount         40        40        147
─────────── enrichWithSeller           320       415        147
────────────── db.query               280       280        147
────────────── JSON.stringify          35        35        147
```

**Heap Snapshot — Object Counts (filtered to largest):**
```
Constructor              | Count  | Total Size | Retained By
─────────────────────────────────────────────────────────────────
Product                  | 12,847 | 8.2 MB     | products array
Seller                   | 12,847 | 4.1 MB     | product.seller ref
OrderItem                | 89,234 | 12.3 MB    | orders array
Order                    | 14,723 | 9.8 MB    | pendingOrders Map
DiscountRule             | 45,892 | 2.1 MB    | discountCache Map
CacheEntry               | 234    | 1.8 GB     | global cache
```

**Heap Allocation Timeline:**
```
Time 0s:   45 MB heap
Time 10s:  78 MB heap (growing)
Time 30s:  120 MB heap (still growing)
Time 60s:  180 MB heap
GC runs:    Every 45s (stop-the-world pauses visible in trace)
```

---

**Relevant code — `src/routes/products.js`:**
```javascript
export async function getProductListing(req, res) {
  const { category, page = 1, limit = 20 } = req.query;
  
  const products = await db.query(
    `SELECT p.*, c.name as category_name 
     FROM products p 
     LEFT JOIN categories c ON p.category_id = c.id 
     WHERE p.active = true AND c.slug = $1
     ORDER BY p.created_at DESC 
     LIMIT $2`,
    [category, limit * page]
  );
  
  // Enrich each product with seller info and calculate discounts
  const enriched = [];
  for (const product of products.rows) {
    const seller = await db.query(
      'SELECT * FROM sellers WHERE id = $1',
      [product.seller_id]
    );
    
    const discount = calculateDiscount(product.price_cents, product.seller_id);
    enriched.push({ ...product, seller: seller.rows[0], discount });
  }
  
  res.json({ products: enriched, page });
}
```

```javascript
// In-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function calculateDiscount(priceCents, sellerId) {
  const key = `${sellerId}`;
  if (cache.has(key)) {
    const entry = cache.get(key);
    if (Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.discount;
    }
  }
  
  // Load ALL discount rules from DB (problematic)
  const rules = db.querySync('SELECT * FROM discount_rules WHERE seller_id = $1', [sellerId]);
  
  // Compute discount
  const discount = applyRules(rules, priceCents);
  
  cache.set(key, { discount, timestamp: Date.now() });
  return discount;
}
```

---

**What the profiler shows:**
1. `getProductListing` takes 1103ms total
2. `db.query` inside the forEach loop for `enrichWithSeller` is called 147 times (once per product in a category with 147 products)
3. `calculateDiscount` is called 147 times, each time running a full `db.querySync` to load ALL discount rules
4. The global cache (`CacheEntry`) is retaining 1.8 GB

---

Find the bugs, explain the root cause, and propose fixes.

## Grading Key (HIDDEN)

### Root Cause Identification (+4):
- **N+1 query in enrichment loop** — 147 separate DB queries instead of batch (+1.5)
- **Synchronous DB call in calculateDiscount** — `db.querySync` blocks the event loop (+1)
- **Cache key too broad** — `cache.set(key, ...)` on every discount calculation, never cleared, causing unbounded growth (+1)
- **SELECT * in discount rules** — loading entire table instead of filtered rules (+0.5)

### Performance Impact Analysis (+2):
- Correctly identifies why P95 is 1.8s (N+1 × 147 + sync queries) (+0.75)
- Identifies the GC pressure as a symptom of the 1.8GB cache (+0.75)
- Explains why the 5-minute TTL doesn't help (no cleanup of expired entries) (+0.5)

### Fix Quality (+3):
- **Fix 1:** Batch query for sellers (single query with `WHERE id IN (...)`) (+1)
- **Fix 2:** Async query for discounts, not sync (+0.5)
- **Fix 3:** Fix cache TTL cleanup (LRU eviction or proper expiration check with actual expiration, not just timestamp check) (+1)
- **Fix 4:** Query only relevant discount rules, not SELECT * (+0.5)

### Additional Issues (+1):
- **Pagination bug** — `LIMIT $2` uses `limit * page` meaning page 2 returns 40 rows but only shows 20 (off-by-one in offset) (+0.5)
- **No database index** — mentions indexes on category_slug and created_at would help (+0.25)
- **Cache invalidation** — when discount rules change, cache isn't cleared (+0.25)

### Red Flags:
- Suggests adding Redis caching without fixing the N+1: -0.75
- Suggests "just add indexing" without fixing the queries: -0.5
- Doesn't identify the N+1 as the primary issue: -0.5
- Claims the profiler shows "database is the problem" without distinguishing N+1 from missing indexes: -0.5
