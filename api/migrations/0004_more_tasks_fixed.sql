-- Agent Bench Seed Data — Phase 2 Tasks
-- Migration 0004: 6 new benchmark tasks

INSERT OR REPLACE INTO bench_tasks (id, category, title, prompt, grading_key, binary_check_fn, specialist_name, active, version)
VALUES (
  'code-build',
  'code',
  'Toast Notification System',
  '# Task: Build a Toast Notification System

## Objective

Build a production-quality toast notification system in vanilla TypeScript. No frameworks, no dependencies — just TypeScript that compiles to a single JS file you could drop into any project.

## Requirements

### Core Features
1. **Queue management** — Maximum 3 toasts visible at once. Additional toasts queue and appear as existing ones dismiss.
2. **Auto-dismiss with progress bar** — Each toast has a visible countdown progress bar that shrinks over the duration.
3. **Stacking with animations** — Toasts stack vertically. When one is dismissed, others slide smoothly into position.
4. **Pause on hover** — Hovering over ANY visible toast pauses ALL timers and progress bars. Resuming continues from where they left off.
5. **Toast types** — Support `success`, `error`, `warning`, `info` with distinct visual styling.

### API Surface

```typescript
interface ToastOptions {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number; // ms, default 5000
  dismissible?: boolean; // show X button, default true
}

// Public API
function toast(options: ToastOptions): string; // returns toast ID
function toast.success(message: string, duration?: number): string;
function toast.error(message: string, duration?: number): string;
function toast.dismiss(id: string): void;
function toast.dismissAll(): void;
```

### Edge Cases to Handle
- Rapid-fire: calling `toast()` 20 times in quick succession should queue properly, not crash or overlap
- Dismiss during animation: dismissing a toast while another is sliding should not break layout
- Zero-duration toasts: `duration: 0` means the toast stays until manually dismissed
- HTML in messages: should be escaped (XSS prevention)
- Multiple pause/resume cycles: hover in → out → in → out should work correctly every time

## Output

Provide:
1. The complete TypeScript source code
2. A brief usage example showing the API
3. The CSS (can be embedded or separate)

Focus on correctness and edge case handling over visual polish. The system needs to WORK reliably, not just look good in a demo.

---',
  '## Grading Key (DO NOT INCLUDE IN PROMPT TO MODEL)

### Binary Checks

1. **Queue management**: Does it limit visible toasts? Does it properly dequeue when space opens?
2. **Progress bar**: Is there a visual countdown that actually tracks remaining time?
3. **Pause ALL on hover**: Does hovering one toast pause ALL timers, not just the hovered one?
4. **Rapid-fire handling**: Does calling toast() 20 times work without errors or visual glitches?
5. **XSS prevention**: Does it escape HTML in messages?

### Grading

| Dimension | 9-10 | 7-8 | 5-6 | 3-4 |
|-----------|------|-----|-----|-----|
| **Correctness** | All 5 features work. Edge cases handled. Queue + pause logic correct. | 4/5 features work. Minor edge case issues. | 3/5 features. Queue or pause broken. | Basic toast only. No queue or pause. |
| **Quality** | Clean TypeScript. Proper types. No any. Good encapsulation. | Good code, minor type issues. | Working but messy. Uses any or type assertions. | Sloppy code. Missing types. |
| **Judgment** | Appropriate complexity. Doesn''t over-engineer. Handles the stated edge cases without inventing new ones. | Slightly over or under-engineered. | Missing important edge cases or adding unnecessary features. | Wrong level of abstraction entirely. |
| **Completeness** | Full API surface, CSS, usage example, all features. | Most of API, most features. | Partial API, some features missing. | Incomplete implementation. |

### Key Differentiator
The pause-ALL-on-hover behavior is the hardest part. Most implementations only pause the hovered toast. The spec says ALL timers pause. This requires a global pause state that all active toasts check.',
  'binary_check_code_build',
  'code-reviewer',
  1,
  1
);

