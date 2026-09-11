# API_CONTRACT.md
## Industrial Emission Leak-Point Detector & Circular Alternative Recommender
### Frozen API Contract — Frontend / Backend / ML

This document is the single source of truth for every request/response shape in the system. It is derived strictly from, and must remain consistent with, `PROJECT_STRUCTURE.md`, `IMPLEMENTATION_PLAN.md`, `FRONTEND_IMPLEMENTATION.md`, `BACKEND_IMPLEMENTATION.md`, and `ML_IMPLEMENTATION.md`. Per team convention, this contract is **frozen at the end of Day 1** — only additive, non-breaking changes are allowed afterward.

No application code is included below. All schemas are illustrative field definitions, not implementations.

---

## 1. API Conventions

**Base URL**
```
https://<backend-host>/api/v1
```
Local dev default: `http://localhost:8000/api/v1`

**Authentication**
- Bearer JWT in the `Authorization` header for every endpoint except `POST /auth/signup` and `POST /auth/login`.
- Token is issued by the auth provider (Supabase Auth or equivalent) on login/signup.
- All facility/assessment-scoped endpoints additionally enforce row-level ownership: a user may only access facilities they own, or — for `consultant` role — facilities they manage.

**Headers**

| Header | Required | Value |
|---|---|---|
| `Authorization` | Yes (except auth endpoints) | `Bearer <jwt>` |
| `Content-Type` | Yes (for POST/PATCH) | `application/json` |
| `Accept` | Recommended | `application/json` |

**JSON Format**
- All request and response bodies are JSON.
- Field names are `snake_case`.
- Numeric monetary fields are plain numbers in a single currency unit (no formatting, no currency symbols) with currency communicated separately where relevant (see `estimated_cost_min/max` + `currency`).
- Dates/timestamps are ISO 8601 UTC strings (e.g., `2026-09-12T10:15:00Z`).
- Enum values are lowercase `snake_case` strings (see §6).

**Standard Success Response Envelope**
```json
{
  "success": true,
  "data": { },
  "meta": { }
}
```
`meta` is optional and used for pagination or supplementary context (e.g., `unsupported_inputs_count`). Endpoint-specific `data` shapes are defined per-endpoint in §2.

**Standard Error Response Envelope**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "quantity must be greater than 0",
    "field": "quantity"
  }
}
```
`field` is present only for field-level validation errors.

**Standard Error Codes (used across all endpoints)**

| HTTP Status | `error.code` | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body failed schema/business validation |
| 400 | `ASSESSMENT_NOT_CALCULATED` | Requested data requires a completed calculation first |
| 400 | `ASSESSMENT_INCOMPLETE` | Export/report requested on a draft assessment |
| 401 | `UNAUTHENTICATED` | Missing/invalid JWT |
| 403 | `FORBIDDEN` | Authenticated but not the resource owner |
| 404 | `NOT_FOUND` | Resource does not exist or is not visible to this user |
| 409 | `CONFLICT` | e.g., duplicate `(category, subtype, unit)` on write paths that disallow it |
| 422 | `UNSUPPORTED_INPUT` | Subtype/unit does not resolve to any `EmissionFactor` |
| 500 | `INTERNAL_ERROR` | Unexpected server-side failure |

---

## 2. Complete API List

### 2.1 Auth

#### `POST /auth/signup`
- **Purpose:** create a user account.
- **Auth:** none.
- **Request body:**
```json
{ "name": "string", "email": "string", "password": "string", "role": "operator | consultant | regulator" }
```
- **Success response (201):**
```json
{ "success": true, "data": { "user": { "id": "uuid", "name": "string", "email": "string", "role": "operator" }, "token": "jwt" } }
```
- **Validation:** email must be unique/valid format; password minimum length per auth provider policy; `role` must be a valid enum.
- **Errors:** `409 CONFLICT` (email already registered), `400 VALIDATION_ERROR`.
- **DB entities:** `User`.

#### `POST /auth/login`
- **Purpose:** authenticate and receive a JWT.
- **Auth:** none.
- **Request body:** `{ "email": "string", "password": "string" }`
- **Success response (200):** `{ "success": true, "data": { "user": {...}, "token": "jwt" } }`
- **Errors:** `401 UNAUTHENTICATED` (bad credentials).
- **DB entities:** `User`.

---

### 2.2 Facility

#### `POST /facilities`
- **Purpose:** create a facility profile.
- **Auth:** required.
- **Request body:**
```json
{
  "name": "ABC Plastics",
  "industry": "plastic",
  "facility_size": "medium",
  "region": "string",
  "production_volume": 50000
}
```
- **Example request:**
```
POST /api/v1/facilities
Authorization: Bearer <jwt>
Content-Type: application/json

