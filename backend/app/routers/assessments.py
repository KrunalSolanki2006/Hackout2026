from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.core.database import get_database
from app.core.auth import get_current_user
from app.schemas.schemas import AssessmentResponse, AssessmentDetailResponse, ProcessInputResponse

router = APIRouter(tags=["Assessments"])

@router.post("/facilities/{facility_id}/assessments", response_model=AssessmentResponse, status_code=201)
async def start_assessment(
    facility_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    # Verify facility ownership
    fac_query = {"owner_user_id": current_user["id"]}
    if ObjectId.is_valid(facility_id):
        fac_query["_id"] = ObjectId(facility_id)
    else:
        fac_query["_id"] = facility_id

    facility = await db.facilities.find_one(fac_query)
    if not facility:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "not_found", "message": "Facility not found or not owned by user"}
        )

    assessment_doc = {
        "facility_id": str(facility["_id"]),
        "owner_user_id": current_user["id"],
        "status": "draft",
        "total_co2e": 0.0,
        "created_at": datetime.utcnow(),
        "completed_at": None
    }

    result = await db.assessments.insert_one(assessment_doc)
    assessment_doc["id"] = str(result.inserted_id)

    return AssessmentResponse(**assessment_doc)

@router.get("/assessments/{assessment_id}", response_model=AssessmentDetailResponse)
async def get_assessment(
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
    assessment["id"] = ass_id_str

    # Fetch inputs
    cursor = db.process_inputs.find({"assessment_id": ass_id_str})
    inputs_raw = await cursor.to_list(length=500)

    inputs = []
    for inp in inputs_raw:
        inp["id"] = str(inp["_id"])
        inputs.append(ProcessInputResponse(**inp))

    return AssessmentDetailResponse(
        assessment=AssessmentResponse(**assessment),
        inputs=inputs,
        unsupported_inputs=[]
    )
