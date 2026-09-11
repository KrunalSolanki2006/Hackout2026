from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.core.database import get_database
from app.core.auth import get_current_user
from app.schemas.schemas import LeakPointListResponse, LeakPoint
from app.services.leak_analysis import get_ranked_leak_points

router = APIRouter(prefix="/assessments", tags=["Leak Points"])

@router.get("/{assessment_id}/leak-points", response_model=LeakPointListResponse)
async def get_assessment_leak_points(
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
    ranked_leaks = await get_ranked_leak_points(db, ass_id_str)

    leak_points = [LeakPoint(**item) for item in ranked_leaks]
    return LeakPointListResponse(leak_points=leak_points)
