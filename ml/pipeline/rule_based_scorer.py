"""
Deterministic Rule-Based Recommendation Scorer.

Acts as:
1. The domain-grounded baseline recommendation scorer.
2. The guaranteed-working fallback whenever ML inference is unavailable.
3. The generator for synthetic ground-truth labels during ML training.

Strictly follows ML_IMPLEMENTATION.md §14 and §15, and provides compatibility
for both the ML API contract (score_candidates) and the backend router contract
(score_interventions_rule_based).
"""

import logging
from typing import Dict, List, Any, Optional
from ml.data.intervention_library import Intervention, get_intervention_library

logger = logging.getLogger(__name__)

# Facility size reference budgets for SME affordability calculation
SIZE_BUDGETS: Dict[str, float] = {
    "small": 35000.0,
    "medium": 120000.0,
    "large": 450000.0,
}

DIFFICULTY_SCORES: Dict[str, float] = {
    "low": 95.0,
    "medium": 70.0,
    "high": 40.0,
}


def compute_explanation_flags(
    leak_contribution_pct: float,
    intervention_cost: float,
    budget: float,
    expected_co2_reduction: float,
    implementation_difficulty: str,
    industry_fit: bool,
    payback_years: Optional[float] = None,
) -> List[str]:
    """
    Generates deterministic explanation flags based on feature thresholds.
    Ensures explainability without hallucinations.
    """
    flags = []

    # Contribution threshold
    if leak_contribution_pct >= 0.30:
        flags.append("High emission contribution")
    elif leak_contribution_pct >= 0.15:
        flags.append("Moderate emission contribution")

    # Industry fit
    if industry_fit:
        flags.append("Strong industry fit")

    # CO2 reduction potential (indicative scale 0-20)
    if expected_co2_reduction >= 10.0:
        flags.append("High CO2 reduction potential")
    elif expected_co2_reduction >= 5.0:
        flags.append("Moderate CO2 reduction potential")

    # Cost / Investment threshold
    if intervention_cost <= budget * 0.5:
        flags.append("Low capital expenditure")
    elif intervention_cost <= budget:
        flags.append("Acceptable investment")
    else:
        flags.append("Requires capital budget approval")

    # Implementation complexity
    diff = implementation_difficulty.strip().lower()
    if diff == "low":
        flags.append("Low implementation complexity")
    elif diff == "high":
        flags.append("Higher implementation difficulty")

    # Payback
    if payback_years is not None and payback_years <= 1.5:
        flags.append("Fast payback (<1.5 yrs)")

    return flags


def calculate_rule_score(
    facility_size: str,
    leak_contribution_pct: float,
    intervention_cost: float,
    expected_co2_reduction: float,
    implementation_difficulty: str,
    industry_fit: bool = True,
) -> float:
    """
    Calculates a continuous suitability score (0-100) using multi-factor normalized weighting.
    """
    # 1. CO2 reduction score (0 - 100)
    co2_score = min(100.0, (max(0.0, expected_co2_reduction) / 18.0) * 100.0)

    # 2. Cost score relative to facility size affordability
    size_clean = facility_size.strip().lower()
    budget = SIZE_BUDGETS.get(size_clean, SIZE_BUDGETS["medium"])
    cost_ratio = max(0.0, intervention_cost) / budget
    if cost_ratio <= 0.2:
        cost_score = 100.0
    elif cost_ratio <= 1.0:
        cost_score = 100.0 - 50.0 * cost_ratio
    elif cost_ratio <= 1.5:
        cost_score = 50.0 - 40.0 * (cost_ratio - 1.0)
    else:
        cost_score = max(10.0, 30.0 - 10.0 * min(3.0, cost_ratio))

    # 3. Difficulty score
    diff_clean = implementation_difficulty.strip().lower()
    diff_score = DIFFICULTY_SCORES.get(diff_clean, 65.0)

    # 4. Leak contribution urgency score
    leak_pct = leak_contribution_pct if leak_contribution_pct <= 1.0 else (leak_contribution_pct / 100.0)
    urgency_score = min(100.0, max(10.0, leak_pct * 200.0))

    # Multi-factor weighted blend:
    raw_score = (
        0.35 * co2_score
        + 0.25 * cost_score
        + 0.20 * diff_score
        + 0.20 * urgency_score
    )

    if not industry_fit:
        raw_score *= 0.3  # penalized heavily if explicitly not a fit

    return round(float(min(99.0, max(1.0, raw_score))), 1)


