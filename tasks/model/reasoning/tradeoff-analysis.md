# Task: Tradeoff Analysis — Postgres vs DynamoDB

## Category: reasoning
## Difficulty: Hard
## Binary Check: binary_check_tradeoff

## Prompt

Your startup is building a SaaS project management tool (think Linear/Jira competitor). You're choosing between PostgreSQL and DynamoDB for the primary datastore. The team is split.

Here are the requirements:
- **Users:** Starting with ~100 orgs, targeting 10K orgs in 2 years
- **Data model:** Projects → Issues → Comments, with labels, assignees, custom fields
- **Query patterns:** Complex filtering (status + assignee + label + date range), full-text search on titles/descriptions, real-time updates, activity feeds
- **Team:** 4 backend engineers, 2 have strong Postgres experience, 1 has AWS/DynamoDB experience
- **Infrastructure:** Currently on AWS (ECS, RDS available)
- **Budget:** Seed-funded, cost-conscious but not broke
- **Performance:** Sub-100ms for issue listing, sub-50ms for single issue fetch
- **Compliance:** SOC2 in progress, some customers need data residency (EU)

Make a recommendation. Don't just list pros/cons — tell us what to use and why. Acknowledge the tradeoffs honestly.

## Grading Key (HIDDEN)

### The "right" answer: PostgreSQL (but with nuance)

For this use case, Postgres is clearly the better fit:
- Complex relational data (projects → issues → comments)
- Complex filtering + sorting
- Full-text search (tsvector)
- Team experience (2 of 4 know it well)
- RDS already available on AWS
- Data residency straightforward (RDS in eu-west-1)

DynamoDB would be a poor fit because:
- Complex ad-hoc queries require pre-planned access patterns
- Many-to-many relationships (labels, assignees) are painful
- Full-text search requires OpenSearch sidecar
- Single-table design adds complexity the team doesn't need

### Scoring dimensions:

1. **Makes a clear recommendation** (+2): Says "use Postgres" (or DynamoDB with strong justification). Wishy-washy "it depends" with no decision = 0.
2. **Correct reasoning for the recommendation** (+2): The relational data model, query complexity, and team experience are the key factors.
3. **Acknowledges honest tradeoffs** (+1.5): Even if recommending Postgres, mentions where DynamoDB would be better (unlimited scale, predictable latency at extreme scale, serverless ops).
4. **Addresses the specific requirements** (+1.5): Doesn't just give generic advice — references the actual data model, team size, query patterns from the prompt.
5. **Practical migration path** (+1): Mentions when/if they might need to add DynamoDB later (activity feeds, event stores, session data).
6. **Cost analysis** (+0.5): RDS vs DynamoDB pricing for their scale.
7. **Team factor** (+0.5): Acknowledges 2/4 engineers know Postgres = faster shipping.
8. **Data residency** (+0.5): Addresses SOC2/EU requirement.
9. **Performance validation** (+0.5): Sub-100ms listing is easily achievable with proper indexes in Postgres.

### Red flags:
- Recommends DynamoDB without addressing the relational complexity: -2
- Pure pros/cons list with no recommendation: -1
- Mentions irrelevant technologies (MongoDB, CockroachDB) without being asked: -0.5
- Over-engineers (suggests multi-database from day 1): -1
