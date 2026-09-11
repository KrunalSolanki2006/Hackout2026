import os
import json
import logging
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.services.leak_analysis import get_ranked_leak_points

logger = logging.getLogger("app.services.recommendation_engine")

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

def get_scorer_function():
    try:
        from ml.inference.ranker import score_interventions
        logger.info("Loaded ML ranker function successfully.")
        return score_interventions
    except Exception as e:
        logger.warning(f"ML ranker not available ({e}). Using rule-based scorer.")
        return score_interventions_rule_based

async def get_or_generate_recommendations(
    db: AsyncIOMotorDatabase,
    assessment_id: str,
    leak_point_filter: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Generates and stores circular intervention recommendations for an assessment.
    Calls ML ranker in-process if available; transparently uses rule-based fallback otherwise.
    """
    # 1. Fetch Assessment & Facility details
    assessment = await db.assessments.find_one({"_id": assessment_id})
    if not assessment and ObjectId.is_valid(assessment_id):
        assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})

    if not assessment:
        return []

    facility_id = assessment.get("facility_id")
    facility = await db.facilities.find_one({"_id": facility_id})
    if not facility and ObjectId.is_valid(facility_id):
        facility = await db.facilities.find_one({"_id": ObjectId(facility_id)})

    industry = facility.get("industry", "plastic") if facility else "plastic"

    # 2. Get ranked leak points
    leak_points = await get_ranked_leak_points(db, assessment_id)

    # 3. Load Interventions library
    cursor = db.intervention_library.find({})
    interventions = await cursor.to_list(length=100)

    if not interventions:
        # Fallback to static JSON file if DB collection is empty
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        possible_json_paths = [
            os.path.join(base_dir, "datasets", "intervention_library", "interventions_v1.json"),
            os.path.join(os.path.dirname(base_dir), "datasets", "intervention_library", "interventions_v1.json")
        ]
        for json_path in possible_json_paths:
            if os.path.exists(json_path):
                with open(json_path, "r") as f:
                    interventions = json.load(f)
                break

    # 4. Score interventions (ML or Rule-Based fallback)
    scorer = get_scorer_function()
    try:
        scored_results = scorer(industry, leak_points, interventions)
    except Exception as e:
        logger.error(f"Error during recommendation scoring: {e}. Falling back to rule-based scorer.")
        scored_results = score_interventions_rule_based(industry, leak_points, interventions)

    # 5. Persist recommendations into DB
    recommendations_out = []
    for item in scored_results:
        intervention_data = item["intervention"]
        int_id = str(intervention_data.get("id") or intervention_data.get("_id"))
        
        # Check if already exists in DB
        existing = await db.recommendations.find_one({
            "assessment_id": assessment_id,
            "intervention_id": int_id
        })

        rec_doc = {
            "assessment_id": assessment_id,
            "intervention_id": int_id,
            "intervention": {
                "id": int_id,
                "name": intervention_data.get("name"),
                "category": intervention_data.get("category"),
                "description": intervention_data.get("description", ""),
                "supported_industries": intervention_data.get("supported_industries", []),
                "applicable_leak_types": intervention_data.get("applicable_leak_types", []),
                "estimated_cost_min": intervention_data.get("estimated_cost_min", 0.0),
                "estimated_cost_max": intervention_data.get("estimated_cost_max", 0.0),
                "estimated_co2_reduction_min": intervention_data.get("estimated_co2_reduction_min", 0.0),
                "estimated_co2_reduction_max": intervention_data.get("estimated_co2_reduction_max", 0.0),
                "implementation_difficulty": intervention_data.get("implementation_difficulty", "medium"),
                "payback_period_months": intervention_data.get("payback_period_months", 24),
                "roi_pct": intervention_data.get("roi_pct", 0.0),
                "explanation": intervention_data.get("explanation", "")
            },
            "score": item["score"],
            "score_source": item.get("score_source", "rule_based"),
            "estimated_cost_range": item["estimated_cost_range"],
            "estimated_co2_reduction_range": item["estimated_co2_reduction_range"],
            "payback_period_months": item["payback_period_months"],
            "explanation": item["explanation"],
            "applicable_leak_point": item["applicable_leak_point"],
            "status": existing.get("status", "suggested") if existing else "suggested"
        }

        if existing:
            rec_id = str(existing["_id"])
            await db.recommendations.update_one({"_id": existing["_id"]}, {"$set": rec_doc})
        else:
            insert_res = await db.recommendations.insert_one(rec_doc)
            rec_id = str(insert_res.inserted_id)

        rec_doc["id"] = rec_id

        # Apply leak_point filter if passed
        if leak_point_filter:
            target_lp = item["applicable_leak_point"].lower()
            filter_lp = leak_point_filter.lower()
            if filter_lp not in target_lp and target_lp not in filter_lp:
                continue

        recommendations_out.append(rec_doc)

    return recommendations_out
