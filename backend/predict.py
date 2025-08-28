import joblib
import pandas as pd
from flask import Flask, request, jsonify

app = Flask(__name__)

# Load trained model
model = joblib.load("artifacts/burnout_model_multiclass (2).pkl")