INSERT OR REPLACE INTO bench_tasks (id, category, title, prompt, grading_key, binary_check_fn, specialist_name, active, version)
VALUES (
  'technical-docs',
  'writing',
  'Webhook API Documentation',
  '# Task: Write API Documentation — Webhook Delivery System

## Context

You''re documenting the webhook delivery system for **Dispatch**, a developer-facing SaaS platform. The API is already built — you''re writing the docs that developers will read to integrate webhooks into their applications.

## System Overview

Dispatch sends webhooks via HTTP POST to customer-configured endpoints. Key details:

- **Payload format**: JSON, UTF-8 encoded
- **Signing**: HMAC-SHA256 with customer''s webhook secret
- **Signature header**: `X-Dispatch-Signature-256`
- **Timestamp header**: `X-Dispatch-Timestamp` (Unix epoch seconds)
- **Event ID header**: `X-Dispatch-Event-Id` (UUID v4)
- **Content-Type**: `application/json`
- **Timeout**: 30 seconds per delivery attempt
- **Max payload size**: 256KB

### Retry Logic
- **Attempts**: 5 total (1 initial + 4 retries)
- **Schedule**: Immediate, 1 min, 5 min, 30 min, 2 hours
- **Retry conditions**: Network errors, 5xx responses, timeouts
- **No retry**: 2xx (success), 4xx (client error — your problem)
- **Circuit breaker**: After 50 consecutive failures to an endpoint, delivery is paused. The customer gets an email. They must re-enable via dashboard or API.

### Authentication
- Webhook secrets are 32-byte hex strings generated on endpoint creation
- Signature is computed as: `HMAC-SHA256(webhook_secret, timestamp + "." + raw_body)`
- Verify by comparing your computed signature with the header value using constant-time comparison
- Reject events older than 5 minutes (replay protection)

### Event Types
| Event | Description |
|-------|------------|
| `message.created` | New message received |
| `message.updated` | Message content edited |
| `message.deleted` | Message removed |
| `conversation.started` | New conversation opened |
| `conversation.closed` | Conversation marked resolved |
| `user.joined` | User joined the workspace |
| `user.left` | User left or was removed |
| `billing.payment_succeeded` | Payment processed |
| `billing.payment_failed` | Payment failed |

### Example Payload
```json
{
  "id": "evt_01HQ3KPZXN9R8TYQW0FG5DVEM4",
  "type": "message.created",
  "created_at": "2024-03-15T14:30:00Z",
  "data": {
    "message_id": "msg_01HQ3KQ0AB2C3D4E5F6G7H8J9K",
    "conversation_id": "conv_01HQ3KQ0AB2C3D4E5F6G7H8J9L",
    "author": {
      "id": "usr_01HQ3KQ0AB2C3D4E5F6G7H8J9M",
      "name": "Alice Chen",
      "role": "customer"
    },
    "content": "I need help with my billing.",
    "created_at": "2024-03-15T14:30:00Z"
  }
}
```

## Your Task

Write comprehensive API documentation for this webhook system. The audience is backend developers integrating Dispatch webhooks into their applications.

### Must Include
1. **Quick Start** — Get a webhook endpoint receiving events in under 5 minutes
2. **Authentication & Verification** — How to verify webhook signatures, with code examples in at least 2 languages (Node.js + Python)
3. **Event Types** — Complete reference table with payload schemas
4. **Retry & Error Handling** — What happens when your endpoint fails, how retries work, circuit breaker behavior
5. **Best Practices** — Common pitfalls, performance tips, security recommendations
6. **Troubleshooting** — Common errors and how to fix them
7. **Testing** — How to test webhook integration locally (mention tools like ngrok, webhook.site)

### Requirements
- Code examples must be syntactically correct and actually work
- Error codes must be specific (not just "an error occurred")
- Include curl examples for manual testing
- Use consistent formatting throughout

---',
  '## Grading Key (DO NOT INCLUDE IN PROMPT TO MODEL)

### Binary Checks

1. **Signature verification code correctness**: Do the Node.js and Python examples actually compute HMAC-SHA256 correctly? Do they use constant-time comparison?
2. **Replay protection**: Does the doc mention checking timestamp age (5 min window)?
3. **Retry schedule accuracy**: Does it match the spec (immediate, 1m, 5m, 30m, 2h)?
4. **Circuit breaker documentation**: Is the 50-failure threshold and re-enable process documented?
5. **Error codes table**: Are there specific HTTP status codes with descriptions?

### Grading

| Dimension | 9-10 | 7-8 | 5-6 | 3-4 |
|-----------|------|-----|-----|-----|
| **Correctness** | Code examples work. Numbers match spec. Signature computation correct. | Mostly correct. Minor code issues. | Some incorrect details. Code has bugs. | Multiple factual errors. Code doesn''t work. |
| **Quality** | Well-structured, scannable, developer-friendly. Reads like Stripe/Twilio docs. | Good structure, some sections weaker. | Functional but hard to navigate. | Poorly organized or overly verbose. |
| **Judgment** | Right level of detail. Doesn''t over-explain basics or under-explain complex parts. | Slightly unbalanced detail levels. | Too verbose or too sparse in places. | Way too much or too little detail throughout. |
| **Completeness** | All 7 sections covered thoroughly. Edge cases addressed. | 6/7 sections. Most edge cases. | 5/7 sections. Missing important details. | Fewer than 5 sections or major gaps. |

### Key Differentiator
The signature verification code must actually be correct. Many models produce plausible-looking HMAC code that has subtle bugs (wrong concatenation order, missing constant-time comparison, incorrect encoding). The timestamp + "." + raw_body concatenation is specific to this system and must be exactly right.',
  'binary_check_technical_docs',
  'copywriter',
  1,
  1
);

