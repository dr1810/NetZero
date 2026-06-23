from typing import Tuple, Dict
from ml.predictor import predict_loads


def run_thermodynamic_inference(profile) -> Tuple[float, float]:
    """Uses the trained PyTorch model to predict heating and cooling loads from building features."""
    try:
        features = [
            profile.relative_compactness,
            profile.surface_area,
            profile.wall_area,
            profile.roof_area,
            profile.overall_height,
            float(profile.orientation),
            profile.glazing_area,
            float(profile.glazing_area_distribution),
        ]

        predictions = predict_loads(features)

        heating_load = predictions.get("heating_load", 0.0)
        cooling_load = predictions.get("cooling_load", 0.0)

        return round(heating_load, 2), round(cooling_load, 2)

    except Exception as e:
        # Keep inference failures non-fatal for the API
        print("ML inference error:", e)
        return 0.0, 0.0


def generate_mock_schedule() -> Dict[str, str]:
    """MVP carbon-aware schedule generator (placeholder for ML model B integration)"""
    return {
        "00:00-06:00": "LOW",
        "06:00-10:00": "MEDIUM",
        "10:00-16:00": "HIGH",
        "16:00-20:00": "MEDIUM",
        "20:00-24:00": "LOW",
    }
