# Task: Recovery — Failed Deployment Halfway Through

## Category: recovery
## Difficulty: Hard
## Time Limit: 8 minutes
## Binary Check: binary_check_agent_recovery

## Description

A deployment script failed halfway through a database migration + code deploy. The agent must assess the damage, recover to a consistent state, and complete the deployment.

## Setup Files

### deploy-log.txt
```
[14:32:01] Starting deployment v2.4.1...
[14:32:02] ✅ Step 1/6: Built application successfully
[14:32:05] ✅ Step 2/6: Database backup created → backups/db-20260406-143205.sql
[14:32:08] ✅ Step 3/6: Migration 001_add_analytics.sql applied
[14:32:09] ✅ Step 4/6: Migration 002_rename_columns.sql applied
[14:32:10] ❌ Step 5/6: Migration 003_add_indexes.sql FAILED
            Error: relation "events" does not exist
            HINT: Perhaps you meant "analytics_events"?
[14:32:10] ⚠️  Deployment aborted. Steps 5-6 not completed.
[14:32:10] ⚠️  WARNING: Migrations 001-002 were applied but code is still on v2.4.0
[14:32:10] ⚠️  Database and code are now out of sync!
```

### migrations/001_add_analytics.sql
```sql
CREATE TABLE analytics_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### migrations/002_rename_columns.sql
```sql
ALTER TABLE users RENAME COLUMN username TO display_name;
ALTER TABLE users ADD COLUMN username VARCHAR(100) GENERATED ALWAYS AS (lower(display_name)) STORED;
```

### migrations/003_add_indexes.sql
```sql
-- BUG: References wrong table name
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_user ON events(user_id);
CREATE INDEX idx_events_created ON events(created_at);
CREATE INDEX idx_users_username ON users(username);
```

### migrations/004_add_constraints.sql
```sql
ALTER TABLE analytics_events ADD CONSTRAINT chk_event_type 
    CHECK (event_type IN ('page_view', 'click', 'form_submit', 'api_call', 'error'));
ALTER TABLE analytics_events ADD COLUMN session_id UUID;
```

### src/db.js (current v2.4.0 code — references old column names)
```javascript
export async function getUser(id) {
  return db.query('SELECT id, username, email FROM users WHERE id = $1', [id]);
}

export async function createUser(username, email) {
  return db.query(
    'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
    [username, email]
  );
}
```

### src/db.v2.js (new v2.4.1 code — references new column names)
```javascript
export async function getUser(id) {
  return db.query('SELECT id, display_name, username, email FROM users WHERE id = $1', [id]);
}

export async function createUser(displayName, email) {
  return db.query(
    'INSERT INTO users (display_name, email) VALUES ($1, $2) RETURNING *',
    [displayName, email]
  );
}

export async function trackEvent(eventType, userId, payload) {
  return db.query(
    'INSERT INTO analytics_events (event_type, user_id, payload) VALUES ($1, $2, $3)',
    [eventType, userId, payload]
  );
}
```

### backups/restore.sh
```bash
#!/bin/bash
# Restore database from backup
pg_restore -d myapp backups/db-20260406-143205.sql
```

## Expected Agent Behavior

The agent should:
1. **Assess the situation**: Understand that migrations 001-002 applied but code is still v2.4.0, creating a mismatch (code references `username` column which was renamed to `display_name`)
2. **Choose a recovery strategy**: Either roll forward (fix migration 003 and continue) or roll back (restore from backup)
3. **Fix migration 003**: Change `events` → `analytics_events` in the SQL
4. **Apply remaining migrations** (003 fixed + 004)
5. **Deploy new code** (swap db.js for db.v2.js or equivalent)
6. **Verify consistency**: Code and database are in sync

## Grading Key (HIDDEN)

### Recovery Quality:
1. **Correctly assessed the situation** (+2): Identified the mismatch between applied migrations and running code
2. **Chose roll-forward** (+1): Roll-forward is correct here (backup exists but rolling back loses migrations 001-002 and any data written to analytics_events since)
3. **Fixed migration 003** (+2): Changed `events` to `analytics_events`
4. **Applied remaining migrations** (+1.5): 003 (fixed) and 004
5. **Updated code** (+1.5): Switched to v2.4.1 code (db.v2.js)
6. **Verified end state** (+1): Checked that everything is consistent

### Agent-specific:
- Didn't restore from backup unnecessarily (+0.5): Rolling back would lose the analytics_events table and any data
- Explained reasoning before acting (+0.5)
- Didn't touch files outside the migration/deploy scope (+0.5)
- Completed in <5 min (+0.5)
