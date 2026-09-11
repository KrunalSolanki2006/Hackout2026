from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.core.database import get_database
from app.core.auth import get_current_user
from app.schemas.schemas import ApplyRecommendationRequest, AppliedInterventionResponse, RoadmapResponse, RoadmapPhaseResponse, RoadmapItem

router = APIRouter(prefix="/assessments", tags=["Action Roadmap"])

def determine_roadmap_phase(difficulty: str, payback_months: int) -> int:
    diff = str(difficulty).lower().strip()
    if diff == "low" and payback_months <= 18:
        return 1  # Quick Wins
    elif diff == "high" or payback_months > 30:
        return 3  # Long Term
    return 2  # Medium Term

@router.post("/{assessment_id}/recommendations/{recommendation_id}/apply", response_model=AppliedInterventionResponse, status_code=201)
async def apply_recommendation(
    assessment_id: str,
    recommendation_id: str,
    body: ApplyRecommendationRequest = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    # Verify assessment
    ass_query = {"owner_user_id": current_user["id"]}
    if ObjectId.is_valid(assessment_id):
        ass_query["_id"] = ObjectId(assessment_id)
    else:
        ass_query["_id"] = assessment_id

    assessment = await db.assessments.find_one(ass_query)
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "not_found", "message": "Assessment not found or not owned by user"}
        )

    ass_id_str = str(assessment["_id"])

    # Fetch recommendation
    rec = await db.recommendations.find_one({"assessment_id": ass_id_str, "intervention_id": recommendation_id})
    if not rec and ObjectId.is_valid(recommendation_id):
        rec = await db.recommendations.find_one({"_id": ObjectId(recommendation_id)})

    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "not_found", "message": "Recommendation not found for this assessment"}
        )

    rec_id_str = str(rec["_id"])
    intervention_data = rec.get("intervention", {})
    difficulty = intervention_data.get("implementation_difficulty", "medium")
    payback_m = rec.get("payback_period_months", intervention_data.get("payback_period_months", 24))

    # Phase calculation
    passed_phase = body.roadmap_phase if body else None
    phase = passed_phase if passed_phase in [1, 2, 3] else determine_roadmap_phase(difficulty, payback_m)

    # Update recommendation status
    await db.recommendations.update_one({"_id": rec["_id"]}, {"$set": {"status": "applied"}})

    # Check existing applied intervention
    existing = await db.applied_interventions.find_one({"assessment_id": ass_id_str, "recommendation_id": rec_id_str})
    if existing:
        await db.applied_interventions.update_one(
            {"_id": existing["_id"]},
            {"$set": {"roadmap_phase": phase, "status": "in_progress", "applied_at": datetime.utcnow()}}
        )
        app_id = str(existing["_id"])
    else:
        app_doc = {
            "assessment_id": ass_id_str,
            "recommendation_id": rec_id_str,
            "applied_at": datetime.utcnow(),
            "roadmap_phase": phase,
            "status": "planned"
        }
        res = await db.applied_interventions.insert_one(app_doc)
        app_id = str(res.inserted_id)

    # Record history snapshot for trends
    history_doc = {
        "facility_id": assessment.get("facility_id"),
        "assessment_id": ass_id_str,
        "total_co2e_snapshot": float(assessment.get("total_co2e", 0.0)),
        "recorded_at": datetime.utcnow()
    }
    await db.assessment_history.insert_one(history_doc)

    return AppliedInterventionResponse(
        id=app_id,
        assessment_id=ass_id_str,
        recommendation_id=rec_id_str,
        applied_at=datetime.utcnow(),
        roadmap_phase=phase,
        status="planned"
    )

@router.get("/{assessment_id}/roadmap", response_model=RoadmapResponse)
async def get_roadmap(
    assessment_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    ass_query = {"owner_user_id": current_user["id"]}
    if ObjectId.is_valid(assessment_id):
        ass_query["_id"] = ObjectId(assessment_id)
    else:
        ass_query["_id"] = assessment_id

    assessment = await db.assessments.find_one(ass_query)
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "not_found", "message": "Assessment not found or not owned by user"}
        )

    ass_id_str = str(assessment["_id"])

    # Fetch recommendations
    cursor = db.recommendations.find({"assessment_id": ass_id_str})
    recs = await cursor.to_list(length=100)

    # Fetch applied overrides if any
    cursor_app = db.applied_interventions.find({"assessment_id": ass_id_str})
    applied_list = await cursor_app.to_list(length=100)
    applied_map = {app["recommendation_id"]: app for app in applied_list}

    phase1_items = []
    phase2_items = []
    phase3_items = []

    for r in recs:
        r_id = str(r["_id"])
        intv = r.get("intervention", {})
        diff = intv.get("implementation_difficulty", "medium")
        payback_m = r.get("payback_period_months", 24)

        if r_id in applied_map:
            phase = applied_map[r_id].get("roadmap_phase", determine_roadmap_phase(diff, payback_m))
            status_val = applied_map[r_id].get("status", "planned")
        else:
            phase = determine_roadmap_phase(diff, payback_m)
            status_val = r.get("status", "suggested")

        item = RoadmapItem(
            id=r_id,
            recommendation_id=r_id,
            intervention_name=intv.get("name", "Circular Intervention"),
            category=intv.get("category", "energy"),
            score=r.get("score", 80),
            estimated_cost_range=r.get("estimated_cost_range", [10000, 20000]),
            estimated_co2_reduction_range=r.get("estimated_co2_reduction_range", [10, 20]),
            payback_period_months=payback_m,
            applicable_leak_point=r.get("applicable_leak_point", "general"),
            roadmap_phase=phase,
            status=status_val
        )

        if phase == 1:
            phase1_items.append(item)
        elif phase == 2:
            phase2_items.append(item)
        else:
            phase3_items.append(item)

    return RoadmapResponse(phases=[
        RoadmapPhaseResponse(phase=1, phase_name="Phase 1 — Quick Wins (Low Difficulty & Fast Payback)", interventions=phase1_items),
        RoadmapPhaseResponse(phase=2, phase_name="Phase 2 — Medium Term (Balanced ROI & Capital)", interventions=phase2_items),
        RoadmapPhaseResponse(phase=3, phase_name="Phase 3 — Long Term (High Structural Transformation)", interventions=phase3_items)
    ])