{ "name": "ABC Plastics", "industry": "plastic", "facility_size": "medium", "region": "Gujarat, IN", "production_volume": 50000 }
```
- **Success response schema (201):**
```json
{ "success": true, "data": { "facility": {
  "id": "uuid", "owner_user_id": "uuid", "name": "string",
  "industry": "plastic", "facility_size": "medium", "region": "string",
  "production_volume": 50000, "created_at": "iso8601"
} } }
```
- **Validation:** `industry` ∈ {plastic, textile, food_processing}; `facility_size` ∈ {small, medium, large}; `production_volume` > 0 if provided; `name` and `region` required non-empty strings.
- **Errors:** `400 VALIDATION_ERROR`.
- **DB entities:** `Facility`.

#### `GET /facilities`
- **Purpose:** list the authenticated user's facilities (or managed clients, for consultants).
- **Auth:** required.
- **Request params:** none (pagination optional: `?page=1&page_size=20`).
- **Success response (200):**
```json
{ "success": true, "data": { "facilities": [ { "id": "uuid", "name": "string", "industry": "plastic", "facility_size": "medium", "region": "string", "created_at": "iso8601" } ] } }
```
- **Errors:** `401 UNAUTHENTICATED`.
- **DB entities:** `Facility`.

#### `GET /facilities/:id`
- **Purpose:** get one facility.
- **Auth:** required.
- **Path params:** `id` (facility UUID).
- **Success response (200):** `{ "success": true, "data": { "facility": { ...same shape as create... } } }`
- **Errors:** `404 NOT_FOUND` (not owned or does not exist).
- **DB entities:** `Facility`.

#### `PATCH /facilities/:id`
- **Purpose:** edit a facility profile.
- **Auth:** required.
- **Request body:** any subset of `{ name, industry, facility_size, region, production_volume }`.
- **Success response (200):** updated `facility` object.
- **Validation:** same enum rules as create.
- **Errors:** `404 NOT_FOUND`, `400 VALIDATION_ERROR`.
- **DB entities:** `Facility`.

---

### 2.3 Assessment

#### `POST /facilities/:id/assessments`
- **Purpose:** start a new (draft) assessment for a facility.
- **Auth:** required.
- **Path params:** `id` (facility UUID).
- **Request body:** none (empty object `{}`).
- **Success response (201):**
```json
{ "success": true, "data": { "assessment": { "id": "uuid", "facility_id": "uuid", "status": "draft", "total_co2e": null, "created_at": "iso8601", "completed_at": null } } }
```
- **Validation:** facility must exist and be owned by the requester.
- **Errors:** `404 NOT_FOUND`.
- **DB entities:** `Assessment`.

#### `GET /assessments/:id`
- **Purpose:** get an assessment and its current (possibly draft) input lines — used to reload an in-progress intake wizard.
- **Auth:** required.
- **Success response (200):**
```json
{ "success": true, "data": {
  "assessment": { "id": "uuid", "facility_id": "uuid", "status": "draft", "total_co2e": null, "created_at": "iso8601", "completed_at": null },
  "inputs": [ { "id": "uuid", "category": "energy", "subtype": "diesel", "quantity": 5000, "unit": "l", "computed_co2e": null } ]
} }
```
- **Errors:** `404 NOT_FOUND`.
- **DB entities:** `Assessment`, `ProcessInput`.

---

### 2.4 Activity / Operational Inputs

#### `POST /assessments/:id/inputs`
- **Purpose:** add one or more activity-data lines (energy, material, or waste) during guided intake.
- **Auth:** required.
- **Request body (single line):**
```json
{ "category": "energy", "subtype": "diesel", "quantity": 5000, "unit": "l" }
```
- **Request body (batch, alternative):**
```json
{ "inputs": [
  { "category": "energy", "subtype": "electricity", "quantity": 40000, "unit": "kwh" },
  { "category": "energy", "subtype": "diesel", "quantity": 5000, "unit": "l" },
  { "category": "material", "subtype": "virgin_plastic", "quantity": 20000, "unit": "kg" },
  { "category": "waste", "subtype": "plastic_waste", "quantity": 3000, "unit": "kg", "treatment": "landfill" }
] }
```
- **Example request:**
```
POST /api/v1/assessments/9f1e.../inputs
Authorization: Bearer <jwt>
Content-Type: application/json

