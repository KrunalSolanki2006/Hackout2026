import logging
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

logger = logging.getLogger("app.services.simulator")

async def run_what_if_simulation(
    db: AsyncIOMotorDatabase,
    assessment_id: str,
    selected_intervention_ids: List[str]
) -> Dict[str, Any]:
    """
    Implements the what-if simulation calculation with the max-per-leak-point overlap rule (§6).
    Reads current_co2e as an immutable input from the calculation engine.
    """
    # 1. Fetch Assessment
    assessment = await db.assessments.find_one({"_id": assessment_id})
    if not assessment and ObjectId.is_valid(assessment_id):
        assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})

    current_co2e = float(assessment.get("total_co2e", 0.0)) if assessment else 0.0

    if not selected_intervention_ids:
        return {
            "current_co2e": current_co2e,
            "projected_co2e": current_co2e,
            "reduction_abs": 0.0,
            "reduction_pct": 0.0,
            "investment": 0.0,
            "payback": 0,
            "roi": 0.0
        }

    # 2. Fetch Selected Recommendations / Interventions
    selected_recs = []
    for sel_id in selected_intervention_ids:
        # Search by recommendation _id or intervention_id
        rec = await db.recommendations.find_one({"_id": sel_id, "assessment_id": assessment_id})
        if not rec and ObjectId.is_valid(sel_id):
            rec = await db.recommendations.find_one({"_id": ObjectId(sel_id), "assessment_id": assessment_id})
        if not rec:
            rec = await db.recommendations.find_one({"intervention_id": sel_id, "assessment_id": assessment_id})
        
        if rec:
            selected_recs.append(rec)
        else:
            # Fallback lookup in intervention library directly
            int_doc = await db.intervention_library.find_one({"id": sel_id})
            if int_doc:
                selected_recs.append({
                    "intervention_id": sel_id,
                    "intervention": int_doc,
                    "estimated_cost_range": [int_doc.get("estimated_cost_min", 0), int_doc.get("estimated_cost_max", 0)],
                    "estimated_co2_reduction_range": [int_doc.get("estimated_co2_reduction_min", 0), int_doc.get("estimated_co2_reduction_max", 0)],
                    "payback_period_months": int_doc.get("payback_period_months", 24),
                    "applicable_leak_point": int_doc.get("applicable_leak_types", ["general"])[0] if int_doc.get("applicable_leak_types") else "general"
                })

    # 3. Apply Overlap Rule: Max CO2 Reduction per Leak Point
    leak_point_reduction_pcts = {}
    total_investment = 0.0
    weighted_payback_sum = 0.0
    roi_list = []

    for rec in selected_recs:
        intervention = rec.get("intervention", {})
        
        # Investment (midpoint of cost range)
        cost_range = rec.get("estimated_cost_range") or [
            intervention.get("estimated_cost_min", 0),
            intervention.get("estimated_cost_max", 0)
        ]
        cost_mid = (float(cost_range[0]) + float(cost_range[1])) / 2.0
        total_investment += cost_mid

        # Payback & ROI
        payback_m = int(rec.get("payback_period_months", intervention.get("payback_period_months", 24)))
        weighted_payback_sum += payback_m * cost_mid
        roi_val = float(intervention.get("roi_pct", 25.0))
        roi_list.append(roi_val)

        # CO2 Reduction range midpoint (%)
        co2_range = rec.get("estimated_co2_reduction_range") or [
            intervention.get("estimated_co2_reduction_min", 0),
            intervention.get("estimated_co2_reduction_max", 0)
        ]
        co2_pct_mid = (float(co2_range[0]) + float(co2_range[1])) / 2.0

        # Applicable leak point(s)
        applicable_leaks = intervention.get("applicable_leak_types", [])
        if not applicable_leaks:
            app_leak = rec.get("applicable_leak_point", "general")
            applicable_leaks = [app_leak]

        # Overlap rule: Take max reduction pct for each targeted leak point
        for leak_ref in applicable_leaks:
            leak_key = leak_ref.lower()
            current_max = leak_point_reduction_pcts.get(leak_key, 0.0)
            if co2_pct_mid > current_max:
                leak_point_reduction_pcts[leak_key] = co2_pct_mid

    # Aggregate total non-overlapping reduction percentage (capped at 90%)
    total_reduction_pct = min(90.0, sum(leak_point_reduction_pcts.values()))
    
    reduction_abs = round((current_co2e * (total_reduction_pct / 100.0)), 4)
    projected_co2e = round(max(0.0, current_co2e - reduction_abs), 4)

    average_payback = int(round(weighted_payback_sum / total_investment)) if total_investment > 0 else 0
    avg_roi = round(float(sum(roi_list) / len(roi_list)), 2) if roi_list else 0.0

    return {
        "current_co2e": round(current_co2e, 4),
        "projected_co2e": projected_co2e,
        "reduction_abs": reduction_abs,
        "reduction_pct": round(total_reduction_pct, 2),
        "investment": round(total_investment, 2),
        "payback": average_payback,
        "roi": avg_roi
    }
