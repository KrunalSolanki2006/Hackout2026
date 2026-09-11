from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.core.database import get_database
from app.core.auth import get_current_user
from app.schemas.schemas import FacilityCreate, FacilityResponse, FacilityListResponse

router = APIRouter(prefix="/facilities", tags=["Facilities"])

VALID_INDUSTRIES = ["plastic", "textile", "food_processing"]
VALID_SIZES = ["small", "medium", "large"]

@router.post("", response_model=FacilityResponse, status_code=201)
async def create_facility(
    facility_data: FacilityCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    industry = facility_data.industry.lower().strip()
    size = facility_data.facility_size.lower().strip()

    if industry not in VALID_INDUSTRIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "invalid_industry", "message": f"Industry must be one of {VALID_INDUSTRIES}"}
        )
    if size not in VALID_SIZES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "invalid_size", "message": f"Facility size must be one of {VALID_SIZES}"}
        )

    doc = {
        "owner_user_id": current_user["id"],
        "name": facility_data.name.strip(),
        "industry": industry,
        "facility_size": size,
        "region": facility_data.region.strip(),
        "production_volume": facility_data.production_volume,
        "created_at": datetime.utcnow()
    }

    result = await db.facilities.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return FacilityResponse(**doc)

@router.get("", response_model=FacilityListResponse)
async def list_user_facilities(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    cursor = db.facilities.find({"owner_user_id": current_user["id"]}).sort("created_at", -1)
    facilities_raw = await cursor.to_list(length=100)

    facilities = []
    for f in facilities_raw:
        f["id"] = str(f["_id"])
        facilities.append(FacilityResponse(**f))

    return FacilityListResponse(facilities=facilities)

@router.get("/{facility_id}", response_model=FacilityResponse)
async def get_facility(
    facility_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {"owner_user_id": current_user["id"]}
    if ObjectId.is_valid(facility_id):
        query["_id"] = ObjectId(facility_id)
    else:
        query["_id"] = facility_id

    facility = await db.facilities.find_one(query)
    if not facility:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "not_found", "message": "Facility not found or not owned by user"}
        )

    facility["id"] = str(facility["_id"])
    return FacilityResponse(**facility)
