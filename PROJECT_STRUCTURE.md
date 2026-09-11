# PROJECT_STRUCTURE.md
## Industrial Emission Leak-Point Detector & Circular Alternative Recommender
### HackOut 2026 — Renewable Energy Intelligence and Circular Carbon Ecosystem

---

## 1. System Architecture (Text Diagram)

```
┌─────────────────────────────────────────────┐
│  React Frontend (Tailwind, Recharts)          │
│  Vercel/Netlify                               │
└──────────────────┬────────────────────────────┘
                    │ REST (HTTPS, JSON)
                    ▼
┌─────────────────────────────────────────────────────┐
│  FastAPI Backend (single service, modularized)        │
│  ┌─────────────────────────────────────────────┐     │
│  │ API Layer (routers)                          │     │
│  ├─────────────────────────────────────────────┤     │
│  │ Validation (Pydantic schemas)                 │     │
│  ├─────────────────────────────────────────────┤     │
│  │ Calculation Engine (deterministic) ◄──uses──── Static Emission-Factor Dataset
│  ├─────────────────────────────────────────────┤     │
│  │ Leak Analysis (aggregation / ranking)         │     │
│  ├─────────────────────────────────────────────┤     │
│  │ Recommendation Engine                         │     │
│  │   ├─ ML Ranker (scikit-learn, in-process)   ◄──uses── Intervention Library + model file
│  │   └─ Rule-Based Scorer (fallback)             │     │
│  └─────────────────────────────────────────────┘     │
└──────────────────┬────────────────────────────────────┘
                    │ SQLAlchemy
                    ▼
┌─────────────────────────────────────────────┐
│  PostgreSQL / Supabase                        │
│  Users, Facilities, Assessments, ProcessInput,│
│  EmissionFactor, InterventionLibrary,         │
│  Recommendation, AppliedIntervention,         │
│  AssessmentHistory, Report                    │
└──────────────────┬────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────┐
│  Report Generator (PDF/CSV)                   │
│  → Object storage → download link             │
└─────────────────────────────────────────────┘
```

**Single service, no microservices.** The backend is one FastAPI application internally split into modules (routers, calculation engine, leak analysis, recommendation engine). No Kubernetes, no message queues, no separate ML-serving infrastructure — the trained model is loaded once at process startup and called as an in-process function.

---

## 2. Repository Structure (top level)

```
/repo
├── /frontend                 # Developer 1 owns everything here
├── /backend                  # Developer 2 owns everything here
├── /ml                       # Developer 3 owns everything here
├── /datasets                 # Shared static data, owned jointly (see §7)
├── /docs                     # This planning package + API contract
├── .env.example
├── docker-compose.yml        # optional, local Postgres for dev
└── README.md
```

---

## 3. Frontend Structure (`/frontend`) — Developer 1

```
/frontend
├── src/
│   ├── api/
│   │   ├── client.js              # fetch wrapper, auth header injection, error shape
│   │   ├── facilities.js
│   │   ├── assessments.js
│   │   ├── recommendations.js
│   │   └── simulate.js
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── FacilitySetup.jsx
│   │   ├── IntakeWizard.jsx
│   │   ├── OverviewDashboard.jsx
│   │   ├── EmissionAnalysisDashboard.jsx
│   │   ├── LeakPointDashboard.jsx
│   │   ├── RecommendationDashboard.jsx
│   │   ├── WhatIfSimulator.jsx
│   │   ├── ActionRoadmap.jsx
│   │   └── ReportsHistory.jsx
│   ├── components/
│   │   ├── KpiCard.jsx
│   │   ├── RankedBarChart.jsx
│   │   ├── RecommendationCard.jsx
│   │   ├── ExplanationChecklist.jsx
│   │   ├── DataTable.jsx
│   │   ├── StepperNav.jsx
│   │   ├── LoadingSkeleton.jsx
│   │   ├── EmptyState.jsx
│   │   ├── ErrorBanner.jsx
│   │   └── Toast.jsx
│   ├── context/
│   │   └── FacilityAssessmentContext.jsx   # active facility + active assessment
│   ├── hooks/
│   │   ├── useAssessmentSummary.js
│   │   ├── useLeakPoints.js
│   │   ├── useRecommendations.js
│   │   └── useSimulate.js
│   ├── router/
│   │   └── AppRoutes.jsx
│   └── styles/                    # Tailwind config, design tokens
└── package.json
```

