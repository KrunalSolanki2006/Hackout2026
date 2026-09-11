# BACKEND_IMPLEMENTATION.md
## Industrial Emission Leak-Point Detector & Circular Alternative Recommender

---

## 1. Backend Architecture & Technology Choice

**Recommended stack: Python + FastAPI + PostgreSQL (via Supabase).**

**Node/Express vs. Python/FastAPI:** FastAPI is preferred specifically because the ML ranking model is Python-native (scikit-learn). Keeping the API layer and ML inference in the same language/process avoids building and maintaining a cross-language bridge (e.g., Node calling a separate Python microservice) under hackathon time pressure. FastAPI's Pydantic-based request validation also maps naturally onto the strict input-validation requirements of the CO₂ engine (§4).

**Single service, internally modularized — no microservices, no Kubernetes, no message queues, no separate ML-serving infrastructure.** The trained model is loaded once at API startup and called as a plain in-process function.

```
API Layer (FastAPI routers)
   ↓
Validation (Pydantic schemas)
   ↓
Calculation Engine (deterministic module)
   ↓
Leak Analysis (aggregation/ranking module)
   ↓
Recommendation Engine (orchestrator)
   ├──▶ ML Ranker (scikit-learn model, loaded at startup)
   └──▶ Rule-Based Scorer (fallback, always available)
   ↓
Database Layer (SQLAlchemy → PostgreSQL/Supabase)
```

## 2. Folder / Module Responsibilities

See `PROJECT_STRUCTURE.md` §4 for the full tree. Summary of responsibility boundaries:

- `routers/` — HTTP layer only; no business logic.
- `schemas/` — Pydantic request/response contracts, matching §7 exactly.
- `services/calculation_engine.py` — the only module allowed to write `computed_co2e` / `total_co2e`.
- `services/leak_analysis.py` — aggregation and ranking only, reads calculated values, writes nothing back to `ProcessInput`.
- `services/recommendation_engine.py` — orchestrates ML vs. rule-based scoring; never touches emissions figures.
- `services/simulator.py` — implements the overlap rule (§6); reads `total_co2e` as an immutable input.
- `services/report_generator.py` — read-only consumer of everything above.

## 3. Database Schema

### `User`
`id (PK)`, `name`, `email (unique)`, `password_hash`, `role enum(operator, consultant, regulator)`, `created_at`

### `Facility`
`id (PK)`, `owner_user_id (FK → User.id)`, `name`, `industry enum(plastic, textile, food_processing)`, `facility_size enum(small, medium, large)`, `region`, `production_volume (nullable)`, `created_at`

### `Assessment`
`id (PK)`, `facility_id (FK → Facility.id)`, `status enum(draft, complete)`, `total_co2e (numeric, derived, not manually editable)`, `created_at`, `completed_at`

### `ProcessInput`
`id (PK)`, `assessment_id (FK → Assessment.id)`, `category enum(energy, material, waste)`, `subtype (string)`, `quantity (numeric, > 0)`, `unit (string)`, `emission_factor_id (FK → EmissionFactor.id)`, `computed_co2e (numeric, derived)`

### `EmissionFactor`
`id (PK)`, `category`, `subtype`, `unit`, `emission_factor (numeric)`, `factor_unit`, `source (text)`, `scope enum(1,2,3)`, `last_updated (date)`
**Unique constraint:** `(category, subtype, unit)`

### `InterventionLibrary`
`id (PK)`, `name`, `category enum(energy, materials, waste)`, `description`, `supported_industries (array)`, `applicable_leak_types (array)`, `estimated_cost_min`, `estimated_cost_max`, `estimated_co2_reduction_min`, `estimated_co2_reduction_max`, `implementation_difficulty enum(low, medium, high)`, `payback_period_months`, `roi_pct`, `explanation`

### `Recommendation`
`id (PK)`, `assessment_id (FK → Assessment.id)`, `intervention_id (FK → InterventionLibrary.id)`, `leak_point_ref (string)`, `score (numeric 0–100)`, `score_source enum(ml, rule_based)`, `status enum(suggested, applied, dismissed)`, `created_at`

