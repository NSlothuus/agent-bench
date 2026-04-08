# Task: Codebase Navigation — Find All Changes for a Feature

## Category: code
## Difficulty: Hard
## Binary Check: binary_check_codebase_nav

## Prompt

You're implementing a new feature: **user mention notifications**. When a user mentions another user in a comment using `@username` syntax, the mentioned user should receive an in-app notification.

This requires changes across the codebase. Here's what you know:

---

**Files in the codebase:**

```
src/
├── routes/
│   └── comments.js         # POST /comments — creates comments
├── models/
│   ├── Comment.js         # Comment model
│   └── User.js            # User model
├── services/
│   ├── notification.js    # Notification service (send notifs)
│   └── mentions.js         # Mention parsing utility
├── jobs/
│   └── emailQueue.js       # Sends emails async
└── index.js                # App entry point
```

---

**Existing code snippets:**

**src/routes/comments.js:**
```javascript
router.post('/comments', async (req, res) => {
  const { postId, body, parentId } = req.body;
  const userId = req.user.id;
  
  const comment = await Comment.create({ postId, body, userId, parentId });
  
  // TODO: extract mentions and notify users
  // TODO: send email to mentioned users if they're not online
  
  res.status(201).json(comment);
});
```

**src/services/notification.js:**
```javascript
// Current: notifications created for follows and likes only
export async function createNotification(userId, type, payload) {
  return db.query(
    'INSERT INTO notifications (user_id, type, payload) VALUES ($1, $2, $3)',
    [userId, type, payload]
  );
}

export async function getUserNotifications(userId, unreadOnly = false) {
  // existing implementation
}
```

**src/services/mentions.js:**
```javascript
// Current: just extracts usernames, doesn't integrate with notifications
export function extractMentions(text) {
  const matches = text.matchAll(/@(\w+)/g);
  return [...matches].map(m => m[1]);
}
```

**src/models/User.js:**
```javascript
// Has: id, username, email, isOnline, lastSeenAt
```

---

**Your task:**
1. List every file that needs to be modified
2. For each file, describe what change is needed and show the relevant code diff
3. Explain the order of changes (what must be done first)

**Be specific.** "Update the notification service" is not enough. Show the actual logic that needs to change.

## Grading Key (HIDDEN)

### File Identification (+3):
- Identifies `src/routes/comments.js` — must call mention parsing and notification creation (+0.75)
- Identifies `src/services/notification.js` — must add a new notification type 'mention' (+0.75)
- Identifies `src/services/mentions.js` — must resolve usernames to user IDs and return user records (+0.75)
- Identifies `src/models/User.js` — must add method to find user by username (+0.25)
- Identifies that `src/jobs/emailQueue.js` may need updating for offline mentions (+0.25)
- Misses any of routes/comments.js, services/notification.js, or services/mentions.js: -0.5 each

### Change Specificity (+4):
- **comments.js:** Shows the exact code to extract mentions and call notifications (+1)
- **notification.js:** Shows adding a 'mention' type with payload including commentId, mentionedUserId, mentioningUserId (+1)
- **mentions.js:** Shows resolving `@username` to user records and filtering out self-mentions (+1)
- **User.js or mentions.js:** Shows checking `isOnline` to decide email vs in-app (+0.5)
- **comments.js:** Shows proper error handling for invalid usernames (+0.5)

### Implementation Logic (+2):
- Mentions are extracted BEFORE saving the comment (+0.5)
- Notification is created async (non-blocking) to not slow down comment creation (+0.5)
- Self-mentions are filtered out (user shouldn't notify themselves): (+0.5)
- Email is only sent to offline users (+0.5)

### Edge Cases Addressed (+1):
- What if the mentioned user doesn't exist? (+0.25)
- What if there are 50 mentions in one comment? (+0.25)
- What if the comment is edited to add mentions after creation? (+0.25)
- What about duplicate mentions (same user mentioned twice)? (+0.25)

### Red Flags:
- Suggests modifying files not in the codebase list: -0.5
- Over-engineers (adds a message queue, event bus): -1
- Misses the async/non-blocking requirement: -0.5
- Doesn't address self-mention filtering: -0.25
