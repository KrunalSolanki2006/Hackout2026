import os
import json
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
import joblib

def generate_and_train():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    ml_dir = os.path.dirname(base_dir)
    
    possible_json_paths = [
        os.path.join(os.path.dirname(ml_dir), "datasets", "intervention_library", "interventions_v1.json"),
        os.path.join(ml_dir, "datasets", "intervention_library", "interventions_v1.json"),
        os.path.join(os.path.dirname(os.path.dirname(ml_dir)), "datasets", "intervention_library", "interventions_v1.json")
    ]
    interventions_path = None
    for p in possible_json_paths:
        if os.path.exists(p):
            interventions_path = p
            break

    models_dir = os.path.join(ml_dir, "models")
    os.makedirs(models_dir, exist_ok=True)
    model_output_path = os.path.join(models_dir, "recommender_v1.joblib")

    if not interventions_path:
        print(f"Interventions dataset not found.")
        return

    with open(interventions_path, "r") as f:
        interventions = json.load(f)

    industries = ["plastic", "textile", "food_processing"]
    data = []

    np.random.seed(42)

    for ind in industries:
        for intervention in interventions:
            is_ind_match = 1 if (ind in intervention.get("supported_industries", []) or "all" in intervention.get("supported_industries", [])) else 0
            
            for leak_pct in [0.0, 10.0, 25.0, 45.0, 60.0]:
                co2_max = intervention.get("estimated_co2_reduction_max", 15.0)
                cost_mid = (intervention.get("estimated_cost_min", 10000) + intervention.get("estimated_cost_max", 50000)) / 2.0
                payback = intervention.get("payback_period_months", 24)
                diff_val = {"low": 1, "medium": 2, "high": 3}.get(intervention.get("implementation_difficulty", "medium"), 2)

                base_score = 15.0 + (is_ind_match * 35.0) + (leak_pct * 0.45) + (co2_max * 0.5) - (payback * 0.2) + (3 - diff_val) * 2.0
                
                for _ in range(25):
                    noise = np.random.normal(0, 2.5)
                    score = min(100.0, max(10.0, base_score + noise))
                    data.append({
                        "is_ind_match": is_ind_match,
                        "leak_contribution_pct": leak_pct,
                        "co2_reduction_max": co2_max,
                        "cost_mid": cost_mid,
                        "payback_months": payback,
                        "difficulty_val": diff_val,
                        "target_score": score
                    })

    df = pd.DataFrame(data)
    X = df[["is_ind_match", "leak_contribution_pct", "co2_reduction_max", "cost_mid", "payback_months", "difficulty_val"]]
    y = df["target_score"]

    model = GradientBoostingRegressor(n_estimators=60, max_depth=3, learning_rate=0.1, random_state=42)
    model.fit(X, y)

    joblib.dump(model, model_output_path)
    print(f"Model successfully trained and saved to {model_output_path}")

if __name__ == "__main__":
    generate_and_train()
