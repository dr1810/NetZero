import torch
import joblib

from model import EnergyPredictor


device = torch.device("cpu")

model = EnergyPredictor()

model.load_state_dict(
    torch.load(
        "model.pt",
        map_location=device
    )
)

model.eval()


scaler = joblib.load(
    "scaler.pkl"
)


sample = [[
    0.98,
    514.5,
    294.0,
    110.25,
    7.0,
    2,
    0.0,
    0
]]

sample = scaler.transform(
    sample
)

sample = torch.tensor(
    sample,
    dtype=torch.float32
)

with torch.no_grad():

    prediction = model(
        sample
    )

heating_load = prediction[0][0].item()
cooling_load = prediction[0][1].item()

print(
    "Heating Load:",
    heating_load
)

print(
    "Cooling Load:",
    cooling_load
)