**Rule:** Frontend never computes CO₂e, never scores recommendations, and never talks to the database directly. It only calls the API contract defined in `BACKEND_IMPLEMENTATION.md`.

---

## 4. Backend Structure (`/backend`) — Developer 2

```
/backend
├── app/
│   ├── main.py                    # FastAPI app init, model load at startup
│   ├── routers/
│   │   ├── facilities.py
│   │   ├── assessments.py
│   │   ├── inputs.py
│   │   ├── summary.py
│   │   ├── leak_points.py
│   │   ├── recommendations.py
│   │   ├── simulate.py
│   │   ├── apply.py
│   │   ├── history.py
│   │   └── export.py
│   ├── schemas/                   # Pydantic request/response models
│   ├── services/
│   │   ├── calculation_engine.py  # deterministic CO2e engine
│   │   ├── leak_analysis.py       # aggregation/ranking
│   │   ├── recommendation_engine.py  # orchestrates ML ranker + rule fallback
│   │   ├── simulator.py           # what-if + overlap rule
│   │   └── report_generator.py
│   ├── models/                    # SQLAlchemy ORM models (mirrors §I of blueprint)
│   ├── db/
│   │   ├── session.py
│   │   └── migrations/
│   └── core/
│       ├── config.py               # env vars
│       ├── auth.py
│       └── errors.py
└── requirements.txt
```

**Rule:** The backend is the only component that reads/writes the database. It calls into `/ml` only through the recommendation engine's defined function signature (see §6) — it never imports frontend code and never invents emission or cost figures.

---

## 5. ML Structure (`/ml`) — Developer 3

```
/ml
├── data/
│   ├── emission_factors.csv          # sourced, versioned
│   ├── intervention_library.csv
│   └── training_dataset.csv          # curated + synthetic (clearly labeled)
├── pipeline/
│   ├── preprocess.py                 # cleaning, encoding, scaling
│   ├── train.py                      # train/test split, GradientBoostingRegressor
│   ├── evaluate.py                   # top-k agreement, Spearman correlation, MAE
│   └── rule_based_scorer.py          # deterministic fallback formula
├── inference/
│   └── ranker.py                     # loads model, exposes score(facility, leak_point, interventions)
├── models/
│   └── recommender_v1.joblib         # versioned, saved artifact
└── notebooks/                        # exploration only, not part of the runtime path
```

**Rule:** `ml/inference/ranker.py` exposes a single function with a fixed input/output contract (see `ML_IMPLEMENTATION.md` §Backend Integration). This is the only surface the backend imports from. Everything else in `/ml` is build-time tooling, not runtime dependency.

---

## 6. Integration Point Between Backend and ML

- Backend's `recommendation_engine.py` calls `ranker.score(facility_profile, leak_points, candidate_interventions)`.
- Expected return shape: a list of `{intervention_id, score, score_source, explanation_flags}` — identical whether produced by the ML ranker or the rule-based fallback.
- If the ML ranker raises an exception, is missing its model file, or times out, `recommendation_engine.py` calls `rule_based_scorer.py` instead, using the **same function signature**. This is enforced in code, not left as a convention, so the frontend never needs to know which path served a given response (`score_source` field tells it, for transparency).

---

## 7. Dataset Structure (`/datasets`, shared)

```
/datasets
├── emission_factors/
│   └── emission_factors_v1.json      # id, category, subtype, unit, emission_factor,
│                                      # factor_unit, source, scope, version, last_updated
└── intervention_library/
    └── interventions_v1.json         # id, name, category, supported_industries,
                                       # applicable_leak_types, estimated_cost, expected_CO2_reduction,
                                       # implementation_difficulty, payback_period, ROI, explanation
```

Owned jointly: Developer 3 curates content, Developer 2 defines/validates the schema (it must match the DB tables in `BACKEND_IMPLEMENTATION.md` exactly), Developer 1 never edits these files directly — it only consumes them through the API.

