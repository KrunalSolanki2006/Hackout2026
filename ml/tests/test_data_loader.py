"""
Tests for Data Ingestion, Emission Factor Validation, and Unit Consistency.
Covers:
- Requirement 1: CSV loading
- Requirement 2: Data validation
- Requirement 9: Unit consistency & provenance preservation
"""

import unittest
from pathlib import Path
from ml.data.loader import EmissionFactorLoader, get_emission_factor_loader, EmissionFactor


class TestDataLoader(unittest.TestCase):

    def setUp(self):
        self.loader = get_emission_factor_loader()

    def test_csv_files_loaded_successfully(self):
        """Verify that all source CSV files are loaded without modification."""
        loaded_names = [f.name for f in self.loader.loaded_files]
        self.assertGreaterEqual(len(loaded_names), 3)
        self.assertTrue(any("energy_fuel" in name for name in loaded_names))
        self.assertTrue(any("plastic_material" in name for name in loaded_names))
        self.assertTrue(any("other_sector" in name for name in loaded_names))

    def test_provenance_and_fields_preserved(self):
        """Verify source, version, scope/boundary, and unit metadata are retained."""
        diesel_ef = self.loader.get_factor("Diesel (100% mineral)", unit="litre")
        self.assertIsNotNone(diesel_ef)
        self.assertIsInstance(diesel_ef, EmissionFactor)
        self.assertEqual(diesel_ef.id, "EF-UK-FUEL-003")
        self.assertEqual(diesel_ef.unit, "litre")
        self.assertEqual(diesel_ef.factor_unit, "kgCO2e/litre")
        self.assertAlmostEqual(diesel_ef.factor, 2.66155, places=4)
        self.assertEqual(diesel_ef.source_version, "DEFRA/DESNZ 2026")
        self.assertEqual(diesel_ef.scope_or_boundary, "Scope 1")

    def test_plastic_factors_loaded_correctly(self):
        """Verify cradle-to-gate factors for primary and recycled polymers."""
        pet_primary = self.loader.get_factor("PET", unit="tonne", stage="primary material production")
        self.assertIsNotNone(pet_primary)
        self.assertAlmostEqual(pet_primary.factor, 3861.58, places=2)
        self.assertEqual(pet_primary.unit, "tonne")
        self.assertEqual(pet_primary.factor_unit, "kgCO2e/tonne")

        pet_recycled = self.loader.get_factor("PET", unit="tonne", stage="closed-loop recycled source")
        self.assertIsNotNone(pet_recycled)
        self.assertAlmostEqual(pet_recycled.factor, 2211.58, places=2)

    def test_no_invented_or_hallucinated_factors(self):
        """Verify loader strictly returns None for unsupported items and never fabricates numbers."""
        unknown_factor = self.loader.get_factor("Kryptonite Resin", unit="tonne")
        self.assertIsNone(unknown_factor)

        invalid_unit = self.loader.get_factor("Diesel (100% mineral)", unit="bushels")
        self.assertIsNone(invalid_unit)

    def test_unit_consistency(self):
        """Verify units are not cross-contaminated."""
        elec = self.loader.get_factor("UK electricity grid", unit="kWh")
        self.assertIsNotNone(elec)
        self.assertEqual(elec.unit, "kWh")
        self.assertEqual(elec.factor_unit, "kgCO2e/kWh")
        self.assertAlmostEqual(elec.factor, 0.13096, places=5)


if __name__ == "__main__":
    unittest.main()
