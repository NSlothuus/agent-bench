# Task: Visual Design — Mobile App Onboarding Flow

## Category: design
## Difficulty: Medium
## Binary Check: binary_check_design_onboarding

## Prompt

Design a mobile app onboarding flow for "Pace" — a running/fitness app targeting recreational runners (not elite athletes). The app tracks runs via GPS and social features.

---

**The job of this onboarding:**
1. Get users to set their first run goal (the core value proposition moment)
2. Get users to grant location permissions (required for GPS tracking)
3. Collect enough data to personalize the experience without being creepy
4. Feel motivating and human, not corporate

---

**Design the complete onboarding flow.** Write a specification covering:

1. **Screen sequence** — List the screens in order and what each achieves:
   - Screen 1: Welcome / hook
   - Screen 2: Goal setting
   - Screen 3: Permission requests (location)
   - Screen 4: Social connection (optional, skip offered)
   - Screen 5: First run celebration (or "you're ready" confirmation)

2. **Visual design for each screen:**
   - What does it look like? (layout, key elements, illustration/photo treatment)
   - What's the typography? (headline size, body size)
   - What are the colors? (background, primary text, accent, buttons)
   - What animations/transitions are used? (screen transitions, element entrances)

3. **Interaction design:**
   - Goal setting: slider? number input? presets? Describe the mechanism
   - Permission request: how is it framed? (not a scary system dialog)
   - Progress indication (step indicator, percentage, or something else)

4. **Error/edge states:**
   - Location permission denied: what happens?
   - No network: what does the user see?
   - User abandons mid-onboarding: what's the re-entry experience?

5. **Accessibility:**
   - Contrast ratios for key elements
   - Touch target sizes
   - Support for screen readers (what's announced at each step?)

---

**Constraints:**
- The onboarding must be completable in under 3 minutes
- No "skip" on the goal-setting step (this is the value moment)
- The permission request must NOT use the system dialog as the first ask
- Must feel like a running app (energetic, encouraging, human), not a corporate SaaS
- Target phones: iPhone 12 and later, Pixel 6 and later

## Grading Key (HIDDEN)

### Screen Sequence Logic (+2):
- Each screen has a single clear job (+0.5)
- Order is logical (hook → value → permissions → social → confirmation) (+0.5)
- Goal setting screen is positioned BEFORE permission ask (not after) (+0.5)
- Confirmation screen validates the goal promise (+0.5)

### Visual Design Specificity (+3):
- Each screen has concrete visual description (not "nice illustration"): (+0.75)
- Color palette is specific and appropriate for a running app (energetic but not aggressive): (+0.75)
- Typography hierarchy is specified (not "readable text"): (+0.5)
- Animation descriptions are specific and purposeful (+0.5)
- "Energy without corporate" is achieved (not generic fitness app) (+0.5)

### Interaction Design (+2):
- Goal input mechanism is described with specificity (not "user sets goal"): (+0.75)
- Permission framing avoids scary system dialog as first ask (+0.5)
- Progress indication strategy is explained (+0.25)
- Skip is available where it should be, not where it shouldn't (+0.25)
- Micro-interactions described (button press feedback, slider behavior): (+0.25)

### Error States (+1.5):
- Location denied: graceful fallback, explains why it matters, re-prompt strategy (+0.5)
- No network: what the user sees and can do (+0.25)
- Abandon mid-flow: re-entry UX without losing progress (+0.5)
- These are not hand-waved (+0.25)

### Accessibility (+1):
- Touch targets ≥ 44x44pt specified (+0.25)
- Contrast ratios for primary actions (+0.25)
- Screen reader announcements for each screen (+0.25)
- Focus order for any interactive elements (+0.25)

### Realism (+0.5):
- No "Lorem ipsum" copy (+0.25)
- Realistic content throughout (actual goal examples, real-feeling copy) (+0.25)

### Red Flags:
- Generic "clean minimalist app": -1
- Permission asked before value established: -0.75
- No mention of what happens if location is denied: -0.75
- "Modern and fresh" without specifics: -0.5
- Over-emphasizes social features (users don't join for social at onboarding): -0.5
