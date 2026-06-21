import torch
import pandas as pd
import joblib
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)

from model import EnergyPredictor


print("Loading dataset...")

df = pd.read_excel(
    "dataset/ENB2012_data.xlsx"
)

X = df.iloc[:, :8].values
y = df.iloc[:, 8:10].values

# Same split used during training
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

scaler = joblib.load(
    "scaler.pkl"
)

X_test = scaler.transform(
    X_test
)

X_test = torch.tensor(
    X_test,
    dtype=torch.float32
)

model = EnergyPredictor()

model.load_state_dict(
    torch.load(
        "model.pt",
        map_location="cpu"
    )
)

model.eval()

with torch.no_grad():
    predictions = model(
        X_test
    )

predictions = predictions.numpy()

mae = mean_absolute_error(
    y_test,
    predictions
)

mse = mean_squared_error(
    y_test,
    predictions
)

rmse = np.sqrt(mse)

r2 = r2_score(
    y_test,
    predictions
)

print("\n========== MODEL EVALUATION ==========")
print(f"MAE  : {mae:.4f}")
print(f"RMSE : {rmse:.4f}")
print(f"R²   : {r2:.4f}")
print("======================================")