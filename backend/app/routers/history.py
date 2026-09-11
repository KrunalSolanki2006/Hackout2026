from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.core.database import get_database
from app.core.auth import get_current_user
from app.schemas.schemas import AssessmentHistoryListResponse, AssessmentHistoryItem

router = APIRouter(prefix="/assessments", tags=["Assessment History"])

@router.get("/{assessment_id}/history", response_model=AssessmentHistoryListResponse)
async def get_assessment_history(
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

    facility_id = assessment.get("facility_id")

    # Fetch history entries for facility
    cursor = db.assessment_history.find({"facility_id": facility_id}).sort("recorded_at", 1)
    history_raw = await cursor.to_list(length=100)

    history = []
    for h in history_raw:
        history.append(AssessmentHistoryItem(
            assessment_id=h.get("assessment_id", assessment_id),
            total_co2e=float(h.get("total_co2e_snapshot", 0.0)),
            recorded_at=h.get("recorded_at")
        ))

    if not history:
        # Include current assessment as baseline snapshot
        history.append(AssessmentHistoryItem(
            assessment_id=str(assessment["_id"]),
            total_co2e=float(assessment.get("total_co2e", 0.0)),
            recorded_at=assessment.get("created_at")
        ))

    return AssessmentHistoryListResponse(history=history)
