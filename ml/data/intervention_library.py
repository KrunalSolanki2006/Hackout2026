"""
Curated Circular Economy Intervention Library.

Defines the domain-curated interventions for industrial SMEs across:
- Energy (combustion, electricity, diesel, natural gas)
- Materials (virgin polymers, recycled polymers, sustainable feedstocks)
- Waste (in-house regrind, scrap recovery, closed-loop recycling)

Saves and manages the intervention catalog as specified in PROJECT_STRUCTURE.md
and ML_IMPLEMENTATION.md.
"""

from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Any, Optional
import json
import pandas as pd


@dataclass(frozen=True)
class Intervention:
    intervention_id: str
    name: str
    category: str  # energy, materials, waste
    applicable_industries: List[str]  # e.g. ["plastic", "textile", "food"]
    applicable_leak_types: List[str]  # e.g. ["energy", "materials", "waste"]
    estimated_cost: float  # USD
    expected_co2_reduction: float  # indicative tCO2e reduction scale per standard SME unit
    implementation_difficulty: str  # "low", "medium", "high"
    payback_period_years: float  # years
    roi_pct: float  # estimated 3-year ROI percentage
    industry_fit: bool  # standard default suitability
    description: str


# Curated catalog of 20 domain-grounded interventions
CURATED_INTERVENTIONS: List[Intervention] = [
    # --- ENERGY INTERVENTIONS ---
    Intervention(
        intervention_id="INT-EN-001",
        name="Rooftop Solar PV + Grid Peak Shaving",
        category="energy",
        applicable_industries=["plastic", "textile", "food"],
        applicable_leak_types=["energy"],
        estimated_cost=55000.0,
        expected_co2_reduction=12.5,
        implementation_difficulty="medium",
        payback_period_years=3.2,
        roi_pct=135.0,
        industry_fit=True,
        description="Install 50kWp on-site solar PV array to displace peak daytime grid electricity.",
    ),
    Intervention(
        intervention_id="INT-EN-002",
        name="Biodiesel (B20/B100) Switch for Backup Generators",
        category="energy",
        applicable_industries=["plastic", "textile", "food"],
        applicable_leak_types=["energy"],
        estimated_cost=12000.0,
        expected_co2_reduction=6.5,
        implementation_difficulty="low",
        payback_period_years=1.1,
        roi_pct=85.0,
        industry_fit=True,
        description="Switch diesel generators to certified B20 or hydrotreated vegetable oil (HVO) fuel.",
    ),
    Intervention(
        intervention_id="INT-EN-003",
        name="Battery Energy Storage System (BESS)",
        category="energy",
        applicable_industries=["plastic", "textile", "food"],
        applicable_leak_types=["energy"],
        estimated_cost=65000.0,
        expected_co2_reduction=8.0,
        implementation_difficulty="high",
        payback_period_years=4.8,
        roi_pct=70.0,
        industry_fit=True,
        description="Deploy 100kWh lithium iron phosphate BESS for load shifting and diesel generator minimization.",
    ),
    Intervention(
        intervention_id="INT-EN-004",
        name="Extruder Barrel Ceramic Thermal Insulation Blankets",
        category="energy",
        applicable_industries=["plastic"],
        applicable_leak_types=["energy"],
        estimated_cost=8500.0,
        expected_co2_reduction=4.8,
        implementation_difficulty="low",
        payback_period_years=0.8,
        roi_pct=195.0,
        industry_fit=True,
        description="Removable multi-layer ceramic insulation jackets for plastic injection/extrusion barrels, cutting heat loss 40%.",
    ),
    Intervention(
        intervention_id="INT-EN-005",
        name="Variable Speed Drives (VSD) on Hydraulic & Extrusion Motors",
        category="energy",
        applicable_industries=["plastic", "textile", "food"],
        applicable_leak_types=["energy"],
        estimated_cost=18000.0,
        expected_co2_reduction=5.2,
        implementation_difficulty="medium",
        payback_period_years=1.8,
        roi_pct=140.0,
        industry_fit=True,
        description="Retrofit inverter drives to match motor speed with real-time pressure demands in moulding cycles.",
    ),
    Intervention(
        intervention_id="INT-EN-006",
        name="Compressed Air Ultrasonic Leak Audit & Flow Control",
        category="energy",
        applicable_industries=["plastic", "textile", "food"],
        applicable_leak_types=["energy"],
        estimated_cost=4500.0,
        expected_co2_reduction=3.1,
        implementation_difficulty="low",
        payback_period_years=0.4,
        roi_pct=260.0,
        industry_fit=True,
        description="Detect and plug pneumatic leaks and reduce plant air header pressure by 0.5 bar.",
    ),
    Intervention(
        intervention_id="INT-EN-007",
        name="Waste Heat Recovery from Process Chillers",
        category="energy",
        applicable_industries=["plastic", "food"],
        applicable_leak_types=["energy"],
        estimated_cost=24000.0,
        expected_co2_reduction=5.8,
        implementation_difficulty="medium",
        payback_period_years=2.3,
        roi_pct=110.0,
        industry_fit=True,
        description="Plate heat exchanger capturing compressor desuperheater heat to preheat plant water.",
    ),

    # --- MATERIALS INTERVENTIONS ---
    Intervention(
        intervention_id="INT-MAT-001",
        name="30% Post-Consumer Recycled (PCR) HDPE Pellet Blending",
        category="materials",
        applicable_industries=["plastic"],
        applicable_leak_types=["materials"],
        estimated_cost=22000.0,
        expected_co2_reduction=13.2,
        implementation_difficulty="medium",
        payback_period_years=1.4,
        roi_pct=160.0,
        industry_fit=True,
        description="Incorporate certified high-purity recycled HDPE resin to substitute virgin polymer in blow moulding.",
    ),
    Intervention(
        intervention_id="INT-MAT-002",
        name="Closed-Loop PET Flake Feedstock Substitution (50% Blend)",
        category="materials",
        applicable_industries=["plastic", "textile"],
        applicable_leak_types=["materials"],
        estimated_cost=28000.0,
        expected_co2_reduction=16.5,
        implementation_difficulty="medium",
        payback_period_years=1.2,
        roi_pct=180.0,
        industry_fit=True,
        description="Substitute virgin PET resin with food-grade or bottle-grade closed-loop recycled flakes (saving ~1650 kgCO2e/tonne).",
    ),
    Intervention(
        intervention_id="INT-MAT-003",
        name="Recycled PP Copolymer Compounding for Moulding",
        category="materials",
        applicable_industries=["plastic"],
        applicable_leak_types=["materials"],
        estimated_cost=19000.0,
        expected_co2_reduction=12.6,
        implementation_difficulty="low",
        payback_period_years=1.0,
        roi_pct=175.0,
        industry_fit=True,
        description="Blend 40% secondary recycled polypropylene into crates and containers, saving 1265 kgCO2e/tonne virgin resin.",
    ),
    Intervention(
        intervention_id="INT-MAT-004",
        name="Bio-based Polymer / PLA Drop-in Blending",
        category="materials",
        applicable_industries=["plastic", "textile"],
        applicable_leak_types=["materials"],
        estimated_cost=34000.0,
        expected_co2_reduction=7.5,
        implementation_difficulty="high",
        payback_period_years=3.5,
        roi_pct=55.0,
        industry_fit=True,
        description="Formulate 20% compostable/bio-sourced PLA compound for thermoformed packaging.",
    ),
    Intervention(
        intervention_id="INT-MAT-005",
        name="Virgin LDPE/LLDPE Film Down-Gauging with Nano-Additives",
        category="materials",
        applicable_industries=["plastic"],
        applicable_leak_types=["materials"],
        estimated_cost=16000.0,
        expected_co2_reduction=9.4,
        implementation_difficulty="medium",
        payback_period_years=0.9,
        roi_pct=210.0,
        industry_fit=True,
        description="Reduce film thickness by 25% without sacrificing tensile strength, directly cutting virgin resin mass.",
    ),
    Intervention(
        intervention_id="INT-MAT-006",
        name="Recycled Polyester (rPET) Yarn Conversion",
        category="materials",
        applicable_industries=["textile"],
        applicable_leak_types=["materials"],
        estimated_cost=31000.0,
        expected_co2_reduction=11.0,
        implementation_difficulty="medium",
        payback_period_years=2.1,
        roi_pct=115.0,
        industry_fit=True,
        description="Convert spinning mills from virgin polyester staple to GRS-certified rPET chip.",
    ),
    Intervention(
        intervention_id="INT-MAT-007",
        name="Alternative Plant-Based Secondary Packaging",
        category="materials",
        applicable_industries=["food"],
        applicable_leak_types=["materials"],
        estimated_cost=15000.0,
        expected_co2_reduction=6.2,
        implementation_difficulty="low",
        payback_period_years=1.3,
        roi_pct=130.0,
        industry_fit=True,
        description="Replace single-use plastic wrap with recycled FSC-certified unbleached corrugated cartonage.",
    ),

    # --- WASTE INTERVENTIONS ---
    Intervention(
        intervention_id="INT-WST-001",
        name="Beside-the-Press Regrind & Closed-Loop Sprue Reprocessing",
        category="waste",
        applicable_industries=["plastic"],
        applicable_leak_types=["waste", "materials"],
        estimated_cost=14000.0,
        expected_co2_reduction=8.8,
        implementation_difficulty="low",
        payback_period_years=0.7,
        roi_pct=240.0,
        industry_fit=True,
        description="Install soundproof granulators next to injection presses for instant feeding of runners and rejects back into the hopper.",
    ),
    Intervention(
        intervention_id="INT-WST-002",
        name="Post-Industrial Plastic Purge Pelletizing Line",
        category="waste",
        applicable_industries=["plastic"],
        applicable_leak_types=["waste"],
        estimated_cost=42000.0,
        expected_co2_reduction=10.5,
        implementation_difficulty="medium",
        payback_period_years=1.9,
        roi_pct=125.0,
        industry_fit=True,
        description="Single-screw shredder-extruder line to convert purge lumps and start-up scrap into clean re-usable masterbatch.",
    ),
    Intervention(
        intervention_id="INT-WST-003",
        name="Solvent & Ink Closed-Loop Distillation Unit",
        category="waste",
        applicable_industries=["plastic", "textile"],
        applicable_leak_types=["waste"],
        estimated_cost=17500.0,
        expected_co2_reduction=4.2,
        implementation_difficulty="low",
        payback_period_years=1.1,
        roi_pct=165.0,
        industry_fit=True,
        description="Vacuum distillation recovery system recovering 95% of printing and wash solvents for reuse.",
    ),
    Intervention(
        intervention_id="INT-WST-004",
        name="Pre-Consumer Fabric Scrap Shredding & Needle-Punching",
        category="waste",
        applicable_industries=["textile"],
        applicable_leak_types=["waste"],
        estimated_cost=38000.0,
        expected_co2_reduction=7.8,
        implementation_difficulty="medium",
        payback_period_years=2.4,
        roi_pct=95.0,
        industry_fit=True,
        description="Convert cutting-room selvage into non-woven insulation pads instead of sending to landfill.",
    ),
    Intervention(
        intervention_id="INT-WST-005",
        name="On-Site Anaerobic Digestion for Food Processing Slurry",
        category="waste",
        applicable_industries=["food"],
        applicable_leak_types=["waste", "energy"],
        estimated_cost=85000.0,
        expected_co2_reduction=14.0,
        implementation_difficulty="high",
        payback_period_years=4.2,
        roi_pct=80.0,
        industry_fit=True,
        description="Micro-biogas digester transforming organic food waste effluent into renewable process steam.",
    ),
    Intervention(
        intervention_id="INT-WST-006",
        name="Automated Color/Resin Optical Scrap Sorter",
        category="waste",
        applicable_industries=["plastic"],
        applicable_leak_types=["waste"],
        estimated_cost=48000.0,
        expected_co2_reduction=9.1,
        implementation_difficulty="high",
        payback_period_years=2.8,
        roi_pct=105.0,
        industry_fit=True,
        description="NIR optical flake sorter preventing cross-contamination in recycling streams.",
    ),
]