{ "category": "energy", "subtype": "diesel", "quantity": 5000, "unit": "l" }
```
- **Success response schema (201):**
```json
{ "success": true, "data": { "input": {
  "id": "uuid", "assessment_id": "uuid", "category": "energy", "subtype": "diesel",
  "quantity": 5000, "unit": "l", "computed_co2e": null
} }, "meta": { "unsupported_input": false } }
```
Note: `computed_co2e` remains `null` until `POST /assessments/:id/calculate` is called — inputs are stored first, calculated second (see §7 flow).
- **Validation:** `quantity > 0`; `category` ∈ {energy, material, waste}; `subtype` must be a recognized value for that category (§6); `unit` must be valid for the subtype, or convertible via the backend's unit-conversion table; `treatment` required and validated against the waste-treatment enum when `category = waste`.
- **Errors:** `422 UNSUPPORTED_INPUT` (subtype/unit does not resolve to any `EmissionFactor` — the line is still stored but flagged, never silently dropped), `400 VALIDATION_ERROR`.
- **DB entities:** `ProcessInput`, `EmissionFactor` (lookup only).

#### `PATCH /assessments/:id/inputs/:inputId`
- **Purpose:** edit a draft input line before calculation.
- **Auth:** required.
- **Request body:** any subset of `{ category, subtype, quantity, unit, treatment }`.
- **Success response (200):** updated `input` object.
- **Errors:** `404 NOT_FOUND`, `400 VALIDATION_ERROR`, `409 CONFLICT` (assessment already calculated — must re-open via recalculation, not silent edit).
- **DB entities:** `ProcessInput`.

#### `DELETE /assessments/:id/inputs/:inputId`
- **Purpose:** remove a draft input line.
- **Auth:** required.
- **Success response (200):** `{ "success": true, "data": { "deleted": true } }`
- **Errors:** `404 NOT_FOUND`.
- **DB entities:** `ProcessInput`.

---

### 2.5 CO₂ Calculation

#### `POST /assessments/:id/calculate`
- **Purpose:** run the deterministic Calculation Engine over all stored `ProcessInput` rows, producing `computed_co2e` per line and `total_co2e` on the assessment. This is the "Submit & Calculate" action at the end of the intake wizard.
- **Auth:** required.
- **Request body:** none.
- **Success response schema (200):**
```json
{ "success": true, "data": {
  "assessment": { "id": "uuid", "status": "complete", "total_co2e": 1240.5, "completed_at": "iso8601" },
  "unsupported_inputs": [ { "input_id": "uuid", "category": "material", "subtype": "unknown_resin", "reason": "no matching emission factor" } ]
}, "meta": { "unsupported_inputs_count": 1 } }
```
- **Validation:** assessment must have at least one `ProcessInput` row; recalculation is idempotent (re-running overwrites prior `computed_co2e`/`total_co2e`).
- **Errors:** `400 VALIDATION_ERROR` (no inputs to calculate), `404 NOT_FOUND`.
- **DB entities:** `Assessment`, `ProcessInput`, `EmissionFactor`.
- **Note:** `computed_co2e` and `total_co2e` are set **only** by this endpoint's underlying service. No other endpoint may write these fields.

---

### 2.6 Emission Analysis / Overview

#### `GET /assessments/:id/summary`
- **Purpose:** power both the Overview Dashboard (KPIs) and the Emission Analysis Dashboard (line-item detail).
- **Auth:** required.
- **Success response schema (200):**
```json
{ "success": true, "data": {
  "total_co2e": 1240.5,
  "category_totals": { "energy": 820.3, "material": 340.2, "waste": 80.0 },
  "line_items": [
    { "id": "uuid", "category": "energy", "subtype": "diesel", "quantity": 5000, "unit": "l",
      "emission_factor": 2.68, "factor_unit": "kg CO2e/l", "factor_source": "string", "co2e": 13400, "pct_contribution": 0.43 }
  ],
  "unsupported_inputs_count": 1
} }
```
- **Validation:** assessment `status` must be `complete`.
- **Errors:** `400 ASSESSMENT_NOT_CALCULATED`, `404 NOT_FOUND`.
- **DB entities:** `Assessment`, `ProcessInput`, `EmissionFactor`.

---

### 2.7 Leak Points

#### `GET /assessments/:id/leak-points`
- **Purpose:** ranked emission "leak point" list for the diagnostic dashboard.
- **Auth:** required.
- **Success response schema (200):**
```json
{ "success": true, "data": { "leak_points": [
  { "rank": 1, "leak_point_ref": "diesel_generator", "category": "energy", "subtype": "diesel",
    "co2e": 13400, "pct_contribution": 0.43, "severity": "high" },
  { "rank": 2, "leak_point_ref": "electricity", "category": "energy", "subtype": "electricity",
    "co2e": 8120, "pct_contribution": 0.26, "severity": "medium" }
] } }
```
- **Validation:** assessment `status` must be `complete`.
- **Severity thresholds:** `pct_contribution >= 0.30` → `high`; `0.10–0.30` → `medium`; `< 0.10` → `low`.
- **Errors:** `400 ASSESSMENT_NOT_CALCULATED`, `404 NOT_FOUND`.
- **DB entities:** `ProcessInput` (aggregated; no separate leak-point table — this is a derived read).

---

### 2.8 ML Recommendations

#### `GET /assessments/:id/recommendations`
- **Purpose:** ranked, explainable circular interventions per leak point.
- **Auth:** required.
- **Request params (query):** `leak_point` (optional, filters to one `leak_point_ref`), `category` (optional, filters by intervention category).
- **Example request:**
```
GET /api/v1/assessments/9f1e.../recommendations?leak_point=diesel_generator
Authorization: Bearer <jwt>
```
- **Success response schema (200):**
```json
{ "success": true, "data": { "recommendations": [
  {
    "recommendation_id": "uuid",
    "intervention": { "id": "INT-001", "name": "Solar + Grid Hybrid", "category": "energy" },
    "score": 91,
    "score_source": "ml",
    "estimated_cost_range": [40000, 65000],
    "currency": "USD",
    "estimated_co2_reduction_range": [8, 12],
    "co2_reduction_unit": "t CO2e/year",
    "payback_period_months": 30,
    "roi_pct": 22,
    "implementation_difficulty": "high",
    "explanation": ["High emission contribution", "Strong industry fit", "High CO2 reduction potential", "Acceptable implementation cost"],
    "applicable_leak_point": "diesel_generator",
    "status": "suggested"
  }
] } }
```
- **Validation:** assessment must be `complete`; if a `leak_point` filter is passed, it must match a leak point returned by `GET /assessments/:id/leak-points`.
- **Errors:** `400 ASSESSMENT_NOT_CALCULATED`, `404 NOT_FOUND`.
- **DB entities:** `Recommendation`, `InterventionLibrary`.
- **ML behavior:** this endpoint transparently falls back to the rule-based scorer if the ML ranker is unavailable — see §4. `score_source` in the response tells the caller which path served the result; the frontend contract never changes.

#### `POST /assessments/:id/recommendations/:recId/apply`
- **Purpose:** commit a recommendation — moves it toward the Action Roadmap.
- **Auth:** required.
- **Request body:** `{ "roadmap_phase": 1 }` (optional; auto-bucketed by difficulty + payback if omitted).
- **Success response (200):**
```json
{ "success": true, "data": { "applied_intervention": {
  "id": "uuid", "assessment_id": "uuid", "recommendation_id": "uuid",
  "applied_at": "iso8601", "roadmap_phase": 1, "status": "planned"
} } }
```
- **Validation:** `recId` must belong to `assessment_id`; `roadmap_phase` ∈ {1, 2, 3} if provided.
- **Errors:** `404 NOT_FOUND`, `400 VALIDATION_ERROR`.
- **DB entities:** `Recommendation` (status → `applied`), `AppliedIntervention`.

#### `POST /assessments/:id/recommendations/:recId/dismiss`
- **Purpose:** mark a recommendation as not relevant, removing it from active consideration without deleting the record.
- **Auth:** required.
- **Request body:** none.
- **Success response (200):** `{ "success": true, "data": { "recommendation": { "id": "uuid", "status": "dismissed" } } }`
- **Errors:** `404 NOT_FOUND`.
- **DB entities:** `Recommendation`.

---

### 2.9 What-If Simulation

#### `POST /assessments/:id/simulate`
- **Purpose:** compute the projected footprint, cost, and payback for a selected set of interventions, without committing them.
- **Auth:** required.
- Full contract in §5.

---

### 2.10 Applied Interventions & Carbon Reduction Roadmap

#### `GET /assessments/:id/roadmap`
- **Purpose:** read the phased roadmap board (Phase 1/2/3), derived from `AppliedIntervention` + its linked `Recommendation`/`InterventionLibrary` data.
- **Auth:** required.
- **Success response schema (200):**
```json
{ "success": true, "data": { "roadmap": {
  "phase_1": [ { "applied_intervention_id": "uuid", "name": "Waste Segregation", "priority": "high", "cost": 5000, "co2_reduction": 3, "payback_period_months": 6, "difficulty": "low", "status": "planned" } ],
  "phase_2": [ ],
  "phase_3": [ { "applied_intervention_id": "uuid", "name": "Solar + Grid Hybrid", "priority": "medium", "cost": 55000, "co2_reduction": 10, "payback_period_months": 30, "difficulty": "high", "status": "planned" } ]
} } }
```
- **Errors:** `404 NOT_FOUND`.
- **DB entities:** `AppliedIntervention`, `Recommendation`, `InterventionLibrary`.
- **Note:** there is no separate "create roadmap" endpoint — the roadmap is derived automatically the moment a recommendation is applied via `POST /assessments/:id/recommendations/:recId/apply`. This endpoint is read-only plus the phase/status update below.

#### `PATCH /assessments/:id/roadmap/:appliedInterventionId`
- **Purpose:** manually move an item between phases or update its status (e.g., mark "in progress").
- **Auth:** required.
- **Request body:** `{ "roadmap_phase": 2, "status": "in_progress" }` (either field optional, at least one required).
- **Success response (200):** updated `applied_intervention` object.
- **Validation:** `roadmap_phase` ∈ {1,2,3}; `status` ∈ {planned, in_progress, completed}.
- **Errors:** `404 NOT_FOUND`, `400 VALIDATION_ERROR`.
- **DB entities:** `AppliedIntervention`.

#### `DELETE /assessments/:id/roadmap/:appliedInterventionId`
- **Purpose:** remove an item from the roadmap (does not delete the underlying recommendation, which reverts to `suggested`).
- **Auth:** required.
- **Success response (200):** `{ "success": true, "data": { "deleted": true } }`
- **Errors:** `404 NOT_FOUND`.
- **DB entities:** `AppliedIntervention`, `Recommendation`.

---

### 2.11 Assessment History

#### `GET /assessments/:id/history`
- **Purpose:** facility-level trend/comparison data across past assessments.
- **Auth:** required.
- **Success response schema (200):**
```json
{ "success": true, "data": { "history": [
  { "assessment_id": "uuid", "total_co2e": 1240.5, "recorded_at": "iso8601" },
  { "assessment_id": "uuid", "total_co2e": 980.2, "recorded_at": "iso8601" }
] } }
```
- **Validation:** returns history scoped to the facility that owns `:id`, not just the single assessment.
- **Errors:** `404 NOT_FOUND`.
- **DB entities:** `AssessmentHistory`.

---

### 2.12 Reports & Export

#### `GET /assessments/:id/export`
- **Purpose:** generate and retrieve a downloadable report (PDF or CSV).
- **Auth:** required.
- **Request params (query):** `format` = `pdf` | `csv` (required).
- **Example request:**
```
GET /api/v1/assessments/9f1e.../export?format=pdf
Authorization: Bearer <jwt>
```
- **Success response schema (200):**
```json
{ "success": true, "data": { "report": { "id": "uuid", "assessment_id": "uuid", "format": "pdf", "file_url": "https://.../report.pdf", "generated_at": "iso8601" } } }
```
- **Validation:** assessment `status` must be `complete`; `format` must be a supported value.
- **Errors:** `400 ASSESSMENT_INCOMPLETE`, `400 VALIDATION_ERROR` (bad format), `404 NOT_FOUND`.
- **DB entities:** `Report`.
- **Fallback:** if PDF generation is unstable, the backend serves a styled HTML report at the same `file_url` semantics, with identical content — communicated to the frontend as `format: "html"` in the response if this fallback is active.

---

## 3. Endpoint Summary Table

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/signup` | Create user account |
| POST | `/auth/login` | Authenticate |
| POST | `/facilities` | Create facility |
| GET | `/facilities` | List facilities |
| GET | `/facilities/:id` | Get facility |
| PATCH | `/facilities/:id` | Edit facility |
| POST | `/facilities/:id/assessments` | Start assessment |
| GET | `/assessments/:id` | Get assessment + draft inputs |
| POST | `/assessments/:id/inputs` | Add activity input line(s) |
| PATCH | `/assessments/:id/inputs/:inputId` | Edit draft input line |
| DELETE | `/assessments/:id/inputs/:inputId` | Delete draft input line |
| POST | `/assessments/:id/calculate` | Run deterministic CO₂ calculation |
| GET | `/assessments/:id/summary` | Overview + line-item detail |
| GET | `/assessments/:id/leak-points` | Ranked leak points |
| GET | `/assessments/:id/recommendations` | Ranked interventions |
| POST | `/assessments/:id/recommendations/:recId/apply` | Commit a recommendation |
| POST | `/assessments/:id/recommendations/:recId/dismiss` | Dismiss a recommendation |
| POST | `/assessments/:id/simulate` | What-if calculation |
| GET | `/assessments/:id/roadmap` | Read phased roadmap |
| PATCH | `/assessments/:id/roadmap/:appliedInterventionId` | Move phase / update status |
| DELETE | `/assessments/:id/roadmap/:appliedInterventionId` | Remove from roadmap |
| GET | `/assessments/:id/history` | Facility assessment history |
| GET | `/assessments/:id/export` | Generate PDF/CSV report |