INSERT OR REPLACE INTO bench_tasks (id, category, title, prompt, grading_key, binary_check_fn, specialist_name, active, version)
VALUES (
  'ambiguous-requirements',
  'reasoning',
  'Ambiguous Requirements Analysis',
  '# Task: Interpret Ambiguous Requirements

## Context

You''re a senior developer on a B2B SaaS product. The product manager just dropped this one-liner in Slack:

> "Users should be able to share documents with other users."

That''s it. That''s the entire spec. No follow-up, they''re in meetings all day.

Your manager says: "Just figure it out and start building. Write up what you''re going to build and flag anything you''d want to confirm later."

## What You Need to Deliver

1. **Ambiguity Analysis** — List every question this requirement doesn''t answer. Be exhaustive. Group them by category.

2. **Assumptions Document** — For each ambiguity, state what you''d assume for v1 and WHY. Each assumption should include:
   - What you decided
   - Why it''s a reasonable default
   - What the alternative would be
   - Risk level if the assumption is wrong (low/medium/high)

3. **Technical Design** — Based on your assumptions, write a brief technical design:
   - Data model changes (tables/fields)
   - API endpoints needed
   - Permission model
   - Key edge cases to handle

4. **Questions for PM** — The 5 most critical questions you''d want answered before v2. Rank them by impact.

## Constraints

- The product is a document management system (think Notion or Google Docs, but simpler)
- Existing features: create, edit, delete documents; folder organization; basic text editor
- Users belong to "workspaces" (like Slack workspaces)
- Auth is handled — you have user IDs, workspace membership, and basic roles (owner, admin, member)

---',
  '## Grading Key (DO NOT INCLUDE IN PROMPT TO MODEL)

### What This Tests

This tests whether an agent can handle ambiguity productively rather than either:
- (a) Getting stuck and refusing to proceed without clarification
- (b) Making assumptions silently without documenting them

### Key Ambiguities That Should Be Identified

**Sharing scope:**
- Share with specific users? Or generate a link?
- Share within workspace only? Or cross-workspace?
- Share with non-users (external/public links)?

**Permission levels:**
- View only? Comment? Edit? Full control?
- Can the sharer set permission level?
- Can sharing be revoked?

**Document granularity:**
- Share a single document? A folder? A workspace?
- What about sub-documents or nested content?

**Notification:**
- Does the recipient get notified?
- How? (Email, in-app, both?)
- Does the sharer get notified when the doc is accessed?

**Access control:**
- Who can share? (Owner only? Editors? Anyone with access?)
- Can admins restrict sharing?
- Does sharing inherit parent folder permissions?

**Technical:**
- What happens to shared docs when the original is deleted?
- What about version history — does the recipient see edits?
- Search — can recipients search shared content?

### Grading

| Dimension | 9-10 | 7-8 | 5-6 | 3-4 |
|-----------|------|-----|-----|-----|
| **Correctness** | Identifies 15+ genuine ambiguities. Assumptions are reasonable. Technical design is sound. | 10-14 ambiguities. Most assumptions reasonable. | 6-9 ambiguities. Some assumptions weak. | Fewer than 6 ambiguities or major gaps. |
| **Judgment** | Makes smart v1 decisions. Doesn''t over-build. Identifies the RIGHT 5 questions for PM. | Good decisions, maybe over-builds slightly. | Some poor v1 decisions. Questions are less impactful. | Over-engineers v1 or makes risky assumptions without flagging them. |
| **Quality** | Well-organized. Clear risk assessments. Technical design is concise but complete. | Good organization, some sections weaker. | Disorganized or inconsistent quality. | Hard to follow. Missing structure. |
| **Completeness** | All 4 deliverables present and thorough. Edge cases covered. | 3-4 deliverables, mostly thorough. | 2-3 deliverables or incomplete. | Missing major deliverables. |

### Binary Check Focus
The key binary signal: does the agent IDENTIFY the ambiguity and MAKE DECISIONS, or does it either get stuck or silently assume things?',
  'binary_check_ambiguous_requirements',
  NULL,
  1,
  1
);

