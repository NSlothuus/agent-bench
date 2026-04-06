# Task: Technical Blog Post — Error Handling Patterns

## Category: writing
## Difficulty: Medium
## Binary Check: binary_check_writing_v2

## Prompt

Write a technical blog post (800-1200 words) titled: **"Error Handling That Doesn't Suck: Lessons from 3 Production Outages"**

Target audience: Mid-level backend developers who've been burned by bad error handling.

Requirements:
- Use specific, concrete examples (real code, real scenarios — not abstract theory)
- Include at least 2 code snippets showing before/after patterns
- Reference at least one real-world outage or incident (public postmortem, known bug, etc.)
- Have a clear thesis / takeaway
- Write like a human developer sharing hard-won knowledge, not a textbook

The post should feel like something a senior engineer would share in a team Slack channel and people would actually read it.

## Grading Key (HIDDEN — server-side only)

### Content Quality:
- Has clear thesis/argument (not just a list): +2
- Uses specific code examples (not pseudo-code): +2
- References real incidents/outages: +1
- Provides actionable takeaways: +1

### Writing Quality:
- Banned AI-slop phrases (each found: -0.5, max -3):
  "rapidly evolving", "game-changer", "revolutionize", "leverage", "cutting-edge",
  "at the end of the day", "worth noting", "in conclusion", "without further ado",
  "deep dive", "dive deep", "unlock the potential", "paradigm shift", "synergy",
  "best-in-class", "holistic", "robust", "seamless", "empower", "streamline",
  "landscape", "ecosystem", "harness the power", "state-of-the-art", "next-generation",
  "world-class", "it's important to note", "in today's world", "when it comes to",
  "a]myriad of", "in the realm of", "it goes without saying"
  
- Has personality/voice (opinionated, not neutral): +1
- Varied sentence rhythm (not all same length/structure): +0.5
- Opens with a hook (not "In this post, we'll explore..."): +0.5

### Structure:
- 800-1200 words: +0 (expected), <600 or >1500: -1
- Has code snippets: +0 (expected), missing: -2
- Logical flow (not random tips dumped together): +1

### Binary checks:
- Count of banned phrases
- Word count in range
- Contains code blocks (``` markers)
- First sentence is NOT a generic intro ("In this article/post/blog...")
