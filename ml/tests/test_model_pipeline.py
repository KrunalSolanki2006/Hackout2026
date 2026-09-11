"""
Tests for ML Model Pipeline, Training, and Zero Data Leakage.
Covers:
- Requirement 4: ML prediction
- Requirement 5: Ranking
"""

import unittest
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from ml.pipeline.preprocessor import build_preprocessor, ALL_FEATURE_COLUMNS
from ml.inference.ranker import get_model


class TestModelPipeline(unittest.TestCase):

    def test_model_artifact_exists_and_loads(self):
        """Verify the trained recommender_v1.joblib artifact is present and loads."""
        model = get_model()
        self.assertIsNotNone(model, "Model artifact should be loaded successfully")
        self.assertTrue(hasattr(model, "predict"), "Model must implement predict method")

    def test_pipeline_prediction_shape_and_bounds(self):
        """Verify ML pipeline predicts valid suitability scores for tabular features."""
        model = get_model()
        test_input = pd.DataFrame([
            {
                "industry": "plastic",
                "facility_size": "medium",
                "leak_category": "energy",
                "intervention_category": "energy",
                "implementation_difficulty": "medium",
                "leak_contribution": 0.43,
                "intervention_cost": 55000.0,
                "expected_CO2_reduction": 12.5,
                "industry_fit": True,
            },
            {
                "industry": "plastic",
                "facility_size": "medium",
                "leak_category": "materials",
                "intervention_category": "materials",
                "implementation_difficulty": "low",
                "leak_contribution": 0.35,
                "intervention_cost": 19000.0,
                "expected_CO2_reduction": 12.6,
                "industry_fit": True,
            }
        ])[ALL_FEATURE_COLUMNS]

        preds = model.predict(test_input)
        self.assertEqual(len(preds), 2)
        for p in preds:
            self.assertGreaterEqual(p, 1.0)
            self.assertLessEqual(p, 100.0)

    def test_no_data_leakage_in_preprocessor(self):
        """Verify StandardScaler inside preprocessor learns statistics strictly on fit."""
        preprocessor = build_preprocessor()
        train_df = pd.DataFrame([
            {"industry": "plastic", "facility_size": "small", "leak_category": "energy",
             "intervention_category": "energy", "implementation_difficulty": "low",
             "leak_contribution": 0.20, "intervention_cost": 10000.0,
             "expected_CO2_reduction": 5.0, "industry_fit": True},
            {"industry": "textile", "facility_size": "large", "leak_category": "waste",
             "intervention_category": "waste", "implementation_difficulty": "high",
             "leak_contribution": 0.50, "intervention_cost": 80000.0,
             "expected_CO2_reduction": 15.0, "industry_fit": False},
        ])
        preprocessor.fit(train_df)
        num_transformer = preprocessor.named_transformers_["num"]
        self.assertTrue(hasattr(num_transformer, "mean_"))
        self.assertEqual(len(num_transformer.mean_), 3)


if __name__ == "__main__":
    unittest.main()
