import pandas as pd
import torch
import joblib

from sklearn.preprocessing import StandardScaler

from model import EnergyPredictor


print("Loading dataset...")

df = pd.read_excel(
    "dataset/ENB2012_data.xlsx"
)

X = df.iloc[:, :8].values
y = df.iloc[:, 8:10].values


scaler = StandardScaler()

X = scaler.fit_transform(X)

joblib.dump(
    scaler,
    "scaler.pkl"
)


device = torch.device(
    "mps"
    if torch.backends.mps.is_available()
    else "cpu"
)

print("Using device:", device)


X = torch.tensor(
    X,
    dtype=torch.float32
).to(device)

y = torch.tensor(
    y,
    dtype=torch.float32
).to(device)


model = EnergyPredictor().to(device)

loss_fn = torch.nn.MSELoss()

optimizer = torch.optim.Adam(
    model.parameters(),
    lr=0.001
)


print("Training started...")

for epoch in range(1000):

    predictions = model(X)

    loss = loss_fn(
        predictions,
        y
    )

    optimizer.zero_grad()

    loss.backward()

    optimizer.step()

    if epoch % 100 == 0:
        print(
            f"Epoch {epoch}: Loss = {loss.item():.4f}"
        )


model.eval()

with torch.no_grad():

    predictions = model(X)

    mse = loss_fn(
        predictions,
        y
    )

print("\nFinal MSE:", mse.item())


torch.save(
    model.cpu().state_dict(),
    "model.pt"
)

print("\nModel saved to model.pt")
print("Scaler saved to scaler.pkl")