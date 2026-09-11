from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.core.database import get_database
from app.core.auth import get_current_user
from app.schemas.schemas import ProcessInputCreate, ProcessInputResponse
from app.services.calculation_engine import calculate_assessment_co2e, get_emission_factor

router = APIRouter(prefix="/assessments", tags=["Process Inputs"])

VALID_CATEGORIES = ["energy", "material", "waste"]

@router.post("/{assessment_id}/inputs", response_model=ProcessInputResponse, status_code=201)
async def add_process_input(
    assessment_id: str,
    input_data: ProcessInputCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    # Verify assessment ownership
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

    cat = input_data.category.lower().strip()
    if cat not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "invalid_category", "message": f"Category must be one of {VALID_CATEGORIES}"}
        )

    if input_data.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "invalid_quantity", "message": "Quantity must be greater than 0"}
        )

    ass_id_str = str(assessment["_id"])

    # Lookup emission factor check
    ef_doc = await get_emission_factor(db, cat, input_data.subtype, input_data.unit)

    input_doc = {
        "assessment_id": ass_id_str,
        "category": cat,
        "subtype": input_data.subtype.lower().strip(),
        "quantity": float(input_data.quantity),
        "unit": input_data.unit.strip(),
        "emission_factor_id": str(ef_doc["_id"]) if ef_doc else None,
        "computed_co2e": 0.0
    }

    result = await db.process_inputs.insert_one(input_doc)
    input_id = str(result.inserted_id)

    # Recalculate CO2e using deterministic engine
    calc_res = await calculate_assessment_co2e(db, ass_id_str)

    # Fetch updated input line
    updated_input = await db.process_inputs.find_one({"_id": ObjectId(input_id)})
    if not updated_input:
        updated_input = input_doc
        updated_input["_id"] = input_id

    updated_input["id"] = str(updated_input["_id"])
    return ProcessInputResponse(**updated_input)

@router.delete("/{assessment_id}/inputs/{input_id}", status_code=200)
async def delete_process_input(
    assessment_id: str,
    input_id: str,
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

    inp_query = {"assessment_id": str(assessment["_id"])}
    if ObjectId.is_valid(input_id):
        inp_query["_id"] = ObjectId(input_id)
    else:
        inp_query["_id"] = input_id

    delete_res = await db.process_inputs.delete_one(inp_query)
    if delete_res.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "not_found", "message": "Process input line not found"}
        )

    # Recalculate assessment total
    await calculate_assessment_co2e(db, str(assessment["_id"]))

    return {"message": "Input line deleted successfully", "assessment_id": assessment_id, "deleted_id": input_id}
