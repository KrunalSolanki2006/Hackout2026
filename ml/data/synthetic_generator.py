"""
Synthetic Dataset Generator for Recommendation / Ranking Model.

Creates a reproducible tabular dataset based on:
- Facility profiles (industry, facility_size)
- Leak points (leak_category, leak_contribution)
- Candidate interventions (category, cost, CO2 reduction, difficulty, industry_fit)
- Target label: adoption_outcome (0-100 continuous suitability score)

IMPORTANT DISCLAIMER:
The target label represents a synthetic/curated proxy suitability score created
specifically for the HackOut 2026 prototype, blending domain rule logic with controlled
variation. It does NOT represent empirical real-world adoption history.
"""

from pathlib import Path
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd

from ml.data.intervention_library import get_intervention_library, CURATED_INTERVENTIONS
from ml.pipeline.rule_based_scorer import calculate_rule_score

RANDOM_SEED = 42


def generate_synthetic_dataset(
    num_variations_per_intervention: int = 40,
    seed: int = RANDOM_SEED,
    output_path: Optional[Path] = None,
) -> pd.DataFrame:
    """
    Generates reproducible synthetic training rows.
    """
    rng = np.random.default_rng(seed)

    industries = ["plastic", "textile", "food"]
    sizes = ["small", "medium", "large"]
    leak_categories = ["energy", "materials", "waste"]

    rows: List[Dict[str, Any]] = []

    for item in CURATED_INTERVENTIONS:
        for _ in range(num_variations_per_intervention):
            # Pick an applicable industry (or occasionally an edge-case test)
            if rng.random() < 0.90:
                industry = rng.choice(item.applicable_industries)
            else:
                industry = rng.choice(industries)

            # Facility size
            facility_size = rng.choice(sizes)

            # Leak category
            if rng.random() < 0.90:
                leak_cat = rng.choice(item.applicable_leak_types)
            else:
                leak_cat = rng.choice(leak_categories)

            # Leak contribution between 5% and 65%
            leak_contribution = round(float(rng.uniform(0.08, 0.60)), 3)

            # Controlled variation around baseline intervention parameters (+/- 15%)
            cost_var = rng.uniform(0.85, 1.15)
            red_var = rng.uniform(0.85, 1.15)

            intervention_cost = round(item.estimated_cost * cost_var, 0)
            expected_co2_reduction = round(item.expected_co2_reduction * red_var, 2)
            implementation_difficulty = item.implementation_difficulty

            # Industry fit boolean
            ind_fit = (industry in item.applicable_industries) and (leak_cat in item.applicable_leak_types)

            # Base rule score
            base_score = calculate_rule_score(
                facility_size=facility_size,
                leak_contribution_pct=leak_contribution,
                intervention_cost=intervention_cost,
                expected_co2_reduction=expected_co2_reduction,
                implementation_difficulty=implementation_difficulty,
                industry_fit=ind_fit,
            )

            # Controlled Gaussian noise (sigma=2.5) for synthetic learning variance
            noise = rng.normal(0.0, 2.5)
            adoption_outcome = float(np.clip(base_score + noise, 1.0, 99.0))
            adoption_outcome = round(adoption_outcome, 1)

            row = {
                "industry": industry,
                "facility_size": facility_size,
                "leak_category": leak_cat,
                "leak_contribution": leak_contribution,
                "intervention_id": item.intervention_id,
                "intervention_category": item.category,
                "intervention_cost": intervention_cost,
                "expected_CO2_reduction": expected_co2_reduction,
                "implementation_difficulty": implementation_difficulty,
                "industry_fit": ind_fit,
                "adoption_outcome": adoption_outcome,
            }
            rows.append(row)

    df = pd.DataFrame(rows)

    # Deduplicate if exact rows collide
    df = df.drop_duplicates(subset=[
        "industry", "facility_size", "leak_category", "intervention_id",
        "intervention_cost", "expected_CO2_reduction"
    ])

    if output_path is None:
        output_path = Path(__file__).resolve().parent / "training_dataset.csv"

    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False, encoding="utf-8")
    return df


if __name__ == "__main__":
    df_data = generate_synthetic_dataset()
    print(f"Generated {len(df_data)} training samples saved to ml/data/training_dataset.csv")
    print(df_data.head())