class InterventionLibrary:
    """
    Catalog manager for circular economy interventions.
    """

    def __init__(self, csv_path: Optional[Path] = None):
        self.csv_path = csv_path or (Path(__file__).resolve().parent / "intervention_library.csv")
        self._interventions: Dict[str, Intervention] = {}
        self._load_or_create()

    def _load_or_create(self):
        if self.csv_path.exists():
            df = pd.read_csv(self.csv_path)
            for _, row in df.iterrows():
                try:
                    industries = json.loads(row["applicable_industries"]) if isinstance(row["applicable_industries"], str) and row["applicable_industries"].startswith("[") else [i.strip() for i in str(row["applicable_industries"]).split(",")]
                    leak_types = json.loads(row["applicable_leak_types"]) if isinstance(row["applicable_leak_types"], str) and row["applicable_leak_types"].startswith("[") else [l.strip() for l in str(row["applicable_leak_types"]).split(",")]
                except Exception:
                    industries = [i.strip() for i in str(row["applicable_industries"]).split(",")]
                    leak_types = [l.strip() for l in str(row["applicable_leak_types"]).split(",")]

                item = Intervention(
                    intervention_id=str(row["intervention_id"]).strip(),
                    name=str(row["name"]).strip(),
                    category=str(row["category"]).strip(),
                    applicable_industries=industries,
                    applicable_leak_types=leak_types,
                    estimated_cost=float(row["estimated_cost"]),
                    expected_co2_reduction=float(row["expected_co2_reduction"]),
                    implementation_difficulty=str(row["implementation_difficulty"]).strip().lower(),
                    payback_period_years=float(row["payback_period_years"]),
                    roi_pct=float(row.get("roi_pct", 100.0)),
                    industry_fit=bool(row.get("industry_fit", True)),
                    description=str(row.get("description", "")).strip(),
                )
                self._interventions[item.intervention_id] = item
        else:
            for item in CURATED_INTERVENTIONS:
                self._interventions[item.intervention_id] = item
            self.save_csv()

    def save_csv(self):
        self.csv_path.parent.mkdir(parents=True, exist_ok=True)
        records = []
        for item in self._interventions.values():
            d = asdict(item)
            d["applicable_industries"] = json.dumps(item.applicable_industries)
            d["applicable_leak_types"] = json.dumps(item.applicable_leak_types)
            records.append(d)
        df = pd.DataFrame(records)
        df.to_csv(self.csv_path, index=False, encoding="utf-8")

    def get_all(self) -> List[Intervention]:
        return list(self._interventions.values())

    def get_by_id(self, intervention_id: str) -> Optional[Intervention]:
        return self._interventions.get(intervention_id)

    def filter_candidates(self, industry: str, leak_category: str) -> List[Intervention]:
        """
        Filters candidates matching industry and leak type.
        Acts as strict eligibility gate as required by ML_IMPLEMENTATION.md.
        """
        industry_clean = industry.strip().lower()
        leak_clean = leak_category.strip().lower()

        matches = []
        for item in self._interventions.values():
            ind_match = any(industry_clean in ind.lower() or ind.lower() in industry_clean for ind in item.applicable_industries)
            leak_match = any(leak_clean in lt.lower() or lt.lower() in leak_clean for lt in item.applicable_leak_types)
            if ind_match and leak_match:
                matches.append(item)
        return matches


# Global instance
_DEFAULT_LIBRARY: Optional[InterventionLibrary] = None


def get_intervention_library() -> InterventionLibrary:
    global _DEFAULT_LIBRARY
    if _DEFAULT_LIBRARY is None:
        _DEFAULT_LIBRARY = InterventionLibrary()
    return _DEFAULT_LIBRARY


if __name__ == "__main__":
    lib = InterventionLibrary()
    lib.save_csv()
    print(f"Saved {len(lib.get_all())} curated interventions to {lib.csv_path}")
