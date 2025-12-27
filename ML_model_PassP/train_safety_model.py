import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import os

# Constants (Localized for Sri Lanka - Ashok Leyland Viking / Generally used buses)
# Source reference: Average specs for commercial buses in South Asia
MASS_BUS = 9500     # kg (Chassis + Heavy steel body common in SL)
MASS_PAX = 62       # kg (Average Sri Lankan adult weight mix)
H_EMPTY = 1.15      # m  (Center of Gravity when empty - High floor bus)
H_SEAT = 1.35       # m  (CoG of seated pax)
H_STAND = 2.15      # m  (CoG of standing pax - Floor height + body CoG)
TRACK_WIDTH = 1.95  # m  (Effective track width for stability)
G = 9.81            # m/s²
FRICTION_DRY = 0.65 # Avg friction for worn asphalt (common)
FRICTION_WET = 0.35 # Reduced friction during heavy monsoon rains
REACTION_TIME = 1.8 # s (Conservative estimate for typical traffic/driver fatigue)

def generate_synthetic_data(n_samples=5000):
    print("Generating synthetic physics data...")
    
    np.random.seed(42)
    
    # Random Inputs
    n_seated = np.random.randint(0, 55, n_samples)
    n_standing = np.random.randint(0, 40, n_samples)
    speed_kmh = np.random.uniform(20, 80, n_samples)
    radius_m = np.random.uniform(10, 200, n_samples) # Curve radius
    is_wet = np.random.choice([0, 1], n_samples) # 0=Dry, 1=Wet
    gradient_deg = np.random.uniform(-5, 5, n_samples) # Slope
    
    data = []
    
    for i in range(n_samples):
        # Physics Calculations (Ground Truth)
        
        # 1. Mass & CoG
        m_seated = n_seated[i] * MASS_PAX
        m_standing = n_standing[i] * MASS_PAX
        m_total = MASS_BUS + m_seated + m_standing
        
        h_cog = ((MASS_BUS * H_EMPTY) + (m_seated * H_SEAT) + (m_standing * H_STAND)) / m_total
        
        # 2. Rollover Threshold (SSF)
        ssf = TRACK_WIDTH / (2 * h_cog)
        
        # 3. Lateral Acceleration
        v_ms = speed_kmh[i] / 3.6
        lat_accel = (v_ms ** 2) / radius_m[i]
        lat_accel_g = lat_accel / G
        
        # 4. Risk Score (Ratio of LatAccel to SSF)
        # > 0.5 is Warning, > 0.7 is Critical
        risk_score = lat_accel_g / ssf
        
        # 5. Stopping Distance
        friction = FRICTION_WET if is_wet[i] else FRICTION_DRY
        # Adjust friction for slope (simplified)
        eff_friction = friction + np.tan(np.radians(gradient_deg[i]))
        eff_friction = max(0.1, eff_friction) # Min friction
        
        d_reaction = v_ms * REACTION_TIME
        d_braking = (v_ms ** 2) / (2 * G * eff_friction)
        total_stopping_dist = d_reaction + d_braking
        
        data.append({
            'n_seated': float(n_seated[i]),
            'n_standing': float(n_standing[i]),
            'speed_kmh': float(speed_kmh[i]),
            'radius_m': float(radius_m[i]),
            'is_wet': float(is_wet[i]),
            'gradient_deg': float(gradient_deg[i]),
            'risk_score': float(risk_score),
            'stopping_dist': float(total_stopping_dist)
        })
        
    df = pd.DataFrame(data)
    # Drop any NaNs just in case
    df = df.dropna()
    return df

from sklearn.multioutput import MultiOutputRegressor

def train_model():
    df = generate_synthetic_data()
    
    # Features
    X = df[['n_seated', 'n_standing', 'speed_kmh', 'radius_m', 'is_wet', 'gradient_deg']]
    
    # Targets (Multi-output regression)
    y = df[['risk_score', 'stopping_dist']]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Multi-Output Random Forest...")
    # Wrap in MultiOutputRegressor to get separate estimators
    model = MultiOutputRegressor(RandomForestRegressor(n_estimators=100, random_state=42))
    model.fit(X_train, y_train)
    
    # Evaluate
    predictions = model.predict(X_test)
    mse = mean_squared_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)
    
    print(f"Model Trained. Overall MSE: {mse:.4f}, R2: {r2:.4f}")

    # Feature Importance Analysis per Target
    target_names = ['Rollover Risk', 'Stopping Distance']
    features = X.columns
    
    for i, target_name in enumerate(target_names):
        print(f"\n🔹 Feature Importance for {target_name}:")
        # Access the individual estimator for this target
        estimator = model.estimators_[i]
        importances = estimator.feature_importances_
        indices = np.argsort(importances)[::-1]
        
        for f in range(X.shape[1]):
            print(f"{f+1}. {features[indices[f]]:<15} {importances[indices[f]]:.4f}")
        
    # Save (Note: MultiOutputRegressor object behaves slightly differently, ensure loading handles it)
    joblib.dump(model, 'safety_model.joblib')
    print("\nModel saved to safety_model.joblib")

if __name__ == "__main__":
    train_model()
