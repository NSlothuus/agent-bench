# Task: Refactor — Split Large File into Modules

## Category: coding
## Difficulty: Hard
## Time Limit: 10 minutes

## Description

The agent receives a 400+ line file that does too much. It must split it into focused modules while keeping all existing functionality working.

## Prompt

This `utils.js` file has grown out of control. It handles date formatting, validation, string manipulation, API helpers, and error handling — all in one file. Every file in the project imports from it.

Split it into focused modules:
- `utils/dates.js` — date formatting and parsing
- `utils/validation.js` — input validation functions
- `utils/strings.js` — string manipulation helpers
- `utils/api.js` — API request helpers
- `utils/errors.js` — custom error classes and error handling

Then update `utils/index.js` to re-export everything (so existing imports still work).

**Requirements:**
- All existing imports like `import { formatDate, validateEmail } from '../utils'` must still work
- No functionality lost
- Each module should be self-contained (no circular imports between util modules)
- Add JSDoc comments to each function if missing

**src/utils.js** (the file to split):
```javascript
// Date helpers
export function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes);
}

export function parseRelativeDate(str) {
  const match = str.match(/^(\d+)\s*(day|week|month|year)s?\s*(ago|from now)$/i);
  if (!match) return null;
  const [, amount, unit, direction] = match;
  const multiplier = direction.toLowerCase() === 'ago' ? -1 : 1;
  const date = new Date();
  const num = parseInt(amount) * multiplier;
  
  switch (unit.toLowerCase()) {
    case 'day': date.setDate(date.getDate() + num); break;
    case 'week': date.setDate(date.getDate() + num * 7); break;
    case 'month': date.setMonth(date.getMonth() + num); break;
    case 'year': date.setFullYear(date.getFullYear() + num); break;
  }
  return date;
}

export function isBusinessDay(date) {
  const day = new Date(date).getDay();
  return day !== 0 && day !== 6;
}

export function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result)) added++;
  }
  return result;
}

// Validation helpers
export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone) {
  return /^\+?[\d\s-()]{10,}$/.test(phone);
}

export function validateUrl(url) {
  try { new URL(url); return true; } catch { return false; }
}

export function validateRequired(obj, fields) {
  const missing = fields.filter(f => !obj[f] && obj[f] !== 0 && obj[f] !== false);
  return missing.length === 0 ? null : `Missing required fields: ${missing.join(', ')}`;
}

export function sanitizeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

// String helpers
export function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(str, maxLen, suffix = '...') {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - suffix.length) + suffix;
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function pluralize(count, singular, plural) {
  return count === 1 ? singular : (plural || singular + 's');
}

export function maskEmail(email) {
  const [user, domain] = email.split('@');
  return user.slice(0, 2) + '***@' + domain;
}

// API helpers
export async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
      if (res.ok) return res;
      if (res.status >= 500 && i < maxRetries) {
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }
      throw new ApiError(`HTTP ${res.status}`, res.status);
    } catch (err) {
      lastError = err;
      if (i < maxRetries) await sleep(Math.pow(2, i) * 1000);
    }
  }
  throw lastError;
}

export async function fetchJson(url, options = {}) {
  const res = await fetchWithRetry(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  return res.json();
}

export function buildQueryString(params) {
  return Object.entries(params)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

// Error classes
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

export class ApiError extends AppError {
  constructor(message, statusCode) {
    super(message, statusCode);
    this.name = 'ApiError';
  }
}

export class ValidationError extends AppError {
  constructor(message, fields = []) {
    super(message, 400);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

// General helpers
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function groupBy(arr, key) {
  return arr.reduce((groups, item) => {
    const val = typeof key === 'function' ? key(item) : item[key];
    (groups[val] = groups[val] || []).push(item);
    return groups;
  }, {});
}
```

## Grading Key (HIDDEN)

### File Structure (+3):
- Created utils/dates.js with 4 date functions (+0.75)
- Created utils/validation.js with 5 validation functions (+0.75)
- Created utils/strings.js with 5 string functions (+0.75)
- Created utils/api.js with 3 API functions (+0.5) (note: needs sleep from another module or duplicated)
- Created utils/errors.js with 4 error classes (+0.25)

### Re-exports (+2):
- utils/index.js re-exports everything (+1.5)
- Existing imports still work (+0.5)

### No Functionality Lost (+2):
- All functions preserved (+1)
- sleep, chunk, groupBy placed somewhere logical (+0.5)
- No circular imports (+0.5)

### Quality (+3):
- JSDoc comments added (+1)
- Self-contained modules (+0.5)
- api.js handles its dependency on sleep and AppError correctly (+0.5)
- Clean exports (named, not default) (+0.5)
- sanitizeHtml placed in strings or validation (either is fine) (+0.5)