This list matches `BACKEND_IMPLEMENTATION.md` §7 exactly, extended only with the read/update endpoints for inputs and roadmap that §11 and §D8 of the frontend/backend docs implied but did not fully enumerate.

---

## 4. ML Integration Contract

This section governs the internal call between `backend/app/services/recommendation_engine.py` and `ml/inference/ranker.py`, referenced in `BACKEND_IMPLEMENTATION.md` §10 and `ML_IMPLEMENTATION.md` §16. It is **not** a public HTTP API — it is an in-process function contract — but it must be documented with the same rigor since it determines the `GET /assessments/:id/recommendations` response.

### 4.1 Backend → ML Input

```json
{
  "facility_profile": { "industry": "plastic", "facility_size": "medium", "region": "string" },
  "leak_points": [
    { "leak_point_ref": "diesel_generator", "category": "energy", "subtype": "diesel",
      "co2e_contribution": 13400, "pct_contribution": 0.43 }
  ],
  "candidate_interventions": [
    { "id": "INT-001", "category": "energy", "estimated_cost_min": 40000, "estimated_cost_max": 65000,
      "estimated_co2_reduction_min": 8, "estimated_co2_reduction_max": 12,
      "implementation_difficulty": "high", "supported_industries": ["plastic"], "applicable_leak_types": ["diesel_generator"] }
  ]
}
```
`candidate_interventions` is pre-filtered by the backend to only those whose `supported_industries` and `applicable_leak_types` match the facility/leak-point profile, per `ML_IMPLEMENTATION.md` §9.

