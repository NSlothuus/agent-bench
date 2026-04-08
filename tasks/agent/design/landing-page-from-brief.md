# Task: Build a Landing Page from a Design Brief

## Category: design
## Difficulty: Hard
## Time Limit: 15 minutes
## Binary Check: binary_check_agent_landing_page

## Description

The agent receives a startup's design brief and must implement a landing page from scratch using HTML, CSS, and minimal JS. The page is judged on visual quality, responsiveness, and adherence to the brief.

## Design Brief

**Client:** "TaskFlow" — a project management SaaS for small creative agencies (5-30 person studios doing design/branding work)

**Target audience:** Creative directors and studio managers (not engineers), 28-45 years old, design-savvy

**Brand Personality:** Calm, considered, premium but not corporate. Think Linear meets a design magazine.

**Primary goal of the page:** Get visitors to start a free trial (primary CTA)

**Secondary goal:** Build trust with skeptical creative directors who distrust "enterprise software"

---

**Required sections (in order):**
1. Hero — headline, subhead, free trial CTA, hero visual/illustration description
2. Social proof strip — logos of "real" studios (use realistic fictional names like "Studio Rōon", "Mograph Co", "Bureau Form")
3. Three feature highlights — each with icon, title, description
4. Pricing teaser — two tiers (Solo $15/mo, Studio $49/mo), no feature grid
5. Final CTA section
6. Footer

**Constraints:**
- Single HTML file (inline CSS and JS)
- Mobile-responsive (hero stacks, features go single-column below 768px)
- No external dependencies except Google Fonts
- Must feel premium (typography, spacing, color — not "AI slop")
- No lorem ipsum
- Images: use CSS gradients or SVG shapes, no external images
- Accessible: proper heading hierarchy, contrast ratios, focus states

**Typography requirements:**
- Headings: Inter (Google Fonts)
- Body: Inter

**Color palette (use these — brand guidelines):**
- Background: #FAFAF9 (warm white)
- Text primary: #1A1917 (near black, warm)
- Text secondary: #6B6963 (muted)
- Accent: #E54D2E (confident red-orange — use sparingly for CTAs)
- Surface: #FFFFFF
- Border: #E8E6E1

## Grading Key (HIDDEN)

### Visual Quality (+4):
- Hero section has visual impact and clear hierarchy (+1)
- Typography scale is appropriate (H1 >> H2 >> body, clear contrast) (+0.75)
- Color usage is restrained and sophisticated (not a rainbow) (+0.75)
- Spacing and layout feel premium (not cramped, not empty) (+0.75)
- Social proof strip looks credible and real (+0.5)
- CTA buttons look clickable and important (+0.25)

### Responsiveness (+2):
- Mobile breakpoint at 768px handled correctly (+0.75)
- Features stack to single column on mobile (+0.5)
- Typography scales appropriately (no tiny text on mobile) (+0.5)
- No horizontal scroll on mobile (+0.25)

### Accessibility (+1.5):
- Proper heading hierarchy (H1 > H2 > H3, no skipped levels) (+0.5)
- Color contrast passes WCAG AA (+0.5)
- Focus states visible on interactive elements (+0.25)
- Alt text on any meaningful images/SVGs (+0.25)

### Content Quality (+1.5):
- Headlines are specific and benefit-driven (not generic) (+0.5)
- Feature descriptions are real (not "streamline your workflow") (+0.5)
- Studio names in social proof are realistic/fictional (+0.25)
- No lorem ipsum (+0.25)

### Technical Quality (+1):
- Single HTML file with inline CSS (+0.25)
- Google Fonts loaded correctly (+0.25)
- No external dependencies (+0.25)
- CSS is clean (no !important spam) (+0.25)

### Red Flags:
- Uses the word "seamless", "empower", "robust", or "cutting-edge": -0.5
- Looks like a generic SaaS template: -1
- Broken on mobile (horizontal scroll, tiny text): -0.75
- Missing CTA in hero: -0.5
- No hover states: -0.25
- "Get Started" button has no visual weight: -0.25
