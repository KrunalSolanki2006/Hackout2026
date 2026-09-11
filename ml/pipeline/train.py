"""
ML Training Pipeline for Circular Alternative Recommendation.

Trains a GradientBoostingRegressor pipeline on the synthetic/curated training dataset.
Enforces:
- Self-contained scikit-learn Pipeline (zero data leakage)
- 80/20 train/test split with fixed random seed
- Artifact serialization to both ml/models/ and models/
- Post-training evaluation report generation
"""

from pathlib import Path
from typing import Tuple, Dict, Any, Optional, List
import joblib
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from ml.data.synthetic_generator import generate_synthetic_dataset
from ml.pipeline.preprocessor import build_preprocessor, ALL_FEATURE_COLUMNS
from ml.evaluation.evaluate import evaluate_ranking_performance, generate_evaluation_report

RANDOM_STATE = 42


def load_or_generate_data(data_path: Path) -> pd.DataFrame:
    if not data_path.exists():
        print(f"Data file {data_path} not found. Generating synthetic dataset...")
        df = generate_synthetic_dataset(output_path=data_path, seed=RANDOM_STATE)
    else:
        df = pd.read_csv(data_path)
    return df


def train_model(
    data_path: Optional[Path] = None,
    model_output_paths: Optional[List[Path]] = None,
) -> Tuple[Pipeline, Dict[str, Any]]:
    root = Path(__file__).resolve().parent.parent.parent

    if data_path is None:
        data_path = root / "ml" / "data" / "training_dataset.csv"

    if model_output_paths is None:
        model_output_paths = [
            root / "ml" / "models" / "recommender_v1.joblib",
            root / "models" / "recommender_v1.joblib",
        ]

    # 1. Load Data
    df = load_or_generate_data(data_path)
    print(f"Loaded dataset: {len(df)} samples across {df['industry'].nunique()} industries.")

    # 2. Features and Target
    X = df[ALL_FEATURE_COLUMNS]
    y = df["adoption_outcome"].values

    # 3. Train/Test Split (80/20, fixed seed, no data leakage)
    X_train, X_test, y_train, y_test, idx_train, idx_test = train_test_split(
        X, y, df.index, test_size=0.20, random_state=RANDOM_STATE
    )
    df_test = df.loc[idx_test].copy()

    # 4. Construct Scikit-Learn Pipeline
    preprocessor = build_preprocessor()
    model = GradientBoostingRegressor(
        n_estimators=150,
        learning_rate=0.07,
        max_depth=4,
        subsample=1.0,
        random_state=RANDOM_STATE,
    )

    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("regressor", model),
    ])

    # 5. Fit Pipeline solely on training split
    print("Training GradientBoostingRegressor pipeline...")
    pipeline.fit(X_train, y_train)

    # 6. Evaluate on test split
    y_pred_test = pipeline.predict(X_test)
    metrics = evaluate_ranking_performance(y_test, y_pred_test, df_eval=df_test, k=3)

    report = generate_evaluation_report(metrics)
    print("\n" + report + "\n")

    # 7. Serialize Artifacts
    for out_path in model_output_paths:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(pipeline, out_path)
        print(f"Saved model artifact to: {out_path}")

    return pipeline, metrics


def generate_and_train():
    """Compatibility alias for backend callers."""
    pipeline, _ = train_model()
    return pipeline


if __name__ == "__main__":
    train_model()
