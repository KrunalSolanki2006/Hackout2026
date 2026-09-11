# IMPLEMENTATION_PLAN.md
## Industrial Emission Leak-Point Detector & Circular Alternative Recommender
### Master Implementation Roadmap — HackOut 2026

---

## 1. Product Overview

A web platform for SME plant operators. A user enters facility operational data (electricity, diesel/fuel, materials, waste). A deterministic engine converts this into CO₂e emissions per activity line — the trusted, auditable source of truth. The system ranks emission sources to identify "leak points," then a lightweight ML ranking model (with a guaranteed rule-based fallback) matches each leak point to costed circular-economy interventions. A what-if simulator projects the impact of adopting interventions, and the platform exports a shareable report.

**One line:** enter your operations → see exactly where your emissions come from → get ranked, costed, circular fixes → simulate the impact → export proof.

## 2. Problem Definition

SMEs generate emissions across many process stages (energy, materials, waste) but have no structured way to see the breakdown, and even if they could see it, don't know which circular-economy interventions would help, by how much, or at what cost. Large enterprises have ESG teams and expensive auditing software; SMEs don't, despite representing a large share of industrial emissions and facing tightening disclosure/tax regulation.

**Root causes → solution mapping:**

| Problem | Root Cause | Solution | Impact |
|---|---|---|---|
| Don't know where emissions come from | No structured process-to-emission mapping | Guided intake + deterministic emission-factor engine | Ranked visibility within minutes |
| Don't act on emissions | Generic, uncosted advice | Rule-based + ML-assisted recommender with cost/CO₂ estimates | Concrete, prioritized action list |
| Compliance risk | No audit trail | Structured, versioned reports | Regulator/consultant-ready documentation |
| Advice not trusted | Opaque "AI said so" outputs | Deterministic calc + explainable rationale per recommendation | Builds trust, avoids black-box skepticism |

## 3. Solution

A diagnostic-to-prescription pipeline: Facility profile → guided data intake → deterministic CO₂e calculation → leak-point ranking → ML/rule-based circular-intervention recommendation (cost, CO₂ reduction, difficulty, explanation) → what-if simulation → phased action roadmap → exportable report/history.

**Key architectural rule:** the CO₂e math is never AI-generated — it is `activity_quantity × emission_factor`, sourced from a static, versioned public dataset. AI/ML is used **only** to rank candidate circular interventions against a facility's leak-point profile — a genuine ranking-under-ambiguity problem, unlike the emissions arithmetic.

## 4. Complete User Journey

```
Login / Create Account
   → Facility Setup (industry, size, region, production volume)
   → Guided Intake Wizard: Energy → Materials → Waste → Review
   → Submit → Deterministic CO₂ Engine calculates per-line CO₂e
   → Overview Dashboard (totals, KPIs, category split)
   → Leak-Point Dashboard (ranked contributors)
       → drill into a leak point
   → Recommendation Dashboard (ranked interventions, explained)
   → What-If Simulator (select interventions → projected footprint)
   → Carbon Reduction Action Roadmap (phased plan)
   → Reports & Assessment History (export / compare over time)
```

**Secondary loop (returning user):** open a saved assessment, update one input, resubmit → system shows a before/after delta against the prior assessment via `AssessmentHistory` — a strong "impact" demo beat.

**Secondary persona (Consultant):** manages multiple facility profiles, switches between clients, compares footprints side-by-side (should-have, not MVP-blocking).

## 5. Functional Requirements

1. Users can create and edit a facility profile (industry, size, region, production volume).
2. Users can enter energy, material, and waste activity data through a guided, validated wizard.
3. The system calculates CO₂e per input line using a static, sourced emission-factor dataset.
4. The system aggregates and ranks emission sources into leak points.
5. The system generates ranked, explained circular-intervention recommendations per leak point.
6. The system simulates the projected footprint, cost, and payback of selected interventions, avoiding double-counting.
7. The system produces a phased carbon-reduction roadmap from applied/suggested interventions.
8. The system persists assessments and supports history/comparison and PDF/CSV export.

