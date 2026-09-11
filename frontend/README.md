# CarboTrack — Industrial Emission Leak-Point Detector & Circular Recommender
## Frontend Implementation — HackOut 2026

CarboTrack is a modern, high-precision carbon intelligence and circular economy recommendation platform built for SME industrial plant operators and ESG auditors.

---

## 1. Quick Start

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (React 18/19, Vite, Tailwind CSS, Recharts, Lucide React)
npm install

# Start development server (accessible at http://localhost:3000)
npm run dev

# Build production bundle
npm run build
```

---

## 2. Technology Stack

- **Framework:** React + Vite
- **Styling:** Tailwind CSS (Custom industrial carbon intelligence palette: Deep slate `#080c14`, Emerald `#059669`, Amber `#d97706`, Rose `#dc2626`)
- **Data Visualizations:** Recharts (Horizontal Ranked Bar Chart, Process Category Donut, Before/After Simulation Comparison, Multi-Assessment Timeline Line Chart)
- **Icons:** Lucide React
- **Routing:** React Router DOM v6 with nested layout wrappers (`AppLayout`, `Sidebar`, `TopNav`)
- **State Management:** `FacilityAssessmentContext` for global facility, assessment, user session, and toast notifications

---

## 3. Route Map & Complete Screens

| Route | Page | Key Features |
|---|---|---|
| `/login` | `Login.jsx` | 1-Click Evaluation Demo Access (ABC Plastics Operator & ESG Consultant), auth validation |
| `/facility/new` | `FacilitySetup.jsx` | Facility Step 0: Name, industry (plastic/textile/food_processing), scale, regional grid, volume |
| `/facility/:id/intake` | `IntakeWizard.jsx` | 6-Step Guided Intake: Facility Review → Energy → Materials → Waste → Review Table → Deterministic Run |
| `/assessment/:id/overview` | `OverviewDashboard.jsx` | 4 KPI cards, Category Donut chart, Top Emission Contributors, Primary Finding Callout |
| `/assessment/:id/emissions` | `EmissionAnalysisDashboard.jsx` | Detailed line-item audit table, category subtotal cards, expandable calculation audit formulas, CSV export |
| `/assessment/:id/leak-points` | `LeakPointDashboard.jsx` | Ranked horizontal bar chart, severity badges (High/Medium/Low), direct drilldown into interventions |
| `/assessment/:id/recommendations` | `RecommendationDashboard.jsx` | Ranked cards, ML suitability score /100, score_source badge, compare drawer, details modal, apply/dismiss |
| `/assessment/:id/simulate` | `WhatIfSimulator.jsx` | Interactive What-If Simulator: dynamic toggles, before/after chart, max-per-leak-point overlap rule warning, apply selected |
| `/assessment/:id/roadmap` | `ActionRoadmap.jsx` | 3-Phase Kanban Board (Quick Wins, Medium Term, Long Term), status controls, flat table toggle, manual phase overrides |
| `/facility/:id/reports` | `ReportsHistory.jsx` | Longitudinal assessment timeline chart, evaluation log table, PDF / CSV report export, print view |

---

## 4. Contract-Compliant API Client & Offline Mock Engine

The API client (`src/api/client.js`) strictly mirrors the frozen API contract:
1. **Live Backend Connectivity:** Attempts real HTTP requests to `VITE_API_BASE_URL` with standard success `{ success: true, data: { ... } }` and error `{ success: false, error: { ... } }` envelopes.
2. **Deterministic Calculation & Simulation Engine (`src/api/mockEngine.js`):** If the backend is unreachable or `VITE_USE_MOCK=true`, the client automatically and transparently delegates to an in-memory engine that implements:
   - Sourced DEFRA / IPCC / PlasticsEurope emission factors (Scope 1, 2, and 3).
   - Deterministic arithmetic: `CO2e = quantity × emission_factor`.
   - Leak-point ranking: aggregates by leak reference and assigns severity (≥30% High, 10–30% Medium, <10% Low).
   - Machine learning / rule-based recommendation scorer: ranks the canonical library `INT-001` through `INT-012` with auditable explanation flags.
   - What-If Simulator with the **Max-Per-Leak-Point Overlap Rule**: prevents double-counting when multiple selected interventions address the same hotspot.
   - Phased Roadmap bucketing (Phase 1 Quick Wins, Phase 2 Medium Term, Phase 3 Long Term).
   - LocalStorage persistence across page reloads.
