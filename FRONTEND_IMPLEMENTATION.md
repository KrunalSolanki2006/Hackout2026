# FRONTEND_IMPLEMENTATION.md
## Industrial Emission Leak-Point Detector & Circular Alternative Recommender

---

## 1. Frontend Architecture & Technology Choices

- **Stack:** React + Tailwind CSS + Recharts (charts) + React Router (pages) + a thin fetch/axios wrapper for API calls.
- **State management:** React Context (or lightweight Zustand) holds the *active facility* and *active assessment*, since nearly every screen depends on them. Local component state handles form/wizard input. Server data is fetched per-screen via dedicated hooks (`useAssessmentSummary`, `useLeakPoints`, `useRecommendations`, `useSimulate`) with basic caching to avoid refetching on tab switches.
- **API integration:** a single `api/client.js` wraps `fetch`, injects the auth header, and normalizes error shape. Each domain (facilities, assessments, recommendations, simulate) gets a thin function module calling the endpoints defined in `BACKEND_IMPLEMENTATION.md` §API Specification.
- **Design direction:** professional industrial carbon-intelligence platform — deep green/slate/neutral palette, restrained amber/red reserved for warning/severity indicators, strong typographic hierarchy, dense professional layouts. Explicitly avoid: generic AI-dashboard look, excessive gradients, glassmorphism, unnecessary animation, childish UI, overloaded screens.

## 2. Route Structure

```
/login
/signup
/facility/new
/facility/:id
/facility/:id/intake            (wizard: energy → materials → waste → review)
/assessment/:id/overview
/assessment/:id/emissions        (Emission Analysis Dashboard)
/assessment/:id/leak-points
/assessment/:id/recommendations
/assessment/:id/simulate
/assessment/:id/roadmap
/facility/:id/reports            (Reports & Assessment History)
```

Navigation shell: left sidebar (Dashboard / Intake / Recommendations / Simulator / Roadmap / Reports) + top bar showing the active facility name. The intake flow uses its own stepped/wizard navigation, replacing the sidebar temporarily to reduce distraction during data entry.

## 3. Component Hierarchy

**Reusable components (shared library, delivered by Dev 1 to the team):**

| Component | Purpose | Used on |
|---|---|---|
| `KpiCard` | Single stat + label, optional trend indicator | Overview, Emission Analysis |
| `RankedBarChart` | Horizontal bar chart, sortable by contribution % | Leak-Point Dashboard, Overview |
| `RecommendationCard` | Score, cost, CO₂ reduction, difficulty badge, explanation checklist | Recommendation Dashboard |
| `ExplanationChecklist` | ✓/✗ list explaining a score | Recommendation Card, modal |
| `DataTable` | Sortable/filterable table with search | Emission Analysis, Reports |
| `StepperNav` | Multi-step wizard header | Guided Intake |
| `LoadingSkeleton` | Skeleton cards during fetch/calc | All data screens |
| `EmptyState` | CTA-driven "no data yet" state | All data screens, first-run |
| `ErrorBanner` | Inline error + retry | All data screens |
| `Toast` | Confirmation on save/apply/export | Global |

## 4. Page-by-Page Specifications

### 4.1 Facility Setup
- **Purpose:** capture facility identity/context before any process data is entered.
- **Layout:** single-column form, centered, "Step 0 of Wizard" progress indicator.
- **Fields:** industry (dropdown: Plastic / Textile / Food Processing), facility size (Small/Medium/Large), region (text/select), production volume (optional numeric).
- **Buttons:** Save & Continue, Cancel.
- **Validation:** industry and size are required enums; production volume, if present, must be a positive number.
- **States:** empty (first visit), success (facility saved → route to Intake).
- **API:** `POST /facilities`, `GET /facilities/:id`.

### 4.2 Guided Data Intake (multi-step wizard)
Steps: **Facility → Energy → Materials → Waste → Review → Calculate.**
- **Layout:** stepper header (6 steps), one active step in view, repeatable "Add another entry" row pattern per category.
- **Fields per row:** category/subtype dropdown (industry-specific suggestions pre-populated, e.g., plastics → "virgin resin" suggested first), quantity (numeric), unit selector.
- **Review step:** plain summary table (category, subtype, quantity, unit) — no CO₂e yet, since that doesn't exist until Calculate is submitted.
- **Buttons:** Add Input, Delete Input, Save Draft, Back, Next, Submit & Calculate.
- **Validation:** quantity > 0; unit must be valid for the chosen subtype (inline error otherwise); required fields per category enforced before Next is enabled.
- **States:** empty (no rows yet, CTA to add first entry), loading (during Save Draft/Submit), error (validation or save failure inline), success (toast + route to Overview on submit).
- **API:** `POST /assessments/:id/inputs` (per line or batch), `GET /assessments/:id` (draft reload).

