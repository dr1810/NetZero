import os
import torch
import joblib
import numpy as np

from .model import EnergyPredictor

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

_model = None
_scaler = None


def load_assets():
    global _model, _scaler

    if _model is None:
        model_path = os.path.join(BASE_DIR, "model.pt")
        scaler_path = os.path.join(BASE_DIR, "scaler.pkl")

        _scaler = joblib.load(scaler_path)

        _model = EnergyPredictor()
        _model.load_state_dict(
            torch.load(model_path, map_location=torch.device("cpu"))
        )
        _model.eval()

    return _model, _scaler


def predict_loads(features):
    model, scaler = load_assets()

    features = np.array(features).reshape(1, -1)
    scaled = scaler.transform(features)

    tensor = torch.tensor(scaled, dtype=torch.float32)

    with torch.no_grad():
        prediction = model(tensor)

    return {
        "heating_load": float(prediction[0][0].item()),
        "cooling_load": float(prediction[0][1].item())
    }