### `AppliedIntervention`
`id (PK)`, `assessment_id (FK → Assessment.id)`, `recommendation_id (FK → Recommendation.id)`, `applied_at`, `roadmap_phase enum(1,2,3)`, `status enum(planned, in_progress, completed)`

### `AssessmentHistory`
`id (PK)`, `facility_id (FK → Facility.id)`, `assessment_id (FK → Assessment.id)`, `total_co2e_snapshot`, `recorded_at`

### `Report`
`id (PK)`, `assessment_id (FK → Assessment.id)`, `format enum(pdf, csv)`, `file_url`, `generated_at`

**Relationships:** `User 1—* Facility`; `Facility 1—* Assessment`; `Assessment 1—* ProcessInput`; `Assessment 1—* Recommendation`; `Recommendation 1—0/1 AppliedIntervention`; `Facility 1—* AssessmentHistory`; `Assessment 1—* Report`.

**Constraints:** `ProcessInput.quantity > 0`; `EmissionFactor` unique on `(category, subtype, unit)`; `Assessment.total_co2e` and `ProcessInput.computed_co2e` are **never directly writable via any API** — only the Calculation Engine sets them.

**Indexes:** `Assessment.facility_id`, `ProcessInput.assessment_id`, `Recommendation.assessment_id`, `AppliedIntervention.assessment_id`, `AssessmentHistory.facility_id` — the join/lookup paths every dashboard queries on load.

## 4. Deterministic CO₂ Engine

**Required inputs (per `ProcessInput` row):** `category` (energy/material/waste), `subtype` (e.g. "diesel," "virgin_plastic," "landfill_disposal"), `quantity`, `unit`.

**Calculation process:**
```
For each ProcessInput row:
  a. Look up matching EmissionFactor by (category, subtype, unit)
  b. If unit mismatch but convertible (e.g., litres vs. gallons) → convert, then match
  c. If no factor found → flag as "unsupported input," exclude from total, surface to user (never silently drop)
  d. CO2e = quantity × emission_factor
  e. Store: input value, factor used, factor source, resulting CO2e (immutable audit record)
Aggregate CO2e by category (energy/materials/waste) and by individual input (for leak-point ranking).
Total CO2e = sum of all line CO2e.
```

**Unit handling:** each subtype in the factor dataset declares its accepted unit(s). A small conversion table (litres↔gallons, kg↔lb, kWh↔MWh) resolves common mismatches. Anything outside the conversion table is rejected at intake validation, not silently guessed.

**Validation:** `quantity > 0`; unit must be in the accepted/convertible set for that subtype; the `(category, subtype)` pair must exist in the factor dataset — if not, the intake UI is told immediately rather than allowing a silent zero.

**Missing factors:** marked "not yet supported," excluded from the total, surfaced with a visible warning + count on the dashboard (e.g., "2 inputs could not be calculated — unsupported subtype"). More credible to judges than fabricating a number.

**Example (illustrative only — real build must use sourced factor values):**
```
Input: Diesel, quantity = 5,000 litres
Emission Factor: 2.68 kg CO2e / litre (source: [sourced public factor table], scope 1)
CO2e = 5,000 × 2.68 = 13,400 kg CO2e = 13.4 t CO2e
```

## 5. Emission-Factor Lookup & Leak-Point Calculation

- Lookup key: `(category, subtype, unit)`, unique-indexed.
- Leak-point ranking: aggregate `computed_co2e` per input/category, sort descending by contribution %, assign severity badges by threshold (e.g., ≥30% High, 10–30% Medium, <10% Low — exact thresholds configurable but must be documented and consistent).
- Leak-point ranking is recomputed whenever `ProcessInput` rows change and the assessment is recalculated; it is never manually editable.

## 6. What-If Calculation (Simulator)

**Core formula:**
```
Projected CO2e = Current CO2e − Σ(expected_CO2_reduction for each selected, non-overlapping intervention)
```