### 4.3 Overview Dashboard
- **Purpose:** executive summary, the first screen after calculation.
- **Layout:** top row = 4 KPI cards; middle = two side-by-side charts; bottom = "top emission source" callout card.
- **KPI cards:** Total CO₂e, # Leak Points Identified, Potential CO₂ Reduction, Estimated Intervention Cost.
- **Charts:** category distribution donut (energy/materials/waste split); top-contributors horizontal bar; current-vs-potential footprint two-bar comparison (populated once a simulation exists).
- **Buttons:** "View Leak Points," "View Recommendations."
- **States:** loading (skeleton KPI cards), empty ("No assessment yet — start your first emissions check" CTA), error (retry banner), success (data rendered).
- **API:** `GET /assessments/:id/summary`.

### 4.4 Emission Analysis Dashboard
- **Purpose:** auditable line-item detail behind the Overview numbers, for consultant/regulator verification.
- **Layout:** filter/search bar at top; category subtotal cards (Energy/Materials/Waste); full-width detailed table.
- **Table columns:** Process, Input (subtype), Quantity, Unit, Emission Factor (+ source), CO₂e, % Contribution.
- **Buttons:** Search, per-column Sort, category Filter, "View calculation details" (expands a row to show factor source/version), Export.
- **States:** loading, empty (no completed assessment), error, success.
- **API:** `GET /assessments/:id/summary` (line-item detail), `GET /assessments/:id/export`.

### 4.5 Leak-Point Dashboard
- **Purpose:** the diagnostic core — rank emission sources.
- **Layout:** full-width ranked horizontal bar chart at top; ranked cards below.
- **Cards:** rank #, name, % contribution, CO₂e contribution, severity badge (High/Medium/Low, threshold-based).
- **Buttons:** "View possible interventions" per leak point → routes to Recommendation Dashboard filtered to that leak point.
- **States:** loading, empty, error, success.
- **API:** `GET /assessments/:id/leak-points`.

### 4.6 Recommendation Dashboard (main ML showcase)
- **Purpose:** show ranked, explainable circular interventions per leak point.
- **Layout:** filter bar (by leak point / category) at top; recommendation cards in a grid; a Compare mode toggle.
- **Card fields:** recommendation name, score `/100` (explicitly labeled "recommendation score," never implied to be a physical measurement), CO₂ reduction estimate, estimated cost, payback period, ROI, implementation-difficulty badge, industry-fit badge, explanation checklist (✓ High emission contribution / ✓ Strong industry fit / etc.), applicable leak-point tag.
- **Compare mode:** small score-comparison bar chart when 2+ recommendations are selected.
- **Alternate view:** compact table toggle (name, score, cost, CO₂ reduction, difficulty).
- **Buttons:** Rank (sort control), Compare, View Details (modal with full explanation + cost/CO₂ source), Simulate (sends selection to the Simulator), Apply, Dismiss, Add to Action Plan.
- **States:** loading, empty (no leak points calculated yet), error (with note that the system falls back to rule-based scoring rather than failing), success.
- **API:** `GET /assessments/:id/recommendations`.

### 4.7 What-If Simulator (primary demo screen)
- **Purpose:** show the concrete before/after impact of adopting one or more interventions.
- **Layout:** left panel = intervention checklist (sourced from the Recommendation Dashboard selection); right panel = live-updating results.
- **Results panel fields:** Current CO₂e, Projected CO₂e, Absolute Reduction, % Reduction, Investment, Annual Savings, Payback, ROI.
- **Chart:** before/after bar or waterfall chart, animates on toggle.
- **Buttons:** per-intervention checkboxes, "Apply Selected" (commits to `AppliedIntervention` + Action Roadmap), Reset.
- **Validation:** at least one intervention must be selected for a simulation to run; overlap between interventions on the same leak point is resolved server-side (see backend spec), the UI simply renders the returned, already-adjusted figures.
- **States:** loading (recalculating on toggle), empty (nothing selected yet), error, success (toast on Apply Selected).
- **API:** `POST /assessments/:id/simulate` (on selection change), `POST /assessments/:id/recommendations/:id/apply` (on commit).

