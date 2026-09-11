from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.core.database import get_database
from app.core.auth import get_current_user
from app.services.report_generator import generate_assessment_report

router = APIRouter(prefix="/assessments", tags=["Reports & Export"])

@router.get("/{assessment_id}/export")
async def export_report(
    assessment_id: str,
    format: Optional[str] = Query("pdf", description="Export format: pdf or csv"),
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
    fmt = format.lower().strip() if format else "pdf"
    if fmt not in ["pdf", "csv"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "invalid_format", "message": "Export format must be 'pdf' or 'csv'"}
        )

    file_bytes, filename, media_type = await generate_assessment_report(db, ass_id_str, export_format=fmt)

    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
