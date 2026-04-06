# Task: Performance Optimization — Slow API Endpoint

## Category: code
## Difficulty: Hard
## Binary Check: binary_check_perf_optimization

## Prompt

Your team's product listing API endpoint has a P95 latency of 2.3 seconds. The SLA is 500ms. The endpoint serves a product catalog page with filters, sorting, and pagination. Traffic is ~200 req/s.

Here's the handler and related code. Find all performance issues and explain how to fix each one.

```typescript
// routes/products.ts
import { db } from '../db';
import { cache } from '../cache';

interface ProductQuery {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
  page?: number;
  limit?: number;
}

export async function getProducts(query: ProductQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  // Get total count for pagination
  let countSql = 'SELECT COUNT(*) as total FROM products WHERE active = true';
  const countParams: unknown[] = [];

  if (query.category) {
    countSql += ` AND category_id = (SELECT id FROM categories WHERE slug = '${query.category}')`;
  }
  if (query.minPrice) {
    countSql += ` AND price >= ${query.minPrice}`;
  }
  if (query.maxPrice) {
    countSql += ` AND price <= ${query.maxPrice}`;
  }
  if (query.search) {
    countSql += ` AND (name LIKE '%${query.search}%' OR description LIKE '%${query.search}%')`;
  }

  const countResult = await db.query(countSql, countParams);
  const total = countResult.rows[0].total;

  // Get products
  let sql = `
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.active = true
  `;

  if (query.category) {
    sql += ` AND c.slug = '${query.category}'`;
  }
  if (query.minPrice) {
    sql += ` AND p.price >= ${query.minPrice}`;
  }
  if (query.maxPrice) {
    sql += ` AND p.price <= ${query.maxPrice}`;
  }
  if (query.search) {
    sql += ` AND (p.name LIKE '%${query.search}%' OR p.description LIKE '%${query.search}%')`;
  }

  switch (query.sort) {
    case 'price_asc': sql += ' ORDER BY p.price ASC'; break;
    case 'price_desc': sql += ' ORDER BY p.price DESC'; break;
    case 'newest': sql += ' ORDER BY p.created_at DESC'; break;
    case 'popular': sql += ' ORDER BY p.view_count DESC'; break;
    default: sql += ' ORDER BY p.created_at DESC';
  }

  sql += ` LIMIT ${limit} OFFSET ${offset}`;

  const products = await db.query(sql);

  // Enrich with images, reviews, and seller info
  const enrichedProducts = [];
  for (const product of products.rows) {
    const images = await db.query(
      'SELECT url, alt_text FROM product_images WHERE product_id = $1 ORDER BY position',
      [product.id]
    );

    const reviews = await db.query(
      'SELECT r.*, u.name as reviewer_name, u.avatar_url FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.product_id = $1 ORDER BY r.created_at DESC LIMIT 3',
      [product.id]
    );

    const seller = await db.query(
      'SELECT s.*, (SELECT AVG(rating) FROM reviews WHERE seller_id = s.id) as avg_rating, (SELECT COUNT(*) FROM products WHERE seller_id = s.id AND active = true) as product_count FROM sellers s WHERE s.id = $1',
      [product.seller_id]
    );

    enrichedProducts.push({
      ...product,
      images: images.rows,
      reviews: reviews.rows,
      averageRating: reviews.rows.length > 0
        ? reviews.rows.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviews.rows.length
        : null,
      seller: seller.rows[0],
    });
  }

  // Calculate category facets
  const facets = await db.query(`
    SELECT c.slug, c.name, COUNT(*) as count
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.active = true
    ${query.search ? `AND (p.name LIKE '%${query.search}%' OR p.description LIKE '%${query.search}%')` : ''}
    GROUP BY c.slug, c.name
    ORDER BY count DESC
  `);

  return {
    products: enrichedProducts,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    facets: facets.rows,
  };
}
```

Database has ~50K products, ~200 categories, ~500K reviews. Products table has indexes on `id`, `category_id`, `created_at`, `active`.

## Grading Key (HIDDEN)

### Critical Performance Issues:
1. **N+1 query problem** (CRITICAL): For each of the 20 products, 3 additional queries (images, reviews, seller) = 60 extra queries per request. Fix: batch with IN clause or JOIN. (+2.5)
2. **SQL injection vulnerability** (CRITICAL): String interpolation in SQL (`'${query.search}'`). This is both a security AND performance issue (can't use prepared statement caching). Fix: parameterized queries. (+2)
3. **LIKE '%search%' without full-text index** (HIGH): `LIKE '%term%'` forces full table scan on 50K rows. Fix: use full-text search (tsvector/GIN index in Postgres) or search service. (+1.5)
4. **Duplicate query logic** (HIGH): Count query and main query have nearly identical WHERE clauses but are separate queries. Fix: use window function `COUNT(*) OVER()` or a CTE. (+1)
5. **No caching** (HIGH): `cache` is imported but never used. Product listings with same filters should be cached. Fix: cache by query hash with TTL. (+1)
6. **Subquery in WHERE for category** (MEDIUM): `category_id = (SELECT id FROM categories WHERE slug = ...)` runs a subquery. Minor but should be a JOIN or pre-resolved. (+0.5)
7. **Correlated subqueries in seller enrichment** (MEDIUM): `(SELECT AVG(rating)...)` and `(SELECT COUNT(*)...)` inside the seller query are correlated subqueries. (+0.5)
8. **No OFFSET optimization** (MEDIUM): `OFFSET 1000` scans and discards 1000 rows. For deep pagination, use cursor-based (keyset) pagination. (+0.5)
9. **Facets query runs every request** (LOW): Category facets rarely change. Should be cached or computed separately. (+0.25)

### Scoring:
- Found N+1: +2.5
- Found SQL injection: +2
- Found LIKE scan: +1.5
- Found duplicate query: +1
- Found no caching: +1
- Found issues 6-9: +0.5/+0.5/+0.5/+0.25
- False positive: -0.5 each (max -2)
