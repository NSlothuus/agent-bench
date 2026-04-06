# Task: Resolve Git Merge Conflict

## Category: coding
## Difficulty: Medium
## Time Limit: 5 minutes

## Description

The agent receives a project with a merge conflict. It must understand both branches' intent and resolve the conflict correctly.

## Prompt

You're merging `feature/user-profiles` into `main`. Git reports conflicts in 2 files. Resolve them correctly — both branches have valid changes that need to be preserved.

**Context:**
- `main` branch: Added email verification to the user model
- `feature/user-profiles`: Added profile fields (bio, avatar, location) to the user model

Both changes should be kept in the merged result.

**src/models/user.js (conflicted):**
```javascript
import { db } from '../db.js';

export class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name;
<<<<<<< HEAD
    this.emailVerified = data.email_verified ?? false;
    this.verificationToken = data.verification_token;
    this.verifiedAt = data.verified_at;
=======
    this.bio = data.bio ?? '';
    this.avatarUrl = data.avatar_url;
    this.location = data.location ?? '';
    this.joinedAt = data.joined_at ?? new Date().toISOString();
>>>>>>> feature/user-profiles
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

<<<<<<< HEAD
  static async create(email, name) {
    const token = crypto.randomUUID();
    const result = await db.query(
      'INSERT INTO users (email, name, verification_token) VALUES ($1, $2, $3) RETURNING *',
      [email, name, token]
    );
    return new User(result.rows[0]);
  }

  async verify() {
    const result = await db.query(
      'UPDATE users SET email_verified = true, verified_at = NOW(), verification_token = NULL WHERE id = $1 RETURNING *',
      [this.id]
    );
    Object.assign(this, new User(result.rows[0]));
  }
=======
  static async create(email, name, profile = {}) {
    const result = await db.query(
      'INSERT INTO users (email, name, bio, avatar_url, location) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [email, name, profile.bio ?? '', profile.avatarUrl ?? null, profile.location ?? '']
    );
    return new User(result.rows[0]);
  }

  async updateProfile(updates) {
    const fields = [];
    const values = [];
    let i = 1;
    for (const [key, value] of Object.entries(updates)) {
      if (['bio', 'avatar_url', 'location', 'name'].includes(key)) {
        fields.push(`${key} = $${i++}`);
        values.push(value);
      }
    }
    if (fields.length === 0) return this;
    values.push(this.id);
    const result = await db.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
      values
    );
    Object.assign(this, new User(result.rows[0]));
  }
>>>>>>> feature/user-profiles

  static async findByEmail(email) {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] ? new User(result.rows[0]) : null;
  }
}
```

**src/routes/users.js (conflicted):**
```javascript
import { User } from '../models/user.js';
import { Router } from 'express';

const router = Router();

<<<<<<< HEAD
router.post('/users', async (req, res) => {
  const user = await User.create(req.body.email, req.body.name);
  // Send verification email
  await sendVerificationEmail(user.email, user.verificationToken);
  res.status(201).json(user);
});

router.post('/users/verify', async (req, res) => {
  const user = await User.findByEmail(req.body.email);
  if (!user || user.verificationToken !== req.body.token) {
    return res.status(400).json({ error: 'Invalid verification token' });
  }
  await user.verify();
  res.json({ message: 'Email verified' });
});
=======
router.post('/users', async (req, res) => {
  const user = await User.create(req.body.email, req.body.name, {
    bio: req.body.bio,
    avatarUrl: req.body.avatarUrl,
    location: req.body.location,
  });
  res.status(201).json(user);
});

router.patch('/users/:id/profile', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  await user.updateProfile(req.body);
  res.json(user);
});
>>>>>>> feature/user-profiles

export default router;
```

Resolve both conflicts. Keep ALL functionality from both branches.

## Grading Key (HIDDEN)

### Correct Resolution (+6):
- Constructor has BOTH verification fields AND profile fields (+2)
- `create()` accepts profile params AND generates verification token (+2)
- Both `verify()` and `updateProfile()` methods preserved (+1)
- Both routes file changes preserved (verification route + profile route) (+1)

### Quality (+4):
- `create()` in routes sends verification email AND accepts profile data (+1)
- INSERT query includes all columns (verification_token + bio + avatar_url + location) (+1)
- No syntax errors in merged code (+1)
- No lost functionality from either branch (+1)
