"""
Deterministic Emission Calculation & Leak-Point Aggregation Engine.

IMPORTANT ARCHITECTURAL RULE:
Emissions math (quantity * emission_factor) is purely deterministic.
ML NEVER touches emission calculations.
All emission factors are sourced directly from the provided static CSV files
(DEFRA / UK DESNZ 2026 conversion tables) via EmissionFactorLoader.
"""

from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional
from ml.data.loader import get_emission_factor_loader, EmissionFactor


@dataclass
class CalculatedInputLine:
    line_id: str
    category: str  # energy, materials, waste
    activity_or_material: str
    quantity: float
    unit: str
    emission_factor_id: str
    factor_value: float
    factor_unit: str
    factor_source: str
    factor_version: str
    co2e_kg: float
    co2e_tonnes: float


@dataclass
class LeakPoint:
    leak_id: str
    category: str
    name: str
    co2e_tonnes: float
    contribution_pct: float  # 0.0 to 1.0 (e.g. 0.43 for 43%)
    severity: str  # "HIGH", "MEDIUM", "LOW"


class DeterministicEmissionEngine:
    """
    Computes facility emissions strictly using verified emission factors from CSVs.
    """

    def __init__(self):
        self.loader = get_emission_factor_loader()

    def calculate_line(
        self,
        line_id: str,
        category: str,
        item_name: str,
        quantity: float,
        unit: str,
        sector: Optional[str] = None,
        stage: Optional[str] = None,
    ) -> CalculatedInputLine:
        factor_obj = self.loader.get_factor(item_name=item_name, unit=unit, sector=sector, stage=stage)
        if factor_obj is None:
            raise ValueError(
                f"Unsupported emission input: '{item_name}' with unit '{unit}'. "
                f"Factor does not exist in verified CSV files. Refusing to invent values."
            )

        # Verify unit consistency
        if factor_obj.unit.strip().lower() != unit.strip().lower():
            raise ValueError(
                f"Unit mismatch: Input unit '{unit}' does not match factor unit '{factor_obj.unit}'."
            )

        co2e_kg = round(quantity * factor_obj.factor, 3)
        co2e_tonnes = round(co2e_kg / 1000.0, 3)

        return CalculatedInputLine(
            line_id=line_id,
            category=category,
            activity_or_material=factor_obj.name,
            quantity=quantity,
            unit=unit,
            emission_factor_id=factor_obj.id,
            factor_value=factor_obj.factor,
            factor_unit=factor_obj.factor_unit,
            factor_source=factor_obj.source,
            factor_version=factor_obj.source_version,
            co2e_kg=co2e_kg,
            co2e_tonnes=co2e_tonnes,
        )

    def analyze_facility_emissions(
        self,
        facility_inputs: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Calculates line items, aggregates totals, and extracts ranked leak points.
        """
        calculated_lines: List[CalculatedInputLine] = []
        for i, inp in enumerate(facility_inputs):
            line_id = inp.get("line_id", f"LINE-{i+1:03d}")
            category = inp["category"]
            item_name = inp["name"]
            quantity = float(inp["quantity"])
            unit = inp["unit"]
            sector = inp.get("sector")

            stage = inp.get("stage")

            line = self.calculate_line(
                line_id=line_id,
                category=category,
                item_name=item_name,
                quantity=quantity,
                unit=unit,
                sector=sector,
                stage=stage,
            )
            calculated_lines.append(line)

        total_co2e_kg = sum(l.co2e_kg for l in calculated_lines)
        total_co2e_tonnes = sum(l.co2e_tonnes for l in calculated_lines)

        # Aggregate into leak points by name + category
        agg_map: Dict[str, Dict[str, Any]] = {}
        for l in calculated_lines:
            key = f"{l.category}::{l.activity_or_material}"
            if key not in agg_map:
                agg_map[key] = {
                    "category": l.category,
                    "name": l.activity_or_material,
                    "co2e_tonnes": 0.0,
                }
            agg_map[key]["co2e_tonnes"] += l.co2e_tonnes

        # Build LeakPoints with contribution percentages
        leak_points: List[LeakPoint] = []
        for i, (key, item) in enumerate(agg_map.items()):
            co2e_t = round(item["co2e_tonnes"], 3)
            pct = round(co2e_t / total_co2e_tonnes, 4) if total_co2e_tonnes > 0 else 0.0

            if pct >= 0.30:
                severity = "HIGH"
            elif pct >= 0.15:
                severity = "MEDIUM"
            else:
                severity = "LOW"

            leak_points.append(LeakPoint(
                leak_id=f"LP-{i+1:03d}",
                category=item["category"],
                name=item["name"],
                co2e_tonnes=co2e_t,
                contribution_pct=pct,
                severity=severity,
            ))

        # Rank leak points descending by contribution
        ranked_leak_points = sorted(leak_points, key=lambda lp: lp.contribution_pct, reverse=True)

        return {
            "total_co2e_tonnes": round(total_co2e_tonnes, 3),
            "total_co2e_kg": round(total_co2e_kg, 2),
            "calculated_lines": [asdict(l) for l in calculated_lines],
            "leak_points": [asdict(lp) for lp in ranked_leak_points],
        }
