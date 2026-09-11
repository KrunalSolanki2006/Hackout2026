import logging
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

logger = logging.getLogger("app.services.leak_analysis")

def get_severity_badge(pct: float) -> str:
    if pct >= 30.0:
        return "High"
    elif pct >= 10.0:
        return "Medium"
    return "Low"

async def get_ranked_leak_points(db: AsyncIOMotorDatabase, assessment_id: str) -> List[Dict[str, Any]]:
    """
    Ranks emission leak points for an assessment. Reads calculated computed_co2e values, writes nothing back.
    """
    cursor = db.process_inputs.find({"assessment_id": assessment_id})
    inputs = await cursor.to_list(length=500)

    if not inputs:
        return []

    # Aggregate by subtype / input name
    aggregated = {}
    total_co2e = 0.0

    for item in inputs:
        co2e = float(item.get("computed_co2e", 0.0))
        subtype = item.get("subtype", "unknown")
        category = item.get("category", "general")

        total_co2e += co2e
        key = (category, subtype)
        if key not in aggregated:
            aggregated[key] = {
                "category": category,
                "subtype": subtype,
                "name": subtype.replace("_", " ").title(),
                "computed_co2e": 0.0
            }
        aggregated[key]["computed_co2e"] += co2e

    # Build ranked list
    items_list = list(aggregated.values())
    for item in items_list:
        co2e = item["computed_co2e"]
        pct = round((co2e / total_co2e * 100.0), 2) if total_co2e > 0 else 0.0
        item["contribution_pct"] = pct
        item["computed_co2e"] = round(co2e, 4)

    # Sort descending
    items_list.sort(key=lambda x: x["contribution_pct"], reverse=True)

    ranked_leak_points = []
    for rank, item in enumerate(items_list, start=1):
        pct = item["contribution_pct"]
        ranked_leak_points.append({
            "rank": rank,
            "name": item["name"],
            "category": item["category"],
            "subtype": item["subtype"],
            "computed_co2e": item["computed_co2e"],
            "contribution_pct": pct,
            "severity_badge": get_severity_badge(pct)
        })

    return ranked_leak_points
