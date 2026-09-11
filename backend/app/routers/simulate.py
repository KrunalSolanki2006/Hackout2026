from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.core.database import get_database
from app.core.auth import get_current_user
from app.schemas.schemas import SimulateRequest, SimulateResponse
from app.services.simulator import run_what_if_simulation

router = APIRouter(prefix="/assessments", tags=["Simulator"])

@router.post("/{assessment_id}/simulate", response_model=SimulateResponse)
async def simulate_interventions(
    assessment_id: str,
    sim_data: SimulateRequest,
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
    res = await run_what_if_simulation(db, ass_id_str, sim_data.selected_intervention_ids)

    return SimulateResponse(**res)
