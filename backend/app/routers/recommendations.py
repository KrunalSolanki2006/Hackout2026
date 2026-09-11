from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.core.database import get_database
from app.core.auth import get_current_user
from app.schemas.schemas import RecommendationListResponse, RecommendationItem
from app.services.recommendation_engine import get_or_generate_recommendations

router = APIRouter(prefix="/assessments", tags=["Recommendations"])

@router.get("/{assessment_id}/recommendations", response_model=RecommendationListResponse)
async def get_assessment_recommendations(
    assessment_id: str,
    leak_point: Optional[str] = Query(None, description="Optional filter by leak point or subtype"),
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
    recs = await get_or_generate_recommendations(db, ass_id_str, leak_point_filter=leak_point)

    items = []
    for r in recs:
        items.append(RecommendationItem(**r))

    return RecommendationListResponse(recommendations=items)
