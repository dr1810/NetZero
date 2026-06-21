# test_predict.py

from ml.predictor import predict_loads
result = predict_loads([
    0.98,
    514.5,
    294.0,
    110.25,
    7.0,
    2,
    0.25,
    3
])

print(result)