**Trust separation:** "Current CO2e" always comes directly from the deterministic engine, untouched. The subtracted reduction is explicitly the *estimated* range from `InterventionLibrary`. The API response and UI must label the projected figure "Projected (estimated)" — never implying it is a recalculated authoritative number.

**Overlap handling (no double-counting):** each intervention declares which `applicable_leak_types` it addresses. When 2+ selected interventions target the same leak point/subtype, the simulator does **not** sum both reductions — it applies the **larger** of the two reduction estimates for that leak point, then adds reductions from interventions addressing other, non-overlapping leak points normally. This is a simple, explainable "take-the-max-per-leak-point" rule, documented as a modeling simplification (marginal/sequential reduction modeling is named as a future improvement if judges ask).

**Costs are additive** regardless of CO₂-reduction overlap, since money spent on both interventions is still spent — Investment, Annual Savings, Payback, and ROI aggregate normally.

## 7. API Specification

| Method | Endpoint | Purpose | Auth | Key Request Fields | Response Shape | Validation / Errors |
|---|---|---|---|---|---|---|
| POST | `/facilities` | Create facility | Required | `name, industry, facility_size, region, production_volume?` | `{facility}` | industry/size must be valid enum |
| GET | `/facilities` | List user's facilities | Required | — | `{facilities: []}` | scoped to authenticated user |
| GET | `/facilities/:id` | Get one facility | Required | — | `{facility}` | 404 if not owned |
| POST | `/facilities/:id/assessments` | Start assessment | Required | — | `{assessment: {status: draft}}` | facility must exist/be owned |
| GET | `/assessments/:id` | Get assessment (+ draft inputs) | Required | — | `{assessment, inputs: []}` | — |
| POST | `/assessments/:id/inputs` | Add/update input line(s) | Required | `category, subtype, quantity, unit` | `{input, computed_co2e?}` | quantity > 0; subtype/unit must resolve to an `EmissionFactor` or return `unsupported_input` warning |
| GET | `/assessments/:id/summary` | Overview + line-item detail | Required | — | `{total_co2e, category_totals, line_items: []}` | 400 if assessment still draft/uncalculated |
| GET | `/assessments/:id/leak-points` | Ranked leak points | Required | — | `{leak_points: [{rank, name, pct, co2e}]}` | — |
| GET | `/assessments/:id/recommendations` | Ranked interventions | Required | `leak_point?` (filter) | `{recommendations: [{intervention, score, score_source, explanation, applicable_leak_point}]}` | falls back to rule-based scorer transparently on ML failure |
| POST | `/assessments/:id/simulate` | What-if calculation | Required | `selected_intervention_ids: []` | `{current_co2e, projected_co2e, reduction_abs, reduction_pct, investment, payback, roi}` | applies overlap rule (§6) |
| POST | `/assessments/:id/recommendations/:id/apply` | Commit a recommendation | Required | `roadmap_phase?` | `{applied_intervention}` | recommendation must belong to assessment |
| GET | `/assessments/:id/history` | Assessment history for facility | Required | — | `{history: [{assessment_id, total_co2e, recorded_at}]}` | — |
| GET | `/assessments/:id/export` | Generate report | Required | `format=pdf\|csv` | `{file_url}` | 400 if assessment incomplete |

**Example — recommendations response:**
```json
{
  "recommendations": [
    {
      "intervention": {"id": "INT-001", "name": "Solar + Grid Hybrid", "category": "energy"},
      "score": 91,
      "score_source": "ml",
      "estimated_cost_range": [40000, 65000],
      "estimated_co2_reduction_range": [8, 12],
      "payback_period_months": 30,
      "explanation": ["High emission contribution", "Strong industry fit", "High CO2 reduction potential", "Acceptable implementation cost"],
      "applicable_leak_point": "diesel_generator"
    }
  ]
}
```

## 8. Authentication & Authorization