### 4.2 Feature Format (per candidate, constructed inside the ML module)

| Feature | Type | Encoding |
|---|---|---|
| `industry` | categorical | one-hot |
| `facility_size` | categorical | one-hot |
| `leak_category` | categorical | one-hot |
| `leak_contribution_pct` | numeric | scaled |
| `leak_co2e_contribution` | numeric | scaled |
| `intervention_category` | categorical | one-hot |
| `estimated_cost` (midpoint of range) | numeric | scaled |
| `expected_co2_reduction` (midpoint of range) | numeric | scaled |
| `implementation_difficulty` | ordinal | 0/1/2 |
| `industry_suitability` | boolean | 0/1 |

This matches `ML_IMPLEMENTATION.md` §4 and §8 exactly.

### 4.3 ML → Backend Output

```json
[
  {
    "intervention_id": "INT-001",
    "score": 91,
    "score_source": "ml",
    "explanation_flags": ["High emission contribution", "Strong industry fit", "High CO2 reduction potential", "Acceptable implementation cost"]
  }
]
```

- `score`: integer 0–100, "suitability score," never conflated with a physical/scientific measurement.
- `score_source`: `"ml"` or `"rule_based"` — always present, always accurate to which path actually served the result.
- `explanation_flags`: derived deterministically from the same feature thresholds used to score (see `ML_IMPLEMENTATION.md` §14) — not independently generated text.

