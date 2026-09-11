"""
Tests for Public Ranker Interface, Automatic Fallback, and Input Safety.
Covers:
- Requirement 7: Fallback when model loading/prediction fails
- Requirement 10: Missing/invalid input handling and fail-safe behavior
"""

import unittest
from ml.inference.ranker import score


class TestRankerAndFallback(unittest.TestCase):

    def setUp(self):
        self.facility_profile = {
            "facility_name": "Test Plant",
            "industry": "plastic",
            "facility_size": "medium",
        }
        self.leak_points = [
            {
                "leak_id": "LP-001",
                "category": "energy",
                "name": "Diesel Generator",
                "contribution_pct": 0.43,
            },
            {
                "leak_id": "LP-002",
                "category": "materials",
                "name": "Virgin Resin",
                "contribution_pct": 0.35,
            },
        ]

    def test_standard_ml_scoring(self):
        """Verify normal inference returns valid ranked recommendations with score_source='ml'."""
        results = score(self.facility_profile, self.leak_points)
        self.assertGreater(len(results), 0)

        top_rec = results[0]
        self.assertEqual(top_rec["score_source"], "ml")
        self.assertIn("intervention_id", top_rec)
        self.assertIn("score", top_rec)
        self.assertIn("explanation_flags", top_rec)
        self.assertIsInstance(top_rec["explanation_flags"], list)
        self.assertGreater(len(top_rec["explanation_flags"]), 0)

        # Check descending order
        scores = [r["score"] for r in results]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_automatic_fallback_on_corrupt_or_missing_model(self):
        """When the model path is invalid, ranker must seamlessly fall back to rule_based."""
        fallback_results = score(
            self.facility_profile,
            self.leak_points,
            model_path="non_existent_mock_file.joblib",
        )
        self.assertGreater(len(fallback_results), 0)

        top_rec = fallback_results[0]
        self.assertEqual(top_rec["score_source"], "rule_based")
        self.assertIn("intervention_id", top_rec)
        self.assertIn("score", top_rec)
        self.assertIn("explanation_flags", top_rec)

    def test_schema_parity_between_ml_and_fallback(self):
        """Ensure identical keys and data types whether served by ML or rule_based."""
        ml_results = score(self.facility_profile, self.leak_points)
        fb_results = score(
            self.facility_profile,
            self.leak_points,
            model_path="invalid_path.joblib",
        )

        self.assertGreater(len(ml_results), 0)
        self.assertGreater(len(fb_results), 0)

        ml_keys = set(ml_results[0].keys())
        fb_keys = set(fb_results[0].keys())
        self.assertEqual(ml_keys, fb_keys, "ML and Fallback schemas must be 100% identical")

    def test_missing_or_empty_inputs_fail_safely(self):
        """Verify ranker safely handles empty or invalid inputs without crashing."""
        res_empty_fac = score({}, self.leak_points)
        self.assertEqual(res_empty_fac, [])

        res_empty_lp = score(self.facility_profile, [])
        self.assertEqual(res_empty_lp, [])

        # Unknown industry returns empty candidates rather than crashing
        res_unknown_ind = score(
            {"industry": "aerospace_quantum_fabrication", "facility_size": "medium"},
            self.leak_points,
        )
        self.assertEqual(res_unknown_ind, [])


if __name__ == "__main__":
    unittest.main()