- **Authentication:** required for all facility/assessment endpoints (JWT or session via Supabase Auth or equivalent).
- **Authorization:** row-level ownership checks — a user can only access facilities they own or (for consultants) manage.
- **Data protection:** facility process data may be commercially sensitive; scoped strictly per-user, never globally queryable.

## 9. Validation & Error Handling

- Strict validation on every intake field (type, range, enum) via Pydantic — this is a data-integrity tool, garbage-in must be caught early.
- Standard error cases: invalid unit for subtype, missing required intake fields, assessment not found/not owned by requester, export requested on an incomplete assessment.
- All errors return a consistent shape (`{error_code, message}`) so the frontend's `ErrorBanner` can render uniformly.

## 10. Recommendation Service Integration (ML + Fallback)

`recommendation_engine.py` calls `ml/inference/ranker.py`'s scoring function with the facility profile, leak points, and candidate interventions. If the ML ranker raises an exception, is missing its model artifact, or times out, the engine calls the rule-based scorer instead — **same function signature, same output shape** (`{intervention_id, score, score_source, explanation_flags}`). This fallback is a design requirement enforced in code, not an afterthought; the API/frontend contract never changes regardless of which path served the response.

## 11. Roadmap Logic

Derived, not separately stored beyond `AppliedIntervention.roadmap_phase`: interventions are auto-bucketed into Phase 1/2/3 based on `implementation_difficulty` + `payback_period_months` at apply-time, with manual override supported via a simple update to `roadmap_phase`. No dedicated roadmap endpoint is required beyond apply/dismiss already defined in §7.

## 12. Assessment History & Report Generation

- On each completed assessment, a snapshot row is written to `AssessmentHistory` (facility_id, assessment_id, total_co2e_snapshot, recorded_at) — this powers the trend/comparison view without re-querying old assessments' live state.
- `report_generator.py` produces PDF via a server-side rendering library; if that proves unstable under time pressure, falls back to a styled HTML report page with identical content. CSV export is a straightforward tabular dump of `ProcessInput` + `Recommendation` data for the assessment.

## 13. Security

- HTTPS only; standard REST auth headers.
- Secrets (DB credentials, auth provider keys) in environment variables, never client-side.
- If CSV upload is supported (stretch), validate file type/size and sanitize parsed content before DB insert.
- Light rate limiting on write endpoints to prevent accidental resubmission storms.
- Out of scope for MVP: enterprise SSO, GDPR/PII-specific tooling, complex RBAC hierarchies.

## 14. Logging

- Log every calculation run (assessment_id, timestamp, factor dataset version used) for auditability.
- Log recommendation engine path taken (`ml` vs `rule_based`) per request, to support debugging and the "fallback actually works" demo claim.

## 15. Backend Testing

- **Unit:** Calculation Engine correctness against hand-computed examples; unit-conversion table; overlap rule in the simulator.
- **API:** every endpoint in §7, including validation and error paths.
- **Database:** constraint enforcement (`quantity > 0`, unique `EmissionFactor`, non-writable derived fields).
- **Auth:** ownership scoping — a user cannot access another user's facility/assessment.
- **Integration:** full flow from `POST /facilities` through `GET /assessments/:id/export`.

## 16. Backend Developer Checklist

- [ ] Scaffold FastAPI project, configure Pydantic schemas matching §7 exactly.
- [ ] Implement auth (JWT/Supabase) and ownership checks.
- [ ] Build Facility/Assessment/ProcessInput CRUD.
- [ ] Implement Calculation Engine (§4) against Dev 3's factor dataset (stub first, swap in full dataset later without code changes).
- [ ] Implement Leak Analysis (§5).
- [ ] Wire Recommendation Engine orchestration with ML → rule-based fallback (§10).
- [ ] Implement Simulator overlap logic (§6).
- [ ] Implement roadmap bucketing, history snapshotting, and report export.
- [ ] Load the ML model once at startup, not per-request; test this specifically on Day 2.
- [ ] Freeze the API contract at end of Day 1; only additive changes after.