### 4.4 Recommendation Score Format (as persisted and returned publicly)

The backend maps the ML/rule-based output directly onto the `Recommendation` table and the public API response shown in §2.8 — no additional transformation. `score` and `score_source` are the two fields that cross the ML boundary into the public contract; every other field on the public response (`estimated_cost_range`, `payback_period_months`, etc.) comes from `InterventionLibrary`, not from the ML output.

### 4.5 Fallback Behavior When ML Is Unavailable

- Trigger conditions: the model file is missing/corrupt at startup, the scoring function raises an exception, or it exceeds an internal timeout.
- On any trigger, `recommendation_engine.py` calls `rule_based_scorer.py` with the **identical input shape** (§4.1) and receives the **identical output shape** (§4.3), with `score_source` set to `"rule_based"`.
- This fallback is automatic and silent to the caller of `GET /assessments/:id/recommendations` — the HTTP response shape never changes, only the `score_source` value differs.
- The model is loaded once at backend startup, not per-request, so a startup failure is known immediately (and logged) rather than surfacing intermittently mid-demo.

---

## 5. What-If Simulator Contract

#### `POST /assessments/:id/simulate`

- **Purpose:** compute projected emissions/cost/payback for a candidate set of interventions without committing them to the roadmap.
- **Auth:** required.
- **Request body:**
```json
{ "selected_intervention_ids": ["INT-001", "INT-009"] }
```
- **Example request:**
```
POST /api/v1/assessments/9f1e.../simulate
Authorization: Bearer <jwt>
Content-Type: application/json

{ "selected_intervention_ids": ["INT-001", "INT-009"] }
```
- **Success response schema (200):**
```json
{ "success": true, "data": {
  "current_co2e": 1240.5,
  "projected_co2e": 720.3,
  "reduction_abs": 520.2,
  "reduction_pct": 0.42,
  "investment": 78000,
  "currency": "USD",
  "annual_savings": 15600,
  "payback_period_months": 30,
  "roi_pct": 20,
  "overlap_adjustments": [
    { "leak_point_ref": "diesel_generator", "applied_intervention_id": "INT-001", "note": "max-per-leak-point rule applied; other overlapping intervention on this leak point ignored for CO2 reduction, cost still counted" }
  ]
}}
```
- **Validation:** `selected_intervention_ids` must contain at least 1 item; every ID must correspond to a `Recommendation`/`InterventionLibrary` entry valid for this assessment (i.e., previously returned by `GET /assessments/:id/recommendations`).
- **Calculation rule (must match `BACKEND_IMPLEMENTATION.md` §6 exactly):**
  - `current_co2e` is read directly from `Assessment.total_co2e` — never recomputed here.
  - `projected_co2e = current_co2e − Σ(expected_CO2_reduction for non-overlapping selected interventions) − max(expected_CO2_reduction among overlapping interventions per leak point)`.
  - When 2+ selected interventions target the same `leak_point_ref`, only the **larger** CO₂-reduction estimate for that leak point is subtracted (the "take-the-max-per-leak-point" rule) — never summed.
  - `investment` and `annual_savings` are **additive** across all selected interventions regardless of leak-point overlap, since money spent on both is still spent.
  - The response is always labeled in the frontend as "Projected (estimated)" — this is an estimate derived from `InterventionLibrary` ranges, never a re-run of the deterministic Calculation Engine.
