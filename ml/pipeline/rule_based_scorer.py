import logging
from typing import List, Dict, Any

logger = logging.getLogger("ml.rule_based_scorer")

def score_interventions_rule_based(
    facility_industry: str,
    leak_points: List[Dict[str, Any]],
    interventions: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Deterministic rule-based scorer for circular interventions.
    Evaluates:
    - Industry fit (exact match = +35 pts)
    - Leak point match & contribution (up to +35 pts)
    - CO2 reduction potential (up to +15 pts)
    - Implementation difficulty & payback (up to +15 pts)
    Returns list of dicts with intervention, score (0-100), score_source="rule_based", explanation list, applicable_leak_point.
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