def score_candidates(
    facility_profile: Dict[str, Any],
    leak_points: List[Dict[str, Any]],
    candidate_interventions: Optional[List[Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Public rule-based recommendation scoring function matching ML_IMPLEMENTATION.md.
    """
    industry = str(facility_profile.get("industry", "plastic")).strip().lower()
    facility_size = str(facility_profile.get("facility_size", "medium")).strip().lower()
    budget = SIZE_BUDGETS.get(facility_size, SIZE_BUDGETS["medium"])

    library = get_intervention_library()

    if not leak_points:
        return []

    results = []

    for lp in leak_points:
        leak_cat = str(lp.get("category", "energy")).strip().lower()
        leak_contrib = float(lp.get("contribution_pct", lp.get("leak_contribution", 0.25)))
        if leak_contrib > 1.0:
            leak_contrib /= 100.0

        if candidate_interventions is not None and len(candidate_interventions) > 0:
            candidates = candidate_interventions
        else:
            candidates = library.filter_candidates(industry=industry, leak_category=leak_cat)

        for cand in candidates:
            if isinstance(cand, dict):
                int_id = cand["intervention_id"]
                name = cand.get("name", "")
                cat = cand.get("category", leak_cat)
                cost = float(cand.get("estimated_cost", 20000.0))
                reduction = float(cand.get("expected_co2_reduction", 8.0))
                difficulty = str(cand.get("implementation_difficulty", "medium")).lower()
                industry_fit = bool(cand.get("industry_fit", True))
                payback = float(cand.get("payback_period_years", 2.0))
                app_ind = cand.get("applicable_industries", [industry])
                app_leak = cand.get("applicable_leak_types", [leak_cat])
            else:
                int_id = cand.intervention_id
                name = cand.name
                cat = cand.category
                cost = cand.estimated_cost
                reduction = cand.expected_co2_reduction
                difficulty = cand.implementation_difficulty
                industry_fit = cand.industry_fit
                payback = cand.payback_period_years
                app_ind = cand.applicable_industries
                app_leak = cand.applicable_leak_types

            ind_ok = any(industry in i.lower() or i.lower() in industry for i in app_ind)
            leak_ok = any(leak_cat in lt.lower() or lt.lower() in leak_cat for lt in app_leak)

            if not (ind_ok and leak_ok):
                continue

            score_val = calculate_rule_score(
                facility_size=facility_size,
                leak_contribution_pct=leak_contrib,
                intervention_cost=cost,
                expected_co2_reduction=reduction,
                implementation_difficulty=difficulty,
                industry_fit=industry_fit,
            )

            flags = compute_explanation_flags(
                leak_contribution_pct=leak_contrib,
                intervention_cost=cost,
                budget=budget,
                expected_co2_reduction=reduction,
                implementation_difficulty=difficulty,
                industry_fit=industry_fit,
                payback_years=payback,
            )

            results.append({
                "intervention_id": int_id,
                "name": name,
                "category": cat,
                "target_leak_category": leak_cat,
                "score": score_val,
                "score_source": "rule_based",
                "explanation_flags": flags,
            })

    deduped: Dict[str, Dict[str, Any]] = {}
    for item in results:
        iid = item["intervention_id"]
        if iid not in deduped or item["score"] > deduped[iid]["score"]:
            deduped[iid] = item

    ranked = sorted(deduped.values(), key=lambda x: x["score"], reverse=True)
    return ranked


def score_interventions_rule_based(
    facility_industry: str,
    leak_points: List[Dict[str, Any]],
    interventions: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Backend-compatible rule-based scorer for recommendation_engine.py.
    """
    leak_map = {}
    for lp in leak_points:
        ref = lp.get("subtype") or lp.get("name") or lp.get("leak_point_ref")
        pct = float(lp.get("contribution_pct", 0.0) or lp.get("pct", 0.0))
        if ref:
            leak_map[ref.lower()] = pct

    results = []

    for intervention in interventions:
        score = 0.0
        explanations = []

        supported_ind = [ind.lower() for ind in intervention.get("supported_industries", [])]
        if facility_industry.lower() in supported_ind or "all" in supported_ind:
            score += 35.0
            explanations.append(f"Strong industry fit for {facility_industry.capitalize()} manufacturing")
        else:
            score += 10.0

        applicable_leaks = intervention.get("applicable_leak_types", [])
        matched_leak_ref = None
        max_leak_pct = 0.0

        for leak_ref in applicable_leaks:
            leak_key = leak_ref.lower()
            if leak_key in leak_map:
                leak_pct = leak_map[leak_key]
                if leak_pct > max_leak_pct:
                    max_leak_pct = leak_pct
                    matched_leak_ref = leak_ref

        if max_leak_pct > 0:
            leak_score = min(35.0, (max_leak_pct / 100.0) * 45.0)
            score += leak_score
            if max_leak_pct >= 25.0:
                explanations.append(f"High emission contribution from targeted leak point ({max_leak_pct:.1f}%)")
            else:
                explanations.append(f"Directly targets identified leak point ({matched_leak_ref})")
        else:
            matched_leak_ref = applicable_leaks[0] if applicable_leaks else "general"

        co2_max = float(intervention.get("estimated_co2_reduction_max", 15.0))
        co2_score = min(15.0, (co2_max / 30.0) * 15.0)
        score += co2_score
        if co2_max >= 18.0:
            explanations.append(f"High CO2 reduction potential (up to {co2_max:.0f}%)")

        diff = str(intervention.get("implementation_difficulty", "medium")).lower()
        if diff == "low":
            score += 15.0
            explanations.append("Low implementation difficulty and fast deployment")
        elif diff == "medium":
            score += 10.0
            explanations.append("Moderate payback period with reasonable investment")
        else:
            score += 5.0

        final_score = int(round(min(100.0, max(10.0, score))))

        results.append({
            "intervention": intervention,
            "score": final_score,
            "score_source": "rule_based",
            "estimated_cost_range": [
                intervention.get("estimated_cost_min", 0),
                intervention.get("estimated_cost_max", 0)
            ],
            "estimated_co2_reduction_range": [
                intervention.get("estimated_co2_reduction_min", 0.0),
                intervention.get("estimated_co2_reduction_max", 0.0)
            ],
            "payback_period_months": intervention.get("payback_period_months", 24),
            "explanation": explanations if explanations else ["Applicable circular economy intervention"],
            "applicable_leak_point": matched_leak_ref or "general"
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results