- **Errors:** `400 VALIDATION_ERROR` (empty selection or unknown intervention ID), `400 ASSESSMENT_NOT_CALCULATED` (no `total_co2e` yet), `404 NOT_FOUND`.
- **DB entities:** `Assessment` (read `total_co2e`), `Recommendation`, `InterventionLibrary` (read-only — this endpoint writes nothing; committing happens via `POST /assessments/:id/recommendations/:recId/apply`).

---

## 6. Data Types & Enums

### Industry
`plastic` | `textile` | `food_processing`

### Facility Size
`small` | `medium` | `large`

### ProcessInput Category
`energy` | `material` | `waste`

### Energy Type (subtype when `category = energy`)
`electricity` | `diesel` | `natural_gas`

### Material Type (subtype when `category = material`)
`virgin_plastic` | `recycled_plastic` | `virgin_textile_fiber` | `dye` | `packaging_material` | `raw_food_material` | `process_scrap`

### Waste Type (subtype when `category = waste`)
`plastic_waste` | `textile_waste` | `organic_waste` | `general_waste` | `wastewater`

### Waste Treatment
`landfill` | `recycling` | `incineration` | `energy_recovery` | `composting`

### Unit
`kwh` | `mwh` | `l` | `gallon` | `kg` | `lb` | `tonne` | `m3` (natural gas, where applicable)

### Intervention Category
`energy` | `materials` | `waste`
(Canonical library items referenced by ID, per `BACKEND_IMPLEMENTATION.md`/`ML_IMPLEMENTATION.md`: `INT-001` Solar + Grid Hybrid, `INT-002` Battery Storage, `INT-003` Energy Efficiency Improvement, `INT-004` Fuel Switching, `INT-005` Renewable Electricity Procurement, `INT-006` Virgin → Recycled Material, `INT-007` Material Reuse Program, `INT-008` Sustainable Material Substitution, `INT-009` Closed-Loop Recycling, `INT-010` Waste Segregation, `INT-011` Waste Recovery, `INT-012` Industrial Waste Reuse.)

### Implementation Difficulty
`low` | `medium` | `high`

### Severity (leak point)
`high` | `medium` | `low` — thresholds: `>=0.30` high, `0.10–0.30` medium, `<0.10` low.

### Priority (roadmap)
`high` | `medium` | `low`

