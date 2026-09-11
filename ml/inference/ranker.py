"""
ML Recommendation Ranker and Public Scoring Interface.

Exposes the unified recommendation interface:
    score(facility_profile, leak_points, candidate_interventions) -> List[Dict[str, Any]]

Guarantees:
- In-process scikit-learn GradientBoostingRegressor inference
- Zero raw model internals exposed
- Deterministic threshold-based explanation flags
- Automatic and transparent fallback to rule_based_scorer on ANY failure
- Identical JSON response contract for both ML and Fallback modes
"""

import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
import joblib
import numpy as np
import pandas as pd

from ml.data.intervention_library import get_intervention_library, Intervention
from ml.pipeline.rule_based_scorer import (
    score_candidates as rule_based_score_candidates,
    compute_explanation_flags,
    SIZE_BUDGETS,
)
from ml.pipeline.preprocessor import ALL_FEATURE_COLUMNS

logger = logging.getLogger(__name__)

# Global cached model instance to avoid per-request disk reads
_CACHED_MODEL: Optional[Any] = None
_CACHED_MODEL_PATH: Optional[str] = None


def get_model(model_path: Optional[str] = None) -> Optional[Any]:
    """
    Safely retrieves or loads the trained model pipeline.
    """
    global _CACHED_MODEL, _CACHED_MODEL_PATH

    if model_path is not None and model_path != _CACHED_MODEL_PATH:
        _CACHED_MODEL = None

    if _CACHED_MODEL is not None:
        return _CACHED_MODEL

    # Search locations
    root = Path(__file__).resolve().parent.parent.parent
    if model_path:
        possible_paths = [Path(model_path)]
    else:
        possible_paths = [
            root / "ml" / "models" / "recommender_v1.joblib",
            root / "models" / "recommender_v1.joblib",
        ]

    for p in possible_paths:
        if p.exists() and p.is_file():
            try:
                loaded = joblib.load(p)
                _CACHED_MODEL = loaded
                _CACHED_MODEL_PATH = str(p)
                logger.info("Successfully loaded ML model from: %s", p)
                return _CACHED_MODEL
            except Exception as e:
                logger.warning("Failed loading model from %s: %s", p, e)

    logger.warning("No valid model file found in search paths: %s", [str(p) for p in possible_paths])
    return None


