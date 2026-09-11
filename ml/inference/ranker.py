"""
ML Recommendation Ranker and Public Scoring Interface.

Exposes:
1. score(facility_profile, leak_points, candidate_interventions) -> List[Dict[str, Any]]
   Matching ML_IMPLEMENTATION.md §16.
2. score_interventions(facility_industry, leak_points, interventions) -> List[Dict[str, Any]]
   Matching backend recommendation_engine.py expectations.

Guarantees:
- In-process scikit-learn GradientBoostingRegressor inference
- Zero raw model internals exposed
- Deterministic threshold-based explanation flags
- Automatic and transparent fallback to rule_based_scorer on ANY failure
- Identical JSON response contract for both ML and Fallback modes
"""

import os
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
import joblib
import numpy as np
import pandas as pd

from ml.data.intervention_library import get_intervention_library, Intervention
from ml.pipeline.rule_based_scorer import (
    score_candidates as rule_based_score_candidates,
    score_interventions_rule_based,
    compute_explanation_flags,
    SIZE_BUDGETS,
)
from ml.pipeline.preprocessor import ALL_FEATURE_COLUMNS

logger = logging.getLogger(__name__)

# Global cached model instance
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

    root = Path(__file__).resolve().parent.parent.parent
    if model_path:
        possible_paths = [Path(model_path)]
    else:
        possible_paths = [
            root / "ml" / "models" / "recommender_v1.joblib",
            root / "models" / "recommender_v1.joblib",
            root / "backend" / "ml" / "models" / "recommender_v1.joblib",
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


def load_ml_model(model_path: str = None) -> bool:
    """Compatibility function for backend."""
    return get_model(model_path) is not None


def score(
    facility_profile: Dict[str, Any],
    leak_points: List[Dict[str, Any]],
    candidate_interventions: Optional[List[Any]] = None,
    model_path: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Unified public inference entry point for recommendations.
    """
    if not facility_profile or not leak_points:
        return []

    industry = str(facility_profile.get("industry", "plastic")).strip().lower()
    facility_size = str(facility_profile.get("facility_size", "medium")).strip().lower()
    budget = SIZE_BUDGETS.get(facility_size, SIZE_BUDGETS["medium"])

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

                ind_fit = any(industry in i.lower() or i.lower() in industry for i in app_ind)
                leak_fit = any(leak_cat in lt.lower() or lt.lower() in leak_cat for lt in app_leak)

                if not (ind_fit and leak_fit):
                    continue

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

        deduped: Dict[str, Dict[str, Any]] = {}
        for r in results:
            iid = r["intervention_id"]
            if iid not in deduped or r["score"] > deduped[iid]["score"]:
                deduped[iid] = r

        ranked = sorted(deduped.values(), key=lambda x: x["score"], reverse=True)
        return ranked

    except Exception as e:
        logger.error("ML recommendation scoring failed: %s. Falling back to rule-based scorer.", e)
        return rule_based_score_candidates(
            facility_profile=facility_profile,
            leak_points=leak_points,
            candidate_interventions=candidate_interventions,
        )


def score_interventions(
    facility_industry: str,
    leak_points: List[Dict[str, Any]],
    interventions: List[Dict[str, Any]],
    model_path: str = None,
) -> List[Dict[str, Any]]:
    """
    Backend router-compatible scoring function for recommendation_engine.py.
    """
    try:
        model = get_model(model_path)
        if model is None:
            return score_interventions_rule_based(facility_industry, leak_points, interventions)

        leak_map = {}
        for lp in leak_points:
            ref = lp.get("subtype") or lp.get("name") or lp.get("leak_point_ref") or lp.get("category", "")
            pct = float(lp.get("contribution_pct", 0.0) or lp.get("pct", 0.0))
            if ref:
                leak_map[ref.lower()] = pct

        feature_rows = []
        for intervention in interventions:
            cat = intervention.get("category", "energy").lower()
            leak_cat = cat
            diff = str(intervention.get("implementation_difficulty", "medium")).lower()
            cost = float(intervention.get("estimated_cost_max", intervention.get("estimated_cost", 25000.0)))
            co2_red = float(intervention.get("estimated_co2_reduction_max", intervention.get("expected_co2_reduction", 10.0)))

            supported_ind = [ind.lower() for ind in intervention.get("supported_industries", intervention.get("applicable_industries", []))]
            is_ind_match = (facility_industry.lower() in supported_ind or "all" in supported_ind)

            applicable_leaks = intervention.get("applicable_leak_types", [cat])
            max_leak_pct = 0.25
            for l_ref in applicable_leaks:
                if l_ref.lower() in leak_map:
                    max_leak_pct = max(max_leak_pct, leak_map[l_ref.lower()] / (100.0 if leak_map[l_ref.lower()] > 1.0 else 1.0))

            feature_rows.append({
                "industry": facility_industry.lower(),
                "facility_size": "medium",
                "leak_category": leak_cat,
                "intervention_category": cat,
                "implementation_difficulty": diff,
                "leak_contribution": max_leak_pct,
                "intervention_cost": cost,
                "expected_CO2_reduction": co2_red,
                "industry_fit": is_ind_match,
            })

        X_df = pd.DataFrame(feature_rows)[ALL_FEATURE_COLUMNS]
        raw_scores = model.predict(X_df)

        results = []
        for idx, intervention in enumerate(interventions):
            score_val = int(round(min(100.0, max(10.0, float(raw_scores[idx])))))

            explanations = []
            supported_ind = [ind.lower() for ind in intervention.get("supported_industries", intervention.get("applicable_industries", []))]
            if facility_industry.lower() in supported_ind:
                explanations.append(f"Strong industry fit for {facility_industry.capitalize()} manufacturing")

            applicable_leaks = intervention.get("applicable_leak_types", [])
            matched_leak = None
            max_pct = 0.0
            for l_ref in applicable_leaks:
                if l_ref.lower() in leak_map and leak_map[l_ref.lower()] > max_pct:
                    max_pct = leak_map[l_ref.lower()]
                    matched_leak = l_ref

            if max_pct >= 25.0:
                explanations.append(f"High emission contribution from targeted leak point ({max_pct:.1f}%)")
            elif matched_leak:
                explanations.append(f"Directly targets identified leak point ({matched_leak})")

            co2_m = float(intervention.get("estimated_co2_reduction_max", 15.0))
            if co2_m >= 18.0:
                explanations.append(f"High CO2 reduction potential (up to {co2_m:.0f}%)")

            if not explanations:
                explanations = ["Ranked circular economy intervention via ML model"]

            results.append({
                "intervention": intervention,
                "score": score_val,
                "score_source": "ml",
                "estimated_cost_range": [
                    intervention.get("estimated_cost_min", 0),
                    intervention.get("estimated_cost_max", 0)
                ],
                "estimated_co2_reduction_range": [
                    intervention.get("estimated_co2_reduction_min", 0.0),
                    intervention.get("estimated_co2_reduction_max", 0.0)
                ],
                "payback_period_months": intervention.get("payback_period_months", 24),
                "explanation": explanations,
                "applicable_leak_point": matched_leak or (applicable_leaks[0] if applicable_leaks else "general")
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results

    except Exception as e:
        logger.error(f"Error during ML inference: {e}. Falling back to rule-based scorer.")
        return score_interventions_rule_based(facility_industry, leak_points, interventions)
