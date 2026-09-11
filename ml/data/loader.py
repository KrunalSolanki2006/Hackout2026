"""
Emission Factor Data Ingestion Layer.

Responsible for:
- Sourcing and loading validated emission-factor tables from provided CSV files.
- Preserving full provenance: source, source_version, scope/boundary, unit, factor_unit.
- Strict validation of data types and columns.
- Safe factor lookup with explicit handling for missing values.
- Never modifying original CSV files.
- Never inventing or guessing emission factors.
"""

from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import pandas as pd
import logging

logger = logging.getLogger(__name__)

REQUIRED_BASE_COLUMNS = {"id", "sector", "unit", "factor", "factor_unit", "source", "source_version"}


@dataclass(frozen=True)
class EmissionFactor:
    id: str
    sector: str
    name: str  # maps to activity or material
    stage: str
    unit: str
    factor: float
    factor_unit: str
    source: str
    source_version: str
    scope_or_boundary: str
    notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class EmissionFactorLoader:
    """
    Ingests, validates, and indexes emission factor data from the provided CSV files.
    """

    def __init__(self, base_dirs: Optional[List[Path]] = None):
        if base_dirs is None:
            # Default search paths relative to workspace
            root = Path(__file__).resolve().parent.parent.parent
            self.search_dirs = [
                root / "HackoutML",
                root / "ml" / "data",
                root,
            ]
        else:
            self.search_dirs = [Path(d) for d in base_dirs]

        self._factors: Dict[str, EmissionFactor] = {}
        self._lookup: Dict[Tuple[str, str, str], EmissionFactor] = {}  # (sector_norm, name_norm, unit_norm)
        self._loaded_files: List[Path] = []
        self._load_all()

    def _find_file(self, possible_names: List[str]) -> Optional[Path]:
        for directory in self.search_dirs:
            if not directory.exists():
                continue
            for name in possible_names:
                candidate = directory / name
                if candidate.is_file():
                    return candidate
        return None

    def _load_csv(self, file_path: Path, name_col: str, scope_col: str) -> List[EmissionFactor]:
        if not file_path.exists():
            raise FileNotFoundError(f"Emission factor CSV not found: {file_path}")

        # Load with pandas, ensuring no silent alteration
        df = pd.read_csv(file_path, encoding="utf-8")

        # Validate base columns
        missing_cols = REQUIRED_BASE_COLUMNS - set(df.columns)
        if missing_cols:
            raise ValueError(f"File {file_path.name} missing required columns: {missing_cols}")

        if name_col not in df.columns:
            raise ValueError(f"File {file_path.name} missing name column '{name_col}'")

        records: List[EmissionFactor] = []
        for _, row in df.iterrows():
            if pd.isna(row["id"]) or str(row["id"]).strip() == "":
                continue

            factor_val = float(row["factor"])
            factor_id = str(row["id"]).strip()
            sector = str(row["sector"]).strip()
            item_name = str(row[name_col]).strip()
            stage = str(row.get("stage", "")).strip()
            unit = str(row["unit"]).strip()
            factor_unit = str(row["factor_unit"]).strip()
            source = str(row["source"]).strip()
            source_version = str(row["source_version"]).strip()
            scope_or_boundary = str(row.get(scope_col, "")).strip()
            notes = str(row.get("notes", "")).strip() if "notes" in row and pd.notna(row["notes"]) else None

            ef = EmissionFactor(
                id=factor_id,
                sector=sector,
                name=item_name,
                stage=stage,
                unit=unit,
                factor=factor_val,
                factor_unit=factor_unit,
                source=source,
                source_version=source_version,
                scope_or_boundary=scope_or_boundary,
                notes=notes,
            )
            records.append(ef)
        return records

    def _load_all(self):
        # 1. Energy fuel factors
        energy_file = self._find_file([
            "energy_fuel_factors_2026 (1).csv",
            "energy_fuel_factors_2026.csv",
        ])
        if energy_file:
            factors = self._load_csv(energy_file, name_col="activity", scope_col="scope")
            self._register_factors(factors, energy_file)
        else:
            logger.warning("Could not locate energy_fuel_factors_2026.csv")

        # 2. Plastic material factors
        plastic_file = self._find_file(["plastic_material_factors_2026.csv"])
        if plastic_file:
            factors = self._load_csv(plastic_file, name_col="material", scope_col="boundary")
            self._register_factors(factors, plastic_file)
        else:
            logger.warning("Could not locate plastic_material_factors_2026.csv")

        # 3. Other sector factors
        other_file = self._find_file(["other_sector_factors_2026.csv"])
        if other_file:
            factors = self._load_csv(other_file, name_col="activity", scope_col="stage")
            self._register_factors(factors, other_file)
        else:
            logger.warning("Could not locate other_sector_factors_2026.csv")

    def _register_factors(self, factors: List[EmissionFactor], source_file: Path):
        self._loaded_files.append(source_file)
        for ef in factors:
            self._factors[ef.id] = ef
            # Index by primary key and normalized tuple
            stage_norm = ef.stage.strip().lower()
            # Index with stage
            full_key = (
                ef.sector.strip().lower(),
                ef.name.strip().lower(),
                stage_norm,
                ef.unit.strip().lower(),
            )
            self._lookup[full_key] = ef

            # Index without stage (defaults to primary/first registered)
            norm_key = (
                ef.sector.strip().lower(),
                ef.name.strip().lower(),
                "",
                ef.unit.strip().lower(),
            )
            if norm_key not in self._lookup:
                self._lookup[norm_key] = ef

            # Simple key
            simple_key = (
                "",
                ef.name.strip().lower(),
                stage_norm,
                ef.unit.strip().lower(),
            )
            if simple_key not in self._lookup:
                self._lookup[simple_key] = ef

            simple_nostage = (
                "",
                ef.name.strip().lower(),
                "",
                ef.unit.strip().lower(),
            )
            if simple_nostage not in self._lookup:
                self._lookup[simple_nostage] = ef

    @property
    def loaded_files(self) -> List[Path]:
        return list(self._loaded_files)

    def get_by_id(self, factor_id: str) -> Optional[EmissionFactor]:
        return self._factors.get(factor_id)

    def get_factor(
        self,
        item_name: str,
        unit: str,
        sector: Optional[str] = None,
        stage: Optional[str] = None,
    ) -> Optional[EmissionFactor]:
        """
        Safely look up emission factor by item name, unit, and optional sector/stage.
        Never invents values. If factor is not in dataset, returns None.
        """
        name_norm = item_name.strip().lower()
        unit_norm = unit.strip().lower()
        stage_norm = stage.strip().lower() if stage else ""
        sector_norm = sector.strip().lower() if sector else ""

        # 1. Exact match with sector and stage
        if sector_norm and stage_norm:
            k = (sector_norm, name_norm, stage_norm, unit_norm)
            if k in self._lookup:
                return self._lookup[k]

        # 2. Match with stage only
        if stage_norm:
            k = ("", name_norm, stage_norm, unit_norm)
            if k in self._lookup:
                return self._lookup[k]

        # 3. Match with sector only
        if sector_norm:
            k = (sector_norm, name_norm, "", unit_norm)
            if k in self._lookup:
                return self._lookup[k]

        # 4. Match without sector or stage
        k = ("", name_norm, "", unit_norm)
        if k in self._lookup:
            return self._lookup[k]

        # 5. Fallback substring search
        for ef in self._factors.values():
            if ef.unit.strip().lower() == unit_norm:
                if name_norm in ef.name.strip().lower() or ef.name.strip().lower() in name_norm:
                    if not stage_norm or stage_norm in ef.stage.strip().lower():
                        return ef

        return None

    def list_all(self) -> List[EmissionFactor]:
        return list(self._factors.values())

    def to_dataframe(self) -> pd.DataFrame:
        records = [ef.to_dict() for ef in self._factors.values()]
        return pd.DataFrame(records)


# Global singleton helper
_DEFAULT_LOADER: Optional[EmissionFactorLoader] = None


def get_emission_factor_loader() -> EmissionFactorLoader:
    global _DEFAULT_LOADER
    if _DEFAULT_LOADER is None:
        _DEFAULT_LOADER = EmissionFactorLoader()
    return _DEFAULT_LOADER
