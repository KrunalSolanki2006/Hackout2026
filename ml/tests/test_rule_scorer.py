"""
Tests for Deterministic Rule-Based Scorer and Eligibility Filtering.
Covers:
- Requirement 3: Rule-based scoring
- Requirement 5: Ranking ordering
"""

import unittest
from ml.pipeline.rule_based_scorer import (
    calculate_rule_score,
    score_candidates,
    compute_explanation_flags,
)
from ml.data.intervention_library import get_intervention_library


class TestRuleBasedScorer(unittest.TestCase):

    def setUp(self):
        self.library = get_intervention_library()

    def test_eligibility_filter(self):
        """Interventions for unrelated industries or leak types must be filtered out."""
        facility_profile = {"industry": "plastic", "facility_size": "medium"}
        # Energy leak point
        leak_points = [{"category": "energy", "contribution_pct": 0.40, "name": "Boiler"}]

        results = score_candidates(facility_profile, leak_points)
        self.assertGreater(len(results), 0)

        # All results must be applicable to energy
        for rec in results:
            self.assertEqual(rec["target_leak_category"], "energy")
            self.assertEqual(rec["score_source"], "rule_based")

    def test_score_calculation_bounds_and_monotonicity(self):
        """Higher CO2 reduction should produce higher score when other features are held equal."""
        score_low_reduction = calculate_rule_score(
            facility_size="medium",
            leak_contribution_pct=0.30,
            intervention_cost=20000.0,
            expected_co2_reduction=3.0,
            implementation_difficulty="medium",
        )
        score_high_reduction = calculate_rule_score(
            facility_size="medium",
            leak_contribution_pct=0.30,
            intervention_cost=20000.0,
            expected_co2_reduction=15.0,
            implementation_difficulty="medium",
        )

        self.assertGreater(score_high_reduction, score_low_reduction)
        self.assertGreaterEqual(score_low_reduction, 1.0)
        self.assertLessEqual(score_high_reduction, 99.0)

    def test_explanation_flags_deterministic(self):
        """Verify explanation flags match feature thresholds."""
        flags = compute_explanation_flags(
            leak_contribution_pct=0.45,
            intervention_cost=15000.0,
            budget=120000.0,
            expected_co2_reduction=12.0,
            implementation_difficulty="low",
            industry_fit=True,
            payback_years=1.0,
        )
        self.assertIn("High emission contribution", flags)
        self.assertIn("Strong industry fit", flags)
        self.assertIn("High CO2 reduction potential", flags)
        self.assertIn("Low capital expenditure", flags)
        self.assertIn("Low implementation complexity", flags)
        self.assertIn("Fast payback (<1.5 yrs)", flags)


if __name__ == "__main__":
    unittest.main()
