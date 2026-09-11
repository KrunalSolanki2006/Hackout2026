"""
Tests for Evaluation Metrics Suite.
Covers:
- Requirement 6: Model evaluation metrics (Top-3 agreement, Spearman correlation, MAE, RMSE)
"""

import unittest
import numpy as np
import pandas as pd
from ml.evaluation.evaluate import (
    evaluate_ranking_performance,
    evaluate_top_k_agreement,
    generate_evaluation_report,
)


class TestEvaluationMetrics(unittest.TestCase):

    def test_spearman_and_regression_metrics(self):
        """Verify Spearman correlation correctly reflects monotonic rank alignment."""
        y_true = np.array([10.0, 20.0, 30.0, 40.0, 50.0])
        y_pred_perfect = np.array([12.0, 22.0, 28.0, 42.0, 51.0])

        metrics = evaluate_ranking_performance(y_true, y_pred_perfect)
        self.assertAlmostEqual(metrics["spearman_correlation"], 1.0, places=2)
        self.assertLess(metrics["mae"], 3.0)
        self.assertLess(metrics["rmse"], 3.0)

    def test_top_k_agreement_calculation(self):
        """Verify Top-3 set agreement calculation across evaluation groups."""
        df = pd.DataFrame([
            # Group 1
            {"industry": "plastic", "facility_size": "medium", "leak_category": "energy",
             "intervention_id": "I1", "pred_score": 90, "true_score": 95},
            {"industry": "plastic", "facility_size": "medium", "leak_category": "energy",
             "intervention_id": "I2", "pred_score": 85, "true_score": 88},
            {"industry": "plastic", "facility_size": "medium", "leak_category": "energy",
             "intervention_id": "I3", "pred_score": 80, "true_score": 82},
            {"industry": "plastic", "facility_size": "medium", "leak_category": "energy",
             "intervention_id": "I4", "pred_score": 50, "true_score": 40},
        ])

        # Here top-3 true is {I1, I2, I3} and top-3 pred is {I1, I2, I3} -> 100% agreement
        agreement = evaluate_top_k_agreement(df, true_col="true_score", k=3)
        self.assertEqual(agreement, 100.0)

    def test_report_generation(self):
        """Verify evaluation report string formatting."""
        dummy_metrics = {
            "spearman_correlation": 0.94,
            "spearman_p_value": 1e-10,
            "top_k_agreement_pct": 82.5,
            "k": 3,
            "mae": 2.5,
            "rmse": 3.2,
        }
        report = generate_evaluation_report(dummy_metrics)
        self.assertIn("Top-3 Agreement", report)
        self.assertIn("Spearman Rank Correlation", report)
        self.assertIn("[PASS]", report)


if __name__ == "__main__":
    unittest.main()