## 6. Non-Functional Requirements

- **Auditability:** every calculated CO₂e figure must be traceable to an activity quantity and a sourced emission factor.
- **Explainability:** every recommendation score ships with a plain-language rationale.
- **Reliability during judging:** no dependency on live third-party APIs for the emission-calculation critical path; datasets are bundled statically.
- **Graceful degradation:** if the ML ranker is unavailable, the system transparently falls back to a rule-based scorer with an identical output contract.
- **Responsiveness:** usable on desktop, tablet, and mobile (dashboards stack; intake wizard is single-column by default).
- **Simplicity of infra:** single backend service, relational database, no microservices/Kubernetes/message queues — appropriate to per-assessment, not high-throughput, usage.

## 7. MVP Scope

### MUST HAVE
- Facility Setup + Guided Intake wizard (Energy / Materials / Waste)
- Deterministic CO₂ calculation engine (static emission-factor dataset)
- Overview Dashboard + Leak-Point Dashboard
- Rule-based recommendation scorer (the guaranteed-working recommendation path)
- Recommendation Dashboard (score, cost, CO₂ reduction, explanation)
- What-If Simulator (single/multi-intervention toggle, projected footprint)
- PostgreSQL schema + core REST API (facilities, assessments, inputs, summary, recommendations, simulate)
- Basic auth + facility ownership

### SHOULD HAVE
- ML ranking model layered on top of the rule-based scorer (identical output shape, swap-in)
- Emission Analysis Dashboard (detailed line-item table, search/sort/filter/export)
- Carbon Reduction Action Roadmap (phase 1/2/3 grouping)
- Reports & Assessment History (save, compare, PDF/CSV export)
- Explanation checklist UI

### STRETCH (COULD HAVE)
- Multi-assessment comparison charts (current vs. past)
- CSV upload for bulk process-input entry
- Industry benchmark comparison
- Multi-facility/consultant comparison view
- Additional supported industries beyond the MVP three

### DO NOT BUILD
- Chatbot / conversational interface
- Autonomous AI agent that takes actions
- Blockchain / carbon-credit tokenization
- Maps (no genuine use case)
- A separate ML model per industry
- Enterprise SSO/RBAC, microservices, message queues, Kubernetes
- Real-time IoT sensor ingestion
- Live/paid third-party emission-factor APIs

## 8. Industry Scope

**Recommended MVP industries: Plastic Manufacturing, Textile Manufacturing, Food Processing.**

