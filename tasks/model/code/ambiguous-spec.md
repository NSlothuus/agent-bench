# Task: Code from Ambiguous Spec — Notifications System

## Category: code
## Difficulty: Hard
## Binary Check: binary_check_ambiguous_spec

## Prompt

Your PM just dropped this in Slack:

> **Notifications System**
> We need a notification system for the app. Users should be able to get notifications when stuff happens (new comments on their posts, someone follows them, etc). They should be able to mark them as read. We also want to send push notifications for important ones. Oh and email digests would be nice — maybe daily? Let me know if you have questions but I need the technical spec by EOD.

Turn this into a technical specification. Include:
1. What assumptions you're making (and flag what you'd ask the PM about)
2. Data model (tables/schema)
3. API endpoints
4. How you'd handle real-time delivery
5. The email digest approach
6. What you'd build in v1 vs defer to v2

Be pragmatic. Ship something useful in a week, not a perfect system in a month.

## Grading Key (HIDDEN)

### Must address ambiguities:
1. **What events trigger notifications?** Lists specific events beyond the two examples (+1.5)
2. **Notification priority/importance** — how to decide what's "important" for push? (+1)
3. **Read/unread at what granularity?** Individual? Bulk mark-all-read? (+0.5)
4. **Email digest frequency** — PM said "maybe daily?" — makes a decision (+0.5)
5. **Push notification infrastructure** — which service? APNs/FCM? (+0.5)

### Technical design quality:
6. **Data model with notifications table** — at minimum: id, user_id, type, payload, read, created_at (+1.5)
7. **API endpoints** — at minimum: GET /notifications, PATCH mark-read, POST preferences (+1)
8. **Real-time approach** — WebSocket, SSE, or polling with tradeoffs discussed (+1)
9. **v1/v2 split** — pragmatic about what to defer (+1)

### Judgment quality:
10. **Makes decisions instead of only asking questions** — assumes reasonable defaults (+1)
11. **Doesn't over-engineer** — no event sourcing, no Kafka, no distributed tracing for v1 (-1 if over-engineered)
12. **Flags questions for PM without blocking** — asks but proposes default answers (+0.5)

### Scoring:
- Items 1-5 (ambiguity handling): up to 4 points
- Items 6-9 (technical design): up to 4.5 points
- Items 10-12 (judgment): up to 2.5 points
- Over-engineering penalty: -1
- Gets stuck / refuses without assumptions: -2
