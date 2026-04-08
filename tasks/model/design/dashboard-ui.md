# Task: Visual Design — Dashboard UI Redesign

## Category: design
## Difficulty: Hard
## Binary Check: binary_check_design_dashboard

## Prompt

A B2B analytics SaaS ("MetricRoom") wants to redesign their main dashboard. The current dashboard is cluttered and users struggle to find what they need. The product team wants a redesign that feels calm, data-dense but not overwhelming.

---

**Context:**
- Primary users: Data analysts and VP-level stakeholders at e-commerce companies
- Users check the dashboard multiple times per day
- The dashboard shows: revenue metrics, conversion funnels, cohort retention, and user activity
- Analysts drill down; executives skim for anomalies

---

**Design this dashboard's visual layer.** Write a comprehensive design specification that covers:

1. **Layout architecture** — How is the screen divided? Where does the user look first? What's the visual weight distribution?

2. **Card/widget system** — Define at least 4 widget types with specific visual treatments:
   - A KPI metric card (single number + trend)
   - A time-series chart area
   - A data table or list view
   - An alert/notification element

3. **Color system for data visualization:**
   - A palette of 6 data colors (distinguishable, colorblind-safe, work on light backgrounds)
   - Guidance for when to use which color (revenue = green, errors = red, etc.)
   - How to handle the "too many series" problem (8+ data series)

4. **Information hierarchy:**
   - What does the user see first?
   - What gets the most visual weight?
   - How do you prevent "everything is important" syndrome?

5. **Responsive strategy:**
   - How does this work on a 13" laptop vs a 27" monitor?
   - What collapses or re-prioritizes on mobile (if supported)?

6. **Dark mode considerations** — If MetricRoom adds dark mode later, what's the migration strategy for a data-dense dashboard?

---

**Constraints:**
- No chart library specifics (don't say "use Recharts" or "use D3" — describe the visual outcome)
- No lorem ipsum or fake copy
- The design must feel calm, not chaotic — this is a professional tool, not a consumer app
- Both analyst (drill-down) and executive (at-a-glance) needs must be met simultaneously

## Grading Key (HIDDEN)

### Layout Architecture (+2):
- Clear visual hierarchy with primary focal point identified (+0.75)
- Layout serves both analyst AND executive needs (not one or the other) (+0.75)
- Explains the spatial logic (why elements are placed where they are) (+0.5)

### Widget Specifications (+3):
- KPI card has enough detail to implement (number, trend direction, trend value, comparison period) (+0.75)
- Time-series chart area describes the visual treatment (line vs bar, grid density, axis labeling) (+0.75)
- Data table has sorting/filtering visual cues specified (+0.5)
- Alert element is visually distinct (doesn't get lost) but not alarming (+0.5)
- At least 4 widget types described with specifics (+0.5)

### Color System (+2.5):
- 6 data colors are listed with hex codes (+0.5)
- Colors are genuinely distinguishable (not just blue-purple ramp) (+0.5)
- Colorblind-safe guidance provided (+0.5)
- Semantic color usage defined (what colors mean contextually) (+0.5)
- "Too many series" strategy (aggregation, Top-N, color grouping) (+0.5)

### Hierarchy & Density (+1.5):
- Clear answer to "what do I see first" (+0.5)
- Demonstrates understanding of "calm but data-dense" (+0.5)
- Prevents "everything is important" via explicit deprioritization strategy (+0.5)

### Dark Mode Strategy (+0.5):
- Concrete migration approach (not "we'll figure it out") (+0.5)

### Responsive Strategy (+0.5):
- Specific about what changes at different breakpoints (+0.5)

### Red Flags:
- Generic "clean and modern dashboard": -1
- No specific widget descriptions (just "show charts"): -0.75
- Colors are all blues/purples: -0.5
- Doesn't address executive vs analyst tension: -0.75
- "Responsive" without specifics: -0.5