def score(
    facility_profile: Dict[str, Any],
    leak_points: List[Dict[str, Any]],
    candidate_interventions: Optional[List[Any]] = None,
    model_path: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Unified public inference entry point for recommendations.

    Parameters:
        facility_profile: Dict containing at least:
            - industry: str (e.g. "plastic", "textile", "food")
            - facility_size: str ("small", "medium", "large")
        leak_points: List of dicts representing leak points, each containing:
            - category: str ("energy", "materials", "waste")
            - contribution_pct: float (e.g. 0.43 or 43.0)
            - leak_id / name (optional)
        candidate_interventions: Optional list of Intervention objects or dicts.
            If None, candidate interventions are retrieved and filtered from the InterventionLibrary.
        model_path: Optional path override to the .joblib artifact.

    Returns:
        List of ranked recommendations sorted by score descending:
        [
            {
                "intervention_id": "INT-001",
                "score": 91.0,
                "score_source": "ml",  # or "rule_based" if fallback occurred
                "explanation_flags": ["High emission contribution", ...]
            }, ...
        ]
    """
    # Safe validation of minimal inputs
    if not facility_profile or not leak_points:
        return []

    industry = str(facility_profile.get("industry", "plastic")).strip().lower()
    facility_size = str(facility_profile.get("facility_size", "medium")).strip().lower()
    budget = SIZE_BUDGETS.get(facility_size, SIZE_BUDGETS["medium"])

    # Attempt ML scoring
    try:
        model = get_model(model_path)
        if model is None:
            logger.info("ML model unavailable; using rule-based fallback.")
            return rule_based_score_candidates(
                facility_profile=facility_profile,
                leak_points=leak_points,
                candidate_interventions=candidate_interventions,
            )

        library = get_intervention_library()
        feature_rows: List[Dict[str, Any]] = []
        meta_items: List[Dict[str, Any]] = []

        for lp in leak_points:
            leak_cat = str(lp.get("category", "energy")).strip().lower()
            leak_contrib = float(lp.get("contribution_pct", lp.get("leak_contribution", 0.25)))
            if leak_contrib > 1.0:
                leak_contrib /= 100.0

            # Gather candidate interventions
            if candidate_interventions is not None and len(candidate_interventions) > 0:
                candidates = candidate_interventions
            else:
                candidates = library.filter_candidates(industry=industry, leak_category=leak_cat)

            for cand in candidates:
                if isinstance(cand, dict):
                    int_id = str(cand["intervention_id"]).strip()
                    int_name = str(cand.get("name", "")).strip()
                    int_cat = str(cand.get("category", leak_cat)).strip().lower()
                    cost = float(cand.get("estimated_cost", 25000.0))
                    reduction = float(cand.get("expected_co2_reduction", 8.0))
                    difficulty = str(cand.get("implementation_difficulty", "medium")).strip().lower()
                    payback = float(cand.get("payback_period_years", 2.0))
                    app_ind = cand.get("applicable_industries", [industry])
                    app_leak = cand.get("applicable_leak_types", [leak_cat])
                else:
                    int_id = cand.intervention_id
                    int_name = cand.name
                    int_cat = cand.category.strip().lower()
                    cost = cand.estimated_cost
                    reduction = cand.expected_co2_reduction
                    difficulty = cand.implementation_difficulty.strip().lower()
                    payback = cand.payback_period_years
                    app_ind = cand.applicable_industries
                    app_leak = cand.applicable_leak_types

                # Strict eligibility gating:
                ind_fit = any(industry in i.lower() or i.lower() in industry for i in app_ind)
                leak_fit = any(leak_cat in lt.lower() or lt.lower() in leak_cat for lt in app_leak)

                if not (ind_fit and leak_fit):
                    continue

                # Build model input feature row
                f_row = {
                    "industry": industry,
                    "facility_size": facility_size,
                    "leak_category": leak_cat,
                    "intervention_category": int_cat,
                    "implementation_difficulty": difficulty,
                    "leak_contribution": leak_contrib,
                    "intervention_cost": cost,
                    "expected_CO2_reduction": reduction,
                    "industry_fit": ind_fit,
                }
                feature_rows.append(f_row)

                # Store metadata for explanation flags
                flags = compute_explanation_flags(
                    leak_contribution_pct=leak_contrib,
                    intervention_cost=cost,
                    budget=budget,
                    expected_co2_reduction=reduction,
                    implementation_difficulty=difficulty,
                    industry_fit=ind_fit,
                    payback_years=payback,
                )

                meta_items.append({
                    "intervention_id": int_id,
                    "name": int_name,
                    "category": int_cat,
                    "target_leak_category": leak_cat,
                    "explanation_flags": flags,
                })

        if not feature_rows:
            return []

        # Predict with ML pipeline
        X_df = pd.DataFrame(feature_rows)[ALL_FEATURE_COLUMNS]
        preds = model.predict(X_df)

        results = []
        for i, pred_val in enumerate(preds):
            score_val = round(float(np.clip(pred_val, 1.0, 99.0)), 1)
            item_meta = meta_items[i]
            results.append({
                "intervention_id": item_meta["intervention_id"],
                "name": item_meta["name"],
                "category": item_meta["category"],
                "target_leak_category": item_meta["target_leak_category"],
                "score": score_val,
                "score_source": "ml",
                "explanation_flags": item_meta["explanation_flags"],
            })

        # Deduplicate keeping the highest score per intervention
        deduped: Dict[str, Dict[str, Any]] = {}
        for r in results:
            iid = r["intervention_id"]
            if iid not in deduped or r["score"] > deduped[iid]["score"]:
                deduped[iid] = r

        ranked = sorted(deduped.values(), key=lambda x: x["score"], reverse=True)
        return ranked

    except Exception as e:
        logger.error("ML recommendation scoring failed with exception: %s. Falling back to rule-based scorer.", e)
        return rule_based_score_candidates(
            facility_profile=facility_profile,
            leak_points=leak_points,
            candidate_interventions=candidate_interventions,
        )