INSERT OR REPLACE INTO bench_tasks (id, category, title, prompt, grading_key, binary_check_fn, specialist_name, active, version)
VALUES (
  'error-recovery-chain',
  'multi-step',
  'Error Recovery Chain',
  '# Task: 5-Step Pipeline with Multiple Failures

## Objective

Complete a 5-step data processing pipeline. Steps 2 and 4 will fail with different errors. You must diagnose each failure, fix it, and produce the final output.

## Setup

Create the workspace and input data:

```bash
mkdir -p /tmp/bench-recovery/input /tmp/bench-recovery/output

# Create input data
cat > /tmp/bench-recovery/input/transactions.json << ''EOF''
[
  {"id": "tx001", "amount": 150.00, "currency": "USD", "merchant": "Acme Corp", "category": "software", "date": "2024-03-01"},
  {"id": "tx002", "amount": 89.99, "currency": "EUR", "merchant": "Berlin Cafe", "category": "food", "date": "2024-03-02"},
  {"id": "tx003", "amount": 2500.00, "currency": "USD", "merchant": "CloudHost Inc", "category": "infrastructure", "date": "2024-03-03"},
  {"id": "tx004", "amount": 45.00, "currency": "GBP", "merchant": "London Books", "category": "education", "date": "2024-03-05"},
  {"id": "tx005", "amount": 999.00, "currency": "USD", "merchant": "DevTools Pro", "category": "software", "date": "2024-03-07"},
  {"id": "tx006", "amount": 12.50, "currency": "EUR", "merchant": "Munich Metro", "category": "transport", "date": "2024-03-08"},
  {"id": "tx007", "amount": 350.00, "currency": "USD", "merchant": "OfficeSpace Co", "category": "office", "date": "2024-03-10"},
  {"id": "tx008", "amount": 75.00, "currency": "GBP", "merchant": "UK Cloud", "category": "infrastructure", "date": "2024-03-12"},
  {"id": "tx009", "amount": 199.00, "currency": "USD", "merchant": "DesignHub", "category": "software", "date": "2024-03-15"},
  {"id": "tx010", "amount": 28.00, "currency": "EUR", "merchant": "Paris Lunch", "category": "food", "date": "2024-03-18"}
]
EOF
```

## The 5 Steps

### Step 1: Load and Validate
Read `transactions.json` and validate that all records have required fields (`id`, `amount`, `currency`, `merchant`, `category`, `date`). Write validated records to `output/step1-validated.json`.

### Step 2: Currency Conversion (WILL FAIL)
Convert all amounts to USD using this Python script:

```python
# Save as /tmp/bench-recovery/convert.py
import json
import sys
from forex_rates import get_rate  # THIS MODULE DOES NOT EXIST

def convert(input_file, output_file):
    with open(input_file) as f:
        data = json.load(f)

    rates = {"USD": 1.0, "EUR": get_rate("EUR", "USD"), "GBP": get_rate("GBP", "USD")}

    for tx in data["valid"]:
        original = tx["amount"]
        tx["amount_usd"] = round(original * rates[tx["currency"]], 2)
        tx["original_amount"] = original
        tx["original_currency"] = tx["currency"]

    with open(output_file, "w") as f:
        json.dump(data, f, indent=2)

if __name__ == "__main__":
    convert(sys.argv[1], sys.argv[2])
```

Run: `python3 /tmp/bench-recovery/convert.py output/step1-validated.json output/step2-converted.json`

**Error:** `ModuleNotFoundError: No module named 'forex_rates'`

### Step 3: Categorize Expenses
Group transactions by category and calculate totals per category. Write to `output/step3-categorized.json`.

### Step 4: Generate Report (WILL FAIL)
Create a summary report. The report must conform to this JSON schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["report_date", "total_usd", "transaction_count", "by_category", "top_merchant"],
  "properties": {
    "report_date": {"type": "string", "format": "date"},
    "total_usd": {"type": "number"},
    "transaction_count": {"type": "integer"},
    "by_category": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["total", "count"],
        "properties": {
          "total": {"type": "number"},
          "count": {"type": "integer"}
        }
      }
    },
    "top_merchant": {
      "type": "object",
      "required": ["name", "total"],
      "properties": {
        "name": {"type": "string"},
        "total": {"type": "number"}
      }
    }
  }
}
```

The trap: if you naively build the report, `transaction_count` will be a float (from JSON parsing) instead of an integer, and `report_date` will be an ISO datetime string instead of just a date (`YYYY-MM-DD`). Both fail schema validation.

Write to `output/step4-report.json`.

### Step 5: Archive
Create `output/step5-archive.tar.gz` containing all output files from steps 1-4.

## Success Criteria

All 5 output files must exist and contain valid data:
- `output/step1-validated.json` — validated transaction records
- `output/step2-converted.json` — all amounts converted to USD
- `output/step3-categorized.json` — grouped by category with totals
- `output/step4-report.json` — valid against the JSON schema above
- `output/step5-archive.tar.gz` — archive of all outputs

---',
  '## Grading Key (DO NOT INCLUDE IN PROMPT TO MODEL)

### The Two Failures

**Step 2: Python import error**
- `forex_rates` module doesn''t exist
- Fix options: (a) hardcode reasonable exchange rates, (b) use a real API, (c) use approximate rates from common knowledge (EUR ~1.08, GBP ~1.27)
- Key: the agent must recognize the error, provide rates another way, and continue

**Step 4: JSON schema validation**
- `transaction_count` must be integer, not float
- `report_date` must be "YYYY-MM-DD", not ISO datetime
- These are subtle type issues that test attention to schema requirements

### Grading

| Dimension | 9-10 | 7-8 | 5-6 | 3-4 |
|-----------|------|-----|-----|-----|
| **Correctness** | All 5 outputs correct. Both failures fixed. Schema validates. | 4-5 outputs. One failure fixed well. | 3-4 outputs. Partial fixes. | ≤2 outputs or major errors. |
| **Judgment** | Diagnosed both errors accurately. Chose reasonable fixes. Documented assumptions (e.g., exchange rates). | Fixed errors but didn''t document assumptions. | Recognized errors but poor fixes. | Didn''t recognize errors or gave up. |
| **Quality** | Clean JSON. Proper types. Well-structured output. | Good output, minor issues. | Working but rough. | Messy or invalid output. |
| **Completeness** | All 5 steps, all outputs, archive includes everything. | Most steps complete. | Major gaps. | Pipeline mostly incomplete. |

### Key Differentiator
Fixing BOTH failures is the test. Step 2 requires creative problem-solving (the module doesn''t exist — you need another way). Step 4 requires attention to detail (schema type requirements). Agents that fix both show real problem-solving ability.',
  'binary_check_error_recovery',
  NULL,
  1,
  1
);

INSERT OR REPLACE INTO bench_tasks (id, category, title, prompt, grading_key, binary_check_fn, specialist_name, active, version)
VALUES (
  'context-awareness',
  'reasoning',
  'Context-Aware Scheduling',
  '# Task: Schedule a Cross-Timezone Meeting

## Context

You''re an executive assistant AI helping schedule meetings for a distributed team. You have access to the following information.

## The Request

> "Schedule a 1-hour meeting with the Tokyo team for tomorrow to discuss the Q2 roadmap. Kenji, Yuki, and Aiko need to be there. Find a slot that works for everyone."

## Available Information

### Today''s Date
March 19, 2025 (Wednesday)

### Team Members & Availability

**Your executive (Sarah Chen) — San Francisco (UTC-7, PDT)**
- Available: 8:00 AM - 6:00 PM local time
- Tomorrow has: 10:00-11:00 AM product review, 2:00-3:00 PM board prep

**Kenji Tanaka — Tokyo (UTC+9, JST)**
- Available: 9:00 AM - 7:00 PM local time
- Title: Engineering Director
- Tomorrow has: 10:00-11:30 AM sprint review (JST)

**Yuki Sato — Tokyo (UTC+9, JST)**
- Available: 10:00 AM - 8:00 PM local time
- Title: Product Lead
- No meetings tomorrow

**Aiko Yamamoto — Tokyo (UTC+9, JST)**
- Available: 9:00 AM - 6:00 PM local time
- Title: Design Director
- Tomorrow has: 2:00-3:00 PM design review (JST)

### Holiday Calendar
- **March 20, 2025 (Thursday)** — Japan: **Vernal Equinox Day (春分の日)** — National Holiday
- March 21, 2025 (Friday) — No holidays

### Cultural Context
- Japanese national holidays are widely observed. Most office workers have the day off.
- Scheduling a meeting on a Japanese national holiday would be seen as disrespectful unless it''s truly urgent.
- The Q2 roadmap discussion is important but not urgent — it can wait a day or two.

## Your Task

1. **Identify the problem** with the requested meeting time
2. **Propose an alternative** with specific time slots that work for all participants
3. **Draft a brief response** to Sarah explaining the situation and your recommendation
4. **Show your timezone math** — convert proposed times across all timezones

---',
  '## Grading Key (DO NOT INCLUDE IN PROMPT TO MODEL)

### The Key Test

Tomorrow (March 20) is Vernal Equinox Day in Japan — a national holiday. The agent MUST catch this and recommend rescheduling.

### What a Perfect Response Includes

1. **Catches the holiday** — Explicitly identifies March 20 as Vernal Equinox Day
2. **Explains why it matters** — Not just "it''s a holiday" but acknowledges the cultural context (disrespectful to schedule non-urgent meetings)
3. **Proposes March 21 (Friday) instead** — The next available business day
4. **Finds a slot that works** — Considering all timezone constraints and existing meetings:
   - Tokyo team availability: 9/10 AM - 6/7/8 PM JST (March 21)
   - Sarah availability: 8 AM - 6 PM PDT (March 21)
   - Overlap window: Sarah''s morning (8 AM - 12 PM PDT) = Tokyo evening (12 AM - 4 AM JST next day) — NO GOOD
   - Better: Tokyo morning (9 AM - 12 PM JST) = Sarah''s evening before (4 PM - 7 PM PDT previous day) — NO, wrong date
   - Correct overlap: Tokyo afternoon (1 PM - 6 PM JST Mar 21) = Sarah''s evening (9 PM PDT Mar 20 - 2 AM PDT Mar 21) — NOT IDEAL
   - Actually: Best overlap is early Tokyo / late Sarah. 5-7 PM PDT (Mar 20) = 9-11 AM JST (Mar 21)
   - Wait — Sarah''s March 21 schedule isn''t given, so assume fully available
   - Best slot for March 21: 5:00 PM PDT (Sarah) = 9:00 AM JST (Tokyo next morning, Mar 22)... 
   - CORRECTION: PDT is UTC-7, JST is UTC+9, so difference is 16 hours. 
   - 9 AM JST = 5 PM PDT (previous day). So for March 21 JST, Sarah''s time is March 20 PDT.
   - For same calendar day meeting on March 21: Tokyo afternoon maps to Sarah''s late night/early morning.
   - Realistic slot: March 21, 5:00 PM - 6:00 PM PDT (Sarah) = March 22, 9:00 AM JST... that pushes Tokyo to Saturday.
   - BEST REALISTIC: Schedule for March 21 morning JST: 10:00 AM - 11:00 AM JST = 6:00 PM - 7:00 PM PDT March 20. Sarah is free after 3 PM board prep.

5. **Shows timezone conversions** — Explicit table or calculation

### Grading

| Dimension | 9-10 | 7-8 | 5-6 | 3-4 |
|-----------|------|-----|-----|-----|
| **Correctness** | Catches holiday. Timezone math correct. Proposed slot actually works for everyone. | Catches holiday. Minor timezone errors. Slot mostly works. | Catches holiday but timezone math wrong. | Misses the holiday entirely. |
| **Judgment** | Recommends rescheduling with cultural sensitivity. Appropriate tone. | Recommends rescheduling but tone is off. | Notes the holiday but suggests meeting anyway. | Schedules the meeting on the holiday without comment. |
| **Quality** | Professional response to Sarah. Clear timezone table. Well-organized. | Good response, some formatting issues. | Functional but disorganized. | Hard to follow or unprofessional. |
| **Completeness** | All 4 deliverables. Considers all participants'' constraints. | 3/4 deliverables. Most constraints considered. | 2/4 deliverables. Missing key constraints. | Incomplete analysis. |

### Critical Binary Signal
**Did the agent catch the Japanese holiday?** This is pass/fail. If it schedules the meeting on March 20 without mentioning Vernal Equinox Day, the Judgment score is capped at 3.',
  'binary_check_context_awareness',
  NULL,
  1,
  1
);

INSERT OR REPLACE INTO bench_tasks (id, category, title, prompt, grading_key, binary_check_fn, specialist_name, active, version)
VALUES (
  'agentic-tool-use',
  'code',
  'Agentic Tool Use',
  '# Task: Complete a Research Task Using 3 MCP Tools

## Context

You have access to three tools for completing a research and analysis task. Each tool has specific capabilities and limitations.

## Available Tools (Simulated)

Since this is a benchmark, you don''t have actual tool access. Instead, **simulate** the tool calls and responses as if you were using them. Show your work by writing out each tool call and its expected response.

### Tool 1: `search(query: string, max_results?: number) -> SearchResult[]`
Searches a knowledge base. Returns titles, snippets, and relevance scores.
- Max 10 results per query
- Only searches English content
- Results include: `{ title: string, snippet: string, url: string, relevance: number }`

### Tool 2: `calculate(expression: string) -> { result: number, steps?: string[] }`
Evaluates mathematical expressions. Supports:
- Basic arithmetic: `+`, `-`, `*`, `/`
- Percentages: `15% of 2500`
- Comparisons: `compare(a, b)` returns percentage difference
- Aggregations: `sum(a, b, c)`, `avg(a, b, c)`, `median(a, b, c)`

### Tool 3: `format(data: object, template: string) -> string`
Formats structured data into a specified template. Templates:
- `"markdown_table"` — converts array of objects to markdown table
- `"summary"` — generates a natural language summary from data
- `"csv"` — converts to CSV format
- `"json_pretty"` — pretty-prints JSON

## The Research Task

**Question:** "What is the total addressable market (TAM) for AI-powered code review tools, and how does this compare to the broader static analysis market?"

### Steps Required

1. **Search** for market size data on AI code review tools and static analysis market
2. **Calculate** the TAM based on the data you find (use reasonable estimates if exact data isn''t available)
3. **Search** for the top 5 competitors in this space
4. **Calculate** the market concentration (% held by top 3 players)
5. **Format** your findings as a markdown research brief

### Requirements

- Show each tool call with its input and expected output
- Use all 3 tools at least once
- Handle the case where search returns incomplete data (make reasonable estimates and document your assumptions)
- The final output should be a structured research brief with:
  - Market size (TAM, SAM, SOM)
  - Growth rate
  - Top 5 competitors with estimated market share
  - Market concentration analysis
  - Key trends
  - Your confidence level in each estimate (high/medium/low)

## Output Format

Show your work as a sequence of tool calls:

```
[TOOL CALL 1] search("AI code review market size 2024")
[RESULT 1] { ... }

