# Machine Learning Service - Passenger Capacity Prediction

## Overview

This directory contains the XGBoost-based machine learning model for predicting bus passenger occupancy based on route, stop, time, day, and weather conditions.

## Files

- `ml_service.py` - Flask REST API service for model predictions
- `xgb_bus_model.joblib` - Trained XGBoost model file
- `datasetGen.py` - Synthetic dataset generator
- `synthetic_bus_data.csv` - Training dataset
- `.ipynb` - Jupyter notebook for model training and evaluation
- `requirements.txt` - Python package dependencies
- `venv/` - Python virtual environment (created after setup)

## Quick Start

### 1. Set Up Environment

```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate     # On Windows

# Install dependencies
pip install -r requirements.txt
```

### 2. Verify Model File

Make sure `xgb_bus_model.joblib` exists. If not, train the model:

```bash
# Generate training data
python datasetGen.py

# Then open and run the .ipynb notebook to train the model
```

### 3. Start the ML Service

```bash
python ml_service.py
```

The service will start on **http://localhost:5001**

## API Endpoints

### Health Check

```bash
GET http://localhost:5001/health
```

Returns service status and confirms model is loaded.

**Response:**

```json
{
  "status": "healthy",
  "model_loaded": true,
  "service": "ML Prediction Service"
}
```

### Prediction

```bash
POST http://localhost:5001/predict
Content-Type: application/json

{
  "route_id": "A",
  "stop_id": 5,
  "day_of_week": "Monday",
  "time_of_day": "8-10",
  "weather": "rain"
}
```

**Response:**

```json
{
  "predicted_occupancy": 42.3,
  "route_id": "A",
  "stop_id": 5,
  "day_of_week": "Monday",
  "time_of_day": "8-10",
  "weather": "rain",
  "confidence": 0.92
}
```

### Model Information

```bash
GET http://localhost:5001/model-info
```

Returns details about the loaded model and its features.

## Input Parameters

| Parameter     | Type    | Description              | Example Values                |
| ------------- | ------- | ------------------------ | ----------------------------- |
| `route_id`    | string  | Bus route identifier     | "A", "B"                      |
| `stop_id`     | integer | Bus stop number          | 1, 2, 3, ..., 10              |
| `day_of_week` | string  | Day of the week          | "Monday", "Tuesday", "Sunday" |
| `time_of_day` | string  | Time bin (2-hour blocks) | "8-10", "16-18"               |
| `weather`     | string  | Weather condition        | "rain", "not_rain"            |

## Time Bins

- `6-8` - Early morning
- `8-10` - Morning peak ⭐
- `10-12` - Late morning
- `12-14` - Afternoon
- `14-16` - Mid afternoon
- `16-18` - Evening peak ⭐
- `18-20` - Evening
- `20-22` - Night

## Model Details

### Algorithm

**XGBoost Regressor** with the following configuration:

- Objective: `reg:squarederror`
- Max depth: 5
- Learning rate: 0.05
- N estimators: 1000
- Subsample: 0.8
- Early stopping: 50 rounds

### Features

The model uses one-hot encoding for categorical features:

- Route ID (A, B)
- Day of week (7 days)
- Time of day (8 time bins)
- Weather (2 conditions)
- Stop ID (numerical)

Total: **16 encoded features**

### Performance Metrics

- **MAE (Mean Absolute Error)**: ~2-3 passengers
- **R² Score**: ~0.92 (92% variance explained)

## Training New Model

### 1. Generate Fresh Dataset

```bash
python datasetGen.py
```

This creates `synthetic_bus_data.csv` with ~100,000 records.

### 2. Train Model

Open the Jupyter notebook (`.ipynb`) and run all cells:

```bash
jupyter notebook .ipynb
```

Or use VS Code to open and run the notebook.

### 3. Verify Model File

After training, `xgb_bus_model.joblib` will be saved automatically.

### 4. Test New Model

Restart the ML service to load the new model:

```bash
python ml_service.py
```

## Integration with Node.js Backend

The Python ML service runs independently and communicates with the Node.js backend via HTTP:

```
┌─────────────────┐         HTTP         ┌─────────────────┐
│   Node.js API   │ ─────────────────────▶│  Python ML API  │
│   Port 3000     │ ◀───────────────────── │   Port 5001     │
└─────────────────┘       Predictions      └─────────────────┘
                                                    │
                                                    │ Loads
                                                    ▼
                                          ┌──────────────────┐
                                          │ XGBoost Model    │
                                          │ (.joblib file)   │
                                          └──────────────────┘
```

For full integration details, see `ML_INTEGRATION.md` in the project root.

## Testing

### Test Health

```bash
curl http://localhost:5001/health
```

### Test Prediction

```bash
curl -X POST http://localhost:5001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "route_id": "A",
    "stop_id": 3,
    "day_of_week": "Wednesday",
    "time_of_day": "16-18",
    "weather": "not_rain"
  }'
```

### Test via Node.js

```bash
# From project root
./test-ml-integration.sh
```

## Troubleshooting

### "Model file not found"

**Solution:** Run the training notebook to generate `xgb_bus_model.joblib`

### "Import errors" when starting service

**Solution:**

```bash
source venv/bin/activate
pip install -r requirements.txt
```

### "Port 5001 already in use"

**Solution:** Stop the existing service or change the port in `ml_service.py`

```bash
# Find and kill process on port 5001
lsof -ti:5001 | xargs kill -9
```

### Low prediction accuracy

**Solutions:**

1. Retrain with more data
2. Adjust hyperparameters in training notebook
3. Add more features (holidays, events, temperature)
4. Collect real-world data instead of synthetic

### Service crashes on large requests

**Solution:** Add request size limits and timeout configurations

## Production Considerations

### Security

- Add API key authentication
- Rate limiting
- Input validation and sanitization
- HTTPS/TLS encryption

### Performance

- Use gunicorn or uwsgi instead of Flask dev server
- Enable model caching
- Implement request queuing
- Load balancing with multiple instances

### Monitoring

- Add logging (file + cloud)
- Health check endpoint monitoring
- Performance metrics (response time, throughput)
- Error tracking

### Deployment

```bash
# Using gunicorn (production WSGI server)
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 ml_service:app
```

## Dependencies

See `requirements.txt` for full list:

- Flask 3.0.0
- flask-cors 4.0.0
- pandas 2.1.4
- numpy 1.26.2
- scikit-learn 1.3.2
- xgboost 2.0.3
- joblib 1.3.2

## Model Retraining Schedule

Recommended retraining frequency:

- **Weekly:** If collecting real-time data
- **Monthly:** For stable patterns
- **On-demand:** When accuracy drops or patterns change

## Support

For issues or questions:

1. Check service logs
2. Verify model file exists and is recent
3. Test with known good inputs
4. Review integration documentation

---

**Last Updated:** 2025-01-16  
**Model Version:** 1.0  
**Python Version:** 3.9+
