"""
ML Feature Preprocessing Pipeline.

Builds a scikit-learn ColumnTransformer for:
- Categoricals (one-hot encoded with handle_unknown='ignore')
- Ordinal features (implementation_difficulty -> 0, 1, 2)
- Booleans (industry_fit -> 0, 1)
- Numerics (StandardScaler)

Strictly prevents data leakage by encapsulating transformation logic inside
a self-contained scikit-learn Pipeline.
"""

from typing import List
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder, StandardScaler
from sklearn.base import BaseEstimator, TransformerMixin

CATEGORICAL_FEATURES: List[str] = [
    "industry",
    "facility_size",
    "leak_category",
    "intervention_category",
]

ORDINAL_FEATURES: List[str] = [
    "implementation_difficulty",
]

NUMERICAL_FEATURES: List[str] = [
    "leak_contribution",
    "intervention_cost",
    "expected_CO2_reduction",
]

BOOLEAN_FEATURES: List[str] = [
    "industry_fit",
]

ALL_FEATURE_COLUMNS = (
    CATEGORICAL_FEATURES + ORDINAL_FEATURES + NUMERICAL_FEATURES + BOOLEAN_FEATURES
)


class BooleanToNumericTransformer(BaseEstimator, TransformerMixin):
    """Safely converts boolean/string-boolean series to 0.0 or 1.0 float."""

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        X_df = pd.DataFrame(X)
        transformed = X_df.map(lambda v: 1.0 if (v is True or str(v).lower() in ["true", "1", "yes"]) else 0.0)
        return transformed.values


def build_preprocessor() -> ColumnTransformer:
    """
    Constructs the preprocessor for tabular feature transformation.
    """
    preprocessor = ColumnTransformer(
        transformers=[
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CATEGORICAL_FEATURES,
            ),
            (
                "ord",
                OrdinalEncoder(
                    categories=[["low", "medium", "high"]],
                    handle_unknown="use_encoded_value",
                    unknown_value=-1,
                ),
                ORDINAL_FEATURES,
            ),
            (
                "num",
                StandardScaler(),
                NUMERICAL_FEATURES,
            ),
            (
                "bool",
                BooleanToNumericTransformer(),
                BOOLEAN_FEATURES,
            ),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )
    return preprocessor