[TOOL CALL 2] calculate("...")
[RESULT 2] { ... }

... etc ...

[FINAL OUTPUT]
(formatted research brief)
```

---',
  '## Grading Key (DO NOT INCLUDE IN PROMPT TO MODEL)

### What This Tests

1. **Tool selection**: Does the agent pick the right tool for each sub-task?
2. **Tool sequencing**: Does it use tools in a logical order (search → calculate → format)?
3. **Error handling**: Does it handle incomplete search results gracefully?
4. **Data synthesis**: Does it combine tool outputs into coherent analysis?
5. **Assumption documentation**: When data is incomplete, does it document what it assumed?

### Grading

| Dimension | 9-10 | 7-8 | 5-6 | 3-4 |
|-----------|------|-----|-----|-----|
| **Correctness** | All 3 tools used appropriately. Math is correct. Estimates are reasonable. | Tools used correctly, minor math errors. | Some tool misuse or incorrect calculations. | Tools used incorrectly or math is wrong. |
| **Judgment** | Smart tool sequencing. Knows when to search vs calculate. Documents confidence levels honestly. | Good sequencing, some unnecessary tool calls. | Suboptimal sequencing or missing confidence levels. | Poor tool selection or no uncertainty acknowledgment. |
| **Quality** | Professional research brief. Clear methodology. Well-formatted output. | Good brief, some formatting issues. | Functional but rough. | Poorly structured or hard to follow. |
| **Completeness** | All 5 steps shown. Final brief has all required sections. TAM/SAM/SOM present. | 4/5 steps. Most brief sections. | 3/5 steps. Major sections missing. | Fewer than 3 steps or incomplete brief. |

### Key Differentiator
The best responses will:
1. Use search twice (market data + competitors) before calculating
2. Show realistic tool inputs and outputs (not hand-waving)
3. Be honest about data limitations and confidence levels
4. Produce a brief that could actually inform a business decision',
  'binary_check_agentic_tool_use',
  NULL,
  1,
  1
);
