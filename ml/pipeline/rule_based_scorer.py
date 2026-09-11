"""
Deterministic Rule-Based Recommendation Scorer.

Acts as:
1. The domain-grounded baseline recommendation scorer.
2. The guaranteed-working fallback whenever ML inference is unavailable.
3. The generator for synthetic ground-truth labels during ML training.

Strictly follows ML_IMPLEMENTATION.md §14 and §15.
"""

from typing import Dict, List, Any, Optional
from ml.data.intervention_library import Intervention, get_intervention_library

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
    # 18.0 tCO2e reduction scale represents the top tier in SME circular interventions
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
    # Normalizing 0.0 - 0.50 (0% to 50% contribution) into 0-100
    leak_pct = leak_contribution_pct if leak_contribution_pct <= 1.0 else (leak_contribution_pct / 100.0)
    urgency_score = min(100.0, max(10.0, leak_pct * 200.0))

    # Multi-factor weighted blend:
    # 35% CO2 impact, 25% Cost, 20% Ease of implementation, 20% Leak urgency
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
    Public rule-based recommendation scoring function.

    Contract:
    Returns List[Dict[str, Any]]:
    [
        {
            "intervention_id": "INT-001",
            "score": 91.0,
            "score_source": "rule_based",
            "explanation_flags": ["..."]
        }, ...
    ]
    """
    industry = str(facility_profile.get("industry", "plastic")).strip().lower()
    facility_size = str(facility_profile.get("facility_size", "medium")).strip().lower()
    budget = SIZE_BUDGETS.get(facility_size, SIZE_BUDGETS["medium"])

    library = get_intervention_library()

    # Pre-process leak points
    if not leak_points:
        return []

    results = []

    for lp in leak_points:
        leak_cat = str(lp.get("category", "energy")).strip().lower()
        leak_contrib = float(lp.get("contribution_pct", lp.get("leak_contribution", 0.25)))
        if leak_contrib > 1.0:
            leak_contrib /= 100.0

        # Candidate intervention list: either provided or filtered from library
        if candidate_interventions is not None and len(candidate_interventions) > 0:
            candidates = candidate_interventions
        else:
            candidates = library.filter_candidates(industry=industry, leak_category=leak_cat)

        for cand in candidates:
            # Handle both Intervention objects and dicts
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

            # Eligibility gate: check industry and leak type match
            ind_ok = any(industry in i.lower() or i.lower() in industry for i in app_ind)
            leak_ok = any(leak_cat in lt.lower() or lt.lower() in leak_cat for lt in app_leak)

            if not (ind_ok and leak_ok):
                continue  # Filter out non-matching candidates

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

    # Deduplicate by intervention_id keeping the highest score across leak points
    deduped: Dict[str, Dict[str, Any]] = {}
    for item in results:
        iid = item["intervention_id"]
        if iid not in deduped or item["score"] > deduped[iid]["score"]:
            deduped[iid] = item

    ranked = sorted(deduped.values(), key=lambda x: x["score"], reverse=True)
    return ranked
