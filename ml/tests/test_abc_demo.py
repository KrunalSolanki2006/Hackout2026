"""
Tests for ABC Plastics End-to-End Demo Journey.
Covers:
- Requirement 8: ABC Plastics demo validation
"""

import unittest
from ml.demo.abc_plastics_demo import run_abc_plastics_demo


class TestABCDemo(unittest.TestCase):

    def test_abc_plastics_end_to_end_execution(self):
        """Runs the entire ABC Plastics journey and verifies calculations and outputs."""
        demo_output = run_abc_plastics_demo(verbose=False)

        self.assertIn("facility_profile", demo_output)
        self.assertIn("emission_summary", demo_output)
        self.assertIn("leak_points", demo_output)
        self.assertIn("ml_top_recommendations", demo_output)
        self.assertIn("fallback_top_recommendations", demo_output)

        # Audit emission calculation
        total_co2e = demo_output["emission_summary"]["total_co2e_tonnes"]
        self.assertGreater(total_co2e, 250.0)
        self.assertLess(total_co2e, 300.0)

        # Verify #1 leak point is Diesel Generator with approx 43% contribution
        lps = demo_output["leak_points"]
        top_lp = lps[0]
        self.assertIn("Diesel", top_lp["name"])
        self.assertAlmostEqual(top_lp["contribution_pct"], 0.43, delta=0.03)
        self.assertEqual(top_lp["severity"], "HIGH")

        # Verify #2 leak point is PET
        second_lp = lps[1]
        self.assertEqual(second_lp["name"], "PET")
        self.assertAlmostEqual(second_lp["contribution_pct"], 0.35, delta=0.03)

        # Verify recommendations exist and are ranked
        ml_recs = demo_output["ml_top_recommendations"]
        self.assertGreaterEqual(len(ml_recs), 3)
        self.assertEqual(ml_recs[0]["score_source"], "ml")
        self.assertGreater(ml_recs[0]["score"], ml_recs[-1]["score"])


if __name__ == "__main__":
    unittest.main()
