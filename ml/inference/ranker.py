import os
import logging
from typing import List, Dict, Any
import numpy as np
import pandas as pd
import joblib

try:
    from ml.pipeline.rule_based_scorer import score_interventions_rule_based
except ModuleNotFoundError:
    from backend.ml.pipeline.rule_based_scorer import score_interventions_rule_based

logger = logging.getLogger("ml.inference.ranker")

_MODEL = None

def load_ml_model(model_path: str = None) -> bool:
    global _MODEL
    if _MODEL is not None:
        return True
    
    if model_path is None or not os.path.exists(model_path):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        ml_dir = os.path.dirname(base_dir)
        possible_paths = [
            os.path.join(ml_dir, "models", "recommender_v1.joblib"),
            os.path.join(os.path.dirname(ml_dir), "ml", "models", "recommender_v1.joblib"),
            os.path.join(os.path.dirname(ml_dir), "backend", "ml", "models", "recommender_v1.joblib")
        ]
        for p in possible_paths:
            if os.path.exists(p):
                model_path = p
                break
    
    try:
        if model_path and os.path.exists(model_path):
            _MODEL = joblib.load(model_path)
            logger.info(f"Loaded ML recommendation model from {model_path}")
            return True
        else:
            logger.warning(f"ML model file not found at {model_path}. Will use rule-based fallback.")
            return False
    except Exception as e:
        logger.error(f"Error loading ML model: {e}. Will use rule-based fallback.")
        _MODEL = None
        return False

def score_interventions(
    facility_industry: str,
    leak_points: List[Dict[str, Any]],
    interventions: List[Dict[str, Any]],
    model_path: str = None
) -> List[Dict[str, Any]]:
    global _MODEL
    
    if _MODEL is None:
        load_ml_model(model_path)
        
    if _MODEL is None:
        return score_interventions_rule_based(facility_industry, leak_points, interventions)

    try:
        leak_map = {}
        for lp in leak_points:
            ref = lp.get("subtype") or lp.get("name") or lp.get("leak_point_ref")
            pct = float(lp.get("contribution_pct", 0.0) or lp.get("pct", 0.0))
            if ref:
                leak_map[ref.lower()] = pct

        results = []
        feature_rows = []

        for intervention in interventions:
            supported_ind = [ind.lower() for ind in intervention.get("supported_industries", [])]
            is_ind_match = 1 if (facility_industry.lower() in supported_ind or "all" in supported_ind) else 0

            applicable_leaks = intervention.get("applicable_leak_types", [])
            max_leak_pct = 0.0
            matched_leak_ref = None

            for leak_ref in applicable_leaks:
                leak_key = leak_ref.lower()
                if leak_key in leak_map:
                    if leak_map[leak_key] > max_leak_pct:
                        max_leak_pct = leak_map[leak_key]
                        matched_leak_ref = leak_ref

            if not matched_leak_ref and applicable_leaks:
                matched_leak_ref = applicable_leaks[0]

            co2_max = float(intervention.get("estimated_co2_reduction_max", 15.0))
            cost_mid = float((intervention.get("estimated_cost_min", 10000) + intervention.get("estimated_cost_max", 50000)) / 2.0)
            payback = float(intervention.get("payback_period_months", 24))
            diff_val = {"low": 1, "medium": 2, "high": 3}.get(str(intervention.get("implementation_difficulty", "medium")).lower(), 2)

            feature_rows.append([is_ind_match, max_leak_pct, co2_max, cost_mid, payback, diff_val])

        X = pd.DataFrame(feature_rows, columns=["is_ind_match", "leak_contribution_pct", "co2_reduction_max", "cost_mid", "payback_months", "difficulty_val"])
        raw_scores = _MODEL.predict(X)

        for idx, intervention in enumerate(interventions):
            score = int(round(min(100.0, max(10.0, float(raw_scores[idx])))))
            
            explanations = []
            supported_ind = [ind.lower() for ind in intervention.get("supported_industries", [])]
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
                "score": score,
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