### Roadmap Phase
`1` (Quick Wins) | `2` (Medium Term) | `3` (Long Term)

### Score Source
`ml` | `rule_based`

### Statuses

| Entity | Enum values |
|---|---|
| `Assessment.status` | `draft` \| `complete` |
| `Recommendation.status` | `suggested` \| `applied` \| `dismissed` |
| `AppliedIntervention.status` | `planned` \| `in_progress` \| `completed` |
| `Report.format` | `pdf` \| `csv` \| `html` (fallback) |
| `User.role` | `operator` \| `consultant` \| `regulator` |
| `EmissionFactor.scope` | `1` \| `2` \| `3` |

---

## 7. Frontend ↔ Backend Integration Flow

Full sequence for the core demo journey, with the exact endpoint called at each step:

```text
1.  POST /facilities
        → creates Facility

2.  POST /facilities/:id/assessments
        → creates Assessment (status: draft)

3.  POST /assessments/:id/inputs   (repeated per line, or batched)
        → creates ProcessInput rows (energy, materials, waste)

4.  POST /assessments/:id/calculate
        → runs deterministic Calculation Engine
        → sets ProcessInput.computed_co2e and Assessment.total_co2e
        → Assessment.status becomes complete

5.  GET /assessments/:id/summary
        → Overview Dashboard KPIs + Emission Analysis line items

6.  GET /assessments/:id/leak-points
        → Leak-Point Dashboard ranked list

7.  GET /assessments/:id/recommendations?leak_point=<ref>
        → Recommendation Dashboard (ML or rule-based, transparently)

8.  POST /assessments/:id/simulate
        → What-If Simulator projected results (repeatable on each toggle)

9.  POST /assessments/:id/recommendations/:recId/apply
        → commits selection; creates AppliedIntervention

10. GET /assessments/:id/roadmap
        → Carbon Reduction Action Roadmap (auto-derived from step 9)

11. GET /assessments/:id/export?format=pdf
        → Reports & Assessment History; also GET /assessments/:id/history for trend view
```

This sequence is identical to the journey defined in `IMPLEMENTATION_PLAN.md` §4 and the screen order in `FRONTEND_IMPLEMENTATION.md` §2, with step 4 (`/calculate`) made explicit as the trigger between intake and every downstream read.

---

## 8. Consistency Check

Verified against all five prior documents before finalizing this contract:

- **Endpoints** match `BACKEND_IMPLEMENTATION.md` §7 exactly for the 11 originally-listed routes; the additions here (`/auth/*`, `PATCH`/`DELETE` on inputs, `GET`/`PATCH`/`DELETE` on `/roadmap`, `/recommendations/:recId/dismiss`) fill gaps that `FRONTEND_IMPLEMENTATION.md` implied (e.g., D2's Delete Input button, D8's roadmap phase override, D6's Dismiss button) but that were not previously given their own endpoint rows — no existing route was renamed or removed.
- **Request/response field names** (`total_co2e`, `computed_co2e`, `leak_point_ref`, `pct_contribution`, `score`, `score_source`, `estimated_cost_range`, `payback_period_months`, `roadmap_phase`, `applied_intervention`) match the DB schema in `BACKEND_IMPLEMENTATION.md` §3 and the dashboard field lists in `FRONTEND_IMPLEMENTATION.md` §4 verbatim.
- **ML input/output shapes** (§4 of this document) match `ML_IMPLEMENTATION.md` §4, §6, §12, §16 exactly, including the fallback mechanism and the `score_source` field.
- **What-If overlap rule** (§5 of this document) matches `BACKEND_IMPLEMENTATION.md` §6 and `ML_IMPLEMENTATION.md`'s non-involvement in this calculation (it is a backend-only, deterministic-adjacent rule over `InterventionLibrary` estimates, never touching ML scores or `total_co2e`).
- **Enums** (§6 of this document) match `PROJECT_STRUCTURE.md`'s dataset schema references and `IMPLEMENTATION_PLAN.md` §8's three MVP industries, with subtype values chosen to cover the ABC Plastics demo dataset and the textile/food-processing examples named in the source planning PDFs.
- **Trust-tier separation** (`calculated` → `estimated` → `scored/ranked`) is preserved throughout: no endpoint in this contract allows a client to write `computed_co2e` or `total_co2e` directly; only `POST /assessments/:id/calculate` sets them, matching the non-negotiable rule stated in `PROJECT_STRUCTURE.md` §8 and `BACKEND_IMPLEMENTATION.md` §3.
- **No application code** is included anywhere in this document, per the original constraint.