### 4.8 Carbon Reduction Action Roadmap
- **Purpose:** turn applied/selected recommendations into a phased plan.
- **Layout:** three-column Kanban (Phase 1: Quick Wins / Phase 2: Medium Term / Phase 3: Long Term), auto-bucketed by difficulty + payback.
- **Card fields:** name, priority, cost, CO₂ reduction, payback, difficulty, status (Suggested/In Progress/Applied).
- **Alternate view:** flat roadmap table.
- **Buttons:** move between phases (manual override), mark status, remove from roadmap.
- **States:** empty (no interventions applied yet), success.
- **API:** derived from `GET /assessments/:id/recommendations` + applied status; no dedicated endpoint beyond apply/dismiss.

### 4.9 Reports & Assessment History
- **Purpose:** persistence, comparison, exportable proof for consultants/regulators.
- **Layout:** left sidebar = list of past assessments (date, total CO₂e); right panel = selected assessment detail / comparison.
- **Charts:** before/after comparison when 2 assessments selected; multi-assessment CO₂e-over-time line chart when 3+ exist.
- **Table:** assessment list (date, total CO₂e, # interventions applied, status).
- **Buttons:** View, Compare, Generate PDF, Export CSV, Share link.
- **States:** empty (first assessment only, no history yet), loading, error, success.
- **API:** `GET /assessments/:id/history`, `GET /assessments/:id/export`.

## 5. Recommendation UI / ML Score Visualization

- The ML/rule-based score is always rendered as `X/100` with the explicit label "recommendation score" — never phrased as a scientific or guaranteed measurement.
- Each card carries a `score_source` badge (subtle, e.g., "ML" or "Rule-based") sourced directly from the API response, so the fallback path is visible rather than hidden.
- Explanation checklist items map 1:1 to backend-provided flags — the frontend does not generate its own justification text.

## 6. Form Specifications & Validation Rules

| Form | Fields | Validation |
|---|---|---|
| Facility Setup | industry, facility_size, region, production_volume? | industry/size required enums; production_volume > 0 if present |
| Intake row | category, subtype, quantity, unit | quantity > 0; unit must be valid for subtype (checked against dataset via API) |
| Simulator selection | selected_intervention_ids[] | at least 1 selected to run simulate |

## 7. Loading / Empty / Error / Success States (applies to every data screen)

- **Loading:** skeleton cards/table rows matching the eventual layout.
- **Empty:** CTA-driven message specific to the screen (e.g., "No assessment yet — start your first emissions check").
- **Error:** inline banner with a retry action; never a blank screen.
- **Success:** toast/checkmark confirmation on save, submit, apply, or export actions.

## 8. Responsive Behavior

- **Desktop:** full multi-column KPI/chart grids, side-by-side panels (e.g., Simulator).
- **Tablet:** grids collapse to 2 columns; sidebar remains.
- **Mobile:** KPI cards and chart grids stack to a single column; tables become horizontally scrollable containers rather than breaking layout; the intake wizard is already single-column by design.

## 9. Accessibility Requirements

- All interactive elements (buttons, checkboxes, dropdowns) are keyboard-navigable and carry visible focus states.
- Charts include an accessible data-table alternative or `aria-label` summary for screen readers (e.g., "Diesel: 43% of total emissions").
- Color is never the sole indicator of severity — severity badges pair color with text/icon (High/Medium/Low label).
- Form errors are announced via `aria-live` regions, not color alone.

## 10. Frontend Testing

- **Forms:** validation triggers correctly for each rule in §6; wizard cannot advance with invalid rows.
- **Responsive layout:** manual pass at desktop/tablet/mobile breakpoints for every screen in §4.
- **API states:** each screen's loading/empty/error/success states are exercised against mocked and real API responses.
- **Charts:** verify bar/donut/comparison charts render correctly with 0, 1, and many data points (edge cases: single leak point, no recommendations yet).
- **Simulator:** verify the checkbox toggle triggers recalculation and the chart/KPI values update to match the API response exactly (no client-side re-derivation of numbers).

## 11. Frontend Developer Checklist

- [ ] Scaffold app, Tailwind config, design tokens matching §1 palette direction.
- [ ] Build `api/client.js` and domain API modules against the frozen contract.
- [ ] Implement `FacilityAssessmentContext` for active facility/assessment.
- [ ] Build Facility Setup + Intake Wizard against mocked API (Day 1).
- [ ] Build Overview, Emission Analysis, Leak-Point dashboards against real backend data (Day 2).
- [ ] Build Recommendation Dashboard, Simulator, Roadmap, Reports/History (Day 3).
- [ ] Implement all four data states on every screen.
- [ ] Responsive pass across desktop/tablet/mobile.
- [ ] Full end-to-end run-through of the ABC Plastics demo journey, twice, before freeze.