---

## 8. Database Structure

See `BACKEND_IMPLEMENTATION.md` §Database Schema for full table definitions. Summary of tables: `User`, `Facility`, `Assessment`, `ProcessInput`, `EmissionFactor`, `InterventionLibrary`, `Recommendation`, `AppliedIntervention`, `AssessmentHistory`, `Report`.

**Non-negotiable separation, enforced by the schema itself (not convention):**
- `ProcessInput.computed_co2e` and `Assessment.total_co2e` → written **only** by the Calculation Engine. Never directly writable via any API request body.
- `InterventionLibrary.estimated_cost` / `estimated_CO2_reduction` → curated estimates, clearly labeled as ranges, never merged into the authoritative totals.
- `Recommendation.score` + `score_source` → the only ML/rule-scored field in the system.

This gives three distinct trust tiers that must never collapse into one number: **calculated → estimated → scored/ranked.**

---

## 9. Configuration / Environment Structure

```
.env (backend)
  DATABASE_URL=
  JWT_SECRET=
  ML_MODEL_PATH=./ml/models/recommender_v1.joblib
  STORAGE_BUCKET_URL=

.env (frontend)
  VITE_API_BASE_URL=
```

No API keys for third-party live services are required (see constraint: no live emission-factor API, no paid dependency). Secrets are never committed; `.env.example` documents required keys without values.

---

## 10. Module Responsibilities Summary

| Module | Owner | Responsibility | Must NOT do |
|---|---|---|---|
| `/frontend` | Dev 1 | Render UI, call API, manage local/derived state | Compute CO₂e, score interventions, touch DB |
| `/backend/app/services/calculation_engine.py` | Dev 2 | Deterministic CO₂e math only | Call ML, invent factors |
| `/backend/app/services/recommendation_engine.py` | Dev 2 | Orchestrate ML vs. rule-based call, never compute emissions | Modify `total_co2e` |
| `/ml` | Dev 3 | Score/rank interventions, train/evaluate model, rule-based fallback | Calculate authoritative CO₂e |
| `/datasets` | Dev 3 (content) / Dev 2 (schema) | Static, versioned source-of-truth data | Contain invented emission factors or real company data |

---

## 11. Data Flow (end-to-end)

```
Facility Setup → Guided Intake → POST /inputs
   → Calculation Engine (emission_factors dataset) → computed_co2e per line
   → Leak Analysis (aggregate + rank) → leak_points
   → Recommendation Engine
        → ML Ranker (feature vector: facility + leak_point + intervention)
        → [fallback] Rule-Based Scorer
   → Recommendation cards (score + explanation)
   → What-If Simulator (overlap-adjusted projection)
   → Action Roadmap (auto-bucketed by difficulty + payback)
   → Report Generator → PDF/CSV export
   → AssessmentHistory (snapshot for trend view)
```

---

## 12. Development Conventions

- **API-contract-first:** the contract in `BACKEND_IMPLEMENTATION.md` is frozen at the end of Day 1. Only additive, non-breaking changes after that (see `IMPLEMENTATION_PLAN.md` §Integration Checkpoints).
- **No invented data:** emission factors and cost/CO₂ ranges must trace to a documented public source or be explicitly marked `synthetic` (ML training labels only).
- **No cross-module imports:** frontend never imports backend code; backend never imports frontend code; backend imports `/ml` only through `inference/ranker.py`.
- **Every derived numeric field** (`computed_co2e`, `total_co2e`, `score`) is written by exactly one module and is read-only everywhere else.
- **Commits:** one feature branch per screen/endpoint/model step; merge to `main` at each integration checkpoint (end of Day 1, Day 2, Day 3 morning).

## 13. What Must Not Be Mixed

- Frontend must not contain business logic for emissions math or recommendation scoring — those are backend/ML concerns exposed only via API.
- Backend must not contain UI logic, chart formatting, or hardcoded presentation strings — those belong in the frontend layer.
- ML must not write to the database directly — all persistence goes through the backend's SQLAlchemy models.
- Estimated/ML-derived numbers must never overwrite or be summed into the deterministic `total_co2e` field.