Rationale: all three have (a) well-documented public emission factors for their dominant inputs (electricity, diesel, natural gas, common raw materials), (b) simple, well-understood waste streams, and (c) an intuitive, judge-legible demo narrative (e.g., plastics' "virgin plastic → recycled feedstock" story). Each industry needs its **own** entries in the emission-factor and intervention datasets (e.g., resin pellets/landfill for plastics; yarn/dye/wastewater for textiles; packaging/organic waste for food processing) rather than a single generic material list reused across all three.

## 9. Data Strategy

- **Emission factors:** bundled static JSON/CSV, sourced from a public, citable factor dataset, with `source`, `scope`, and `version` tracked per record. Never live-fetched during judging.
- **Intervention library:** team-curated domain knowledge (20–40 entries), cost/CO₂-reduction ranges seeded from public sustainability/circular-economy references.
- **Demo company data (ABC Plastics):** fictional, clearly labeled as such at every point it appears — never presented as a real company.
- **ML training labels:** synthetic, generated by combining the rule-based scoring formula with controlled random variation. Explicitly and repeatedly labeled as synthetic in the UI/docs, never presented as real adoption outcomes.

## 10. Emission Calculation Strategy

`CO2e = quantity × emission_factor`, looked up by `(category, subtype, unit)`. Unit mismatches are resolved via a small conversion table (litres↔gallons, kg↔lb, kWh↔MWh); anything outside that table is rejected at intake rather than guessed. Missing factors are flagged as "unsupported input," excluded from the total, and surfaced visibly — never silently defaulted to zero or invented. See `BACKEND_IMPLEMENTATION.md` for full detail.

## 11. Leak-Point Strategy

After per-line CO₂e is computed, aggregate by category/process/input/material/fuel/waste type, then rank by contribution %. Severity badges (High/Medium/Low) are threshold-based on contribution percentage. This ranked list drives both the dashboard and the filter context for recommendations.

## 12. Recommendation Strategy

A rule-based scorer (weighted formula on cost, CO₂ impact, implementation ease, industry fit) ships first and is fully sufficient for a complete demo on its own. An ML ranking model (gradient-boosted regression, §`ML_IMPLEMENTATION.md`) is layered on top as a should-have refinement, sharing an identical output contract so the frontend never needs to change. If the ML model is unavailable or errors, the system falls back to the rule-based scorer automatically and transparently (`score_source` field communicates which path served the response).

## 13. What-If Strategy

`Projected CO2e = Current CO2e − Σ(expected_CO2_reduction for selected, non-overlapping interventions)`. When two or more selected interventions target the same leak point, the simulator takes the **larger** of the two reduction estimates for that leak point rather than summing them (avoids implausible >100% reductions). Costs remain additive regardless of overlap, since money spent on both is still spent. See `BACKEND_IMPLEMENTATION.md` §What-If Calculation for full logic.

## 14. Roadmap Strategy

Applied/suggested interventions are auto-bucketed into three phases based on `implementation_difficulty` + `payback_period`:

```
PHASE 1 — Quick Wins        (low difficulty, fast payback)
PHASE 2 — Medium Term       (moderate difficulty/payback)
PHASE 3 — Long Term         (high difficulty, longer payback)
```

Each roadmap item carries priority, cost, expected reduction, payback, difficulty, and status (Suggested / In Progress / Applied). Manual override to move an item between phases is supported.

## 15. Report Strategy

Reports export as PDF (preferred) or CSV, with a styled-HTML fallback if the PDF library is unstable close to demo time. Every exported figure is labeled by its trust tier (calculated / estimated / scored) so a regulator or consultant can distinguish authoritative numbers from projections.

## 16. 3-Day Development Plan

**Day 1 — Foundations (parallel tracks)**
- All: agree on the API contract, data shapes, and the ABC Plastics demo dataset.
- Frontend: scaffold app; build Facility Setup + Intake Wizard against a mocked API.
- Backend: project scaffold, DB schema + migrations, auth, Facility/Assessment CRUD.
- ML/Data: source and structure the emission-factor dataset (starting with plastics), draft 10–15 Intervention Library entries.
- **Checkpoint (end of day):** Facility/Assessment endpoints callable by frontend for real.

**Day 2 — Core Engine + Recommendations**
- Backend: implement Calculation Engine using the real factor dataset; implement Leak Analysis; wire `/summary` and `/leak-points`.
- ML/Data: finalize rule-based scorer; build ML training dataset (curated + synthetic); train first model version; implement `/recommendations` logic with ML → rule-based fallback.
- Frontend: build Overview, Emission Analysis, and Leak-Point dashboards against real backend data.
- **Checkpoint (end of day):** full pipeline works end-to-end for the ABC Plastics demo — data in, ranked recommendations out.

**Day 3 — Simulator, Roadmap, Polish, Demo Prep**
- Backend: implement `/simulate` (overlap logic), `/apply`, `/history`, `/export`.
- Frontend: build Recommendation Dashboard, What-If Simulator, Action Roadmap, Reports/History; responsive pass; loading/empty/error/success states pass.
- ML/Data: evaluate the model, tune if time allows, finalize explanation text generation.
- Afternoon: full-team integration testing on the ABC Plastics journey, end-to-end, at least twice.
- Evening: feature freeze, demo rehearsal, confirm the rule-based fallback triggers cleanly if the ML endpoint is flaky on stage.

## 17. Team Responsibilities

| Member | Owns | Depends on | Delivers to team |
|---|---|---|---|
| **1 — Frontend** | Facility Setup, Intake Wizard, all 9 dashboards, charts, responsive design | API contract (§J of `BACKEND_IMPLEMENTATION.md`) | Reusable component library |
| **2 — Backend** | FastAPI project, auth, CRUD, Calculation Engine, Leak Analysis, DB schema/migrations | Emission-factor dataset structure/content from Dev 3 (can stub 5–10 factors first) | Working API deployed early, reachable before recommendations are ML-complete |
| **3 — ML/Data** | Emission-factor sourcing/curation, Intervention Library content, rule-based scorer, ML dataset (incl. synthetic labels), training/evaluation, Recommendation Engine ML wiring | ProcessInput/leak-point data shape from Dev 2 (agreed Day 1) | `/recommendations` logic behind a fixed function signature Dev 2's API calls |

## 18. Integration Checkpoints

1. **Day 1, hour 1:** all three agree on the API contract and JSON shapes for `ProcessInput` and `Recommendation` — the single most important shared artifact.
2. **Day 1 end:** Backend's Facility/Assessment endpoints are callable by frontend for real (not mocked).
3. **Day 2 end:** full pipeline works end-to-end on ABC Plastics demo data.
4. **Day 3 afternoon:** two full end-to-end run-throughs of the complete demo journey with the whole team present.

## 19. Testing Strategy

- **Frontend:** forms/validation, responsive layout, all four data-fetch states (loading/empty/error/success), charts, simulator toggle behavior.
- **Backend:** every API endpoint, input validation, calculation correctness (spot-check against hand-computed values), database constraints, auth/ownership scoping, error handling.
- **ML:** dataset validation, model load-at-startup, prediction shape, ranking sanity vs. rule-based baseline, fallback trigger, edge cases (unseen industry, missing feature).
- **Integration:** the complete flow — Create Facility → Enter Activity Data → Calculate CO₂ → View Leak Points → Get Recommendations → Run Simulation → Create Roadmap → Generate Report — run at least twice before demo freeze.

## 20. Demo Strategy

3–5 minute narrative using the fictional ABC Plastics facility: problem framing → introduce ABC Plastics (labeled fictional) → intake summary → Calculate → Overview Dashboard → Leak-Point Dashboard ("43% from diesel generator") → Recommendation Dashboard (top card, explanation read aloud) → What-If Simulator (toggle, chart animates live, concrete $ and t CO₂e numbers) → Export/Report screen → one closing line on the deterministic-vs-ML architecture split, signaling engineering maturity to judges.

## 21. Technical Risks & Fallback Plans

| Risk | Impact | Fallback |
|---|---|---|
| Emission-factor dataset gaps for some subtypes | Incomplete totals, "unsupported input" warnings | Scope demo dataset tightly to ABC Plastics' actual input list |
| ML model underperforms or fails to train in time | Recommendation quality suffers | Rule-based scorer is built first and is fully demo-sufficient alone |
| Synthetic training data looks arbitrary under scrutiny | Credibility risk if misrepresented | Be proactively transparent that labels are synthetic |
| PDF export library friction | Report screen incomplete | Styled HTML report fallback, same content |
| Multi-intervention double-counting | Implausible >100% reduction shown live | Overlap rule (max-per-leak-point) implemented and tested before demo day |
| Backend/ML integration friction | Recommendation endpoint slow/broken near demo | Load model once at startup, not per-request; test on Day 2 |
| Team blocking on API contract changes | Wasted rework | Freeze the contract end of Day 1; only additive changes after |

## 22. Definition of Done (MVP)

- A user can create a facility, complete the guided intake, and see calculated CO₂e with a full audit trail (input → factor → source → CO₂e).
- The Leak-Point Dashboard correctly ranks contributors by percentage.
- The Recommendation Dashboard returns ranked, explained interventions for at least the plastics industry, via the rule-based scorer at minimum.
- The What-If Simulator produces a projected footprint with correct overlap handling and does not double-count.
- An assessment can be saved, reloaded, and exported (PDF or HTML fallback).
- The complete ABC Plastics demo journey runs end-to-end without manual data patching, at least twice, before the freeze.
