import logging
from typing import List, Dict, Any, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger("app.services.calculation_engine")

# Conversion table to base units (kWh, litre, m3, kg)
CONVERSION_TABLE = {
    # Energy
    ("kwh", "mwh"): 1000.0,
    ("mwh", "kwh"): 0.001,
    ("litre", "gallon"): 3.78541,
    ("gallon", "litre"): 0.264172,
    ("litre", "l"): 1.0,
    ("l", "litre"): 1.0,
    # Material / Waste
    ("kg", "lb"): 0.453592,
    ("lb", "kg"): 2.20462,
    ("kg", "ton"): 1000.0,
    ("ton", "kg"): 0.001,
    ("kg", "tonne"): 1000.0,
    ("tonne", "kg"): 0.001
}

def normalize_unit_and_qty(input_unit: str, target_unit: str, quantity: float) -> Tuple[float, bool]:
    u_in = input_unit.lower().strip()
    u_tgt = target_unit.lower().strip()

    if u_in == u_tgt:
        return quantity, True

    # Check direct conversion
    key = (u_tgt, u_in)
    if key in CONVERSION_TABLE:
        multiplier = CONVERSION_TABLE[key]
        return quantity * multiplier, True

    return quantity, False

async def get_emission_factor(db: AsyncIOMotorDatabase, category: str, subtype: str, unit: str) -> Dict[str, Any]:
    cat = category.lower().strip()
    sub = subtype.lower().strip()
    u = unit.lower().strip()

    # Exact match search
    factor_doc = await db.emission_factors.find_one({
        "category": cat,
        "subtype": sub,
        "unit": u
    })
    if factor_doc:
        return factor_doc

    # Subtype fallback match with unit conversion check
    cursor = db.emission_factors.find({"category": cat, "subtype": sub})
    factors = await cursor.to_list(length=50)

    for ef in factors:
        target_unit = ef.get("unit", "")
        _, can_convert = normalize_unit_and_qty(u, target_unit, 1.0)
        if can_convert:
            return ef

    return None

async def calculate_assessment_co2e(db: AsyncIOMotorDatabase, assessment_id: str) -> Dict[str, Any]:
    """
    The ONLY authoritative function allowed to calculate computed_co2e for ProcessInputs and total_co2e for Assessment.
    Returns summary dict with computed total_co2e, category totals, line items, and unsupported inputs.
    """
    cursor = db.process_inputs.find({"assessment_id": assessment_id})
    input_items = await cursor.to_list(length=500)

    total_co2e_kg = 0.0
    line_details = []
    unsupported = []

    for item in input_items:
        item_id = str(item["_id"])
        category = item["category"]
        subtype = item["subtype"]
        quantity = float(item["quantity"])
        unit = item["unit"]

        ef_doc = await get_emission_factor(db, category, subtype, unit)

        if not ef_doc:
            unsupported.append({
                "input_id": item_id,
                "category": category,
                "subtype": subtype,
                "quantity": quantity,
                "unit": unit,
                "reason": f"No emission factor found for {category}/{subtype} in unit '{unit}'"
            })
            # Exclude from total, keep computed_co2e = 0.0
            await db.process_inputs.update_one(
                {"_id": item["_id"]},
                {"$set": {"computed_co2e": 0.0, "emission_factor_id": None}}
            )
            continue

        target_unit = ef_doc.get("unit", unit)
        factor_val = float(ef_doc.get("emission_factor", 0.0))
        factor_source = ef_doc.get("source", "Sourced Dataset")
        ef_id = str(ef_doc["_id"])

        normalized_qty, _ = normalize_unit_and_qty(unit, target_unit, quantity)
        line_co2e_kg = normalized_qty * factor_val
        line_co2e_tonnes = line_co2e_kg / 1000.0

        total_co2e_kg += line_co2e_kg

        # Update input line in DB
        await db.process_inputs.update_one(
            {"_id": item["_id"]},
            {"$set": {
                "computed_co2e": round(line_co2e_tonnes, 4),
                "emission_factor_id": ef_id
            }}
        )

        line_details.append({
            "id": item_id,
            "category": category,
            "subtype": subtype,
            "quantity": quantity,
            "unit": unit,
            "emission_factor_used": factor_val,
            "factor_source": factor_source,
            "computed_co2e": round(line_co2e_tonnes, 4),
            "line_co2e_kg": line_co2e_kg
        })

    total_co2e_tonnes = round(total_co2e_kg / 1000.0, 4)

    # Compute contribution percentages
    category_kg = {}
    for line in line_details:
        cat = line["category"]
        category_kg[cat] = category_kg.get(cat, 0.0) + line["line_co2e_kg"]
        
        line_pct = (line["line_co2e_kg"] / total_co2e_kg * 100.0) if total_co2e_kg > 0 else 0.0
        line["contribution_pct"] = round(line_pct, 2)

    category_totals = []
    for cat, cat_kg in category_kg.items():
        cat_tonnes = round(cat_kg / 1000.0, 4)
        cat_pct = round((cat_kg / total_co2e_kg * 100.0), 2) if total_co2e_kg > 0 else 0.0
        category_totals.append({
            "category": cat,
            "total_co2e": cat_tonnes,
            "pct": cat_pct
        })

    # Update assessment document
    await db.assessments.update_one(
        {"_id": assessment_id},
        {"$set": {"total_co2e": total_co2e_tonnes}}
    )
    # Also update if ObjectId
    from bson import ObjectId
    if ObjectId.is_valid(assessment_id):
        await db.assessments.update_one(
            {"_id": ObjectId(assessment_id)},
            {"$set": {"total_co2e": total_co2e_tonnes}}
        )

    return {
        "total_co2e": total_co2e_tonnes,
        "category_totals": category_totals,
        "line_items": line_details,
        "unsupported_inputs_count": len(unsupported),
        "unsupported_inputs": unsupported
    }
