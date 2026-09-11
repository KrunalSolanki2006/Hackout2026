from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database

router = APIRouter(tags=["Datasets"])

@router.get("/emission-factors")
async def list_emission_factors(
    category: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if category:
        query["category"] = category.lower().strip()

    cursor = db.emission_factors.find(query)
    factors = await cursor.to_list(length=200)

    for ef in factors:
        ef["id"] = str(ef["_id"])
        ef["_id"] = str(ef["_id"])

    return {"emission_factors": factors}

@router.get("/interventions")
async def list_interventions(
    industry: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    cursor = db.intervention_library.find(query)
    interventions = await cursor.to_list(length=100)

    results = []
    for item in interventions:
        item["id"] = str(item.get("id") or item.get("_id"))
        item["_id"] = str(item["_id"])
        if industry:
            ind_list = [i.lower() for i in item.get("supported_industries", [])]
            if industry.lower() not in ind_list and "all" not in ind_list:
                continue
        results.append(item)

    return {"interventions": results}
