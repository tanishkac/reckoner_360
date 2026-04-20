from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd
import numpy as np

app = FastAPI()

# --- 1. MIDDLEWARE SETUP ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. LOAD ML MODEL & DATASET ---
# Ensure these files are in the same directory as main.py
model = joblib.load('mumbai_rrr_policy_engine.pkl')
# Load your cleaned dataset for the simulation engine to run batch calculations
df = pd.read_csv('Mumbai_RRR_Extended.csv') 

# --- 3. SIMULATION ENGINE LOGIC ---
class RRRSimulator:
    def __init__(self, ml_model, dataset):
        self.model = ml_model
        self.df = dataset
        self.metro_cess = 0.01 
        self.reg_cap = 30000
        
    def calculate_revenue(self, rrr, area):
        """Calculates Stamp Duty + Registration Fee per transaction."""
        valuation = rrr * area
        # 6% total tax (5% Base + 1% Metro Cess)
        stamp_duty = valuation * 0.06 
        # 1% Registration fee capped at 30,000 INR
        reg_fee = min(valuation * 0.01, self.reg_cap)
        return stamp_duty + reg_fee

    def run_scenario(self, region_name, hike_pct):
        # Filter data for the specific region
        region_df = self.df[self.df['region'] == region_name].copy()
        if region_df.empty:
            return None

        # A. BASELINE (CURRENT REVENUE)
        total_baseline = region_df.apply(
            lambda x: self.calculate_revenue(x['final_rrr_per_sqm'], x['area_sqm']), axis=1
        ).sum()

        # B. SIMULATED REVENUE
        # Determine Market Sensitivity (Elasticity)
        avg_base = region_df['base_rrr_per_sqm'].mean()
        if avg_base > 250000:
            elasticity = 0.3  # Luxury: Low sensitivity
        elif avg_base > 120000:
            elasticity = 0.7  # Mid-range: Moderate sensitivity
        else:
            elasticity = 1.1  # Affordable: High sensitivity

        # Calculate Volume Multiplier (How many transactions survive the hike)
        # volume_loss = hike% * elasticity
        volume_multiplier = max(0, 1 - (abs(hike_pct/100) * elasticity))
        
        # Apply the hike to the base rate and predict new final RRR using ML model
        region_df['sim_base'] = region_df['base_rrr_per_sqm'] * (1 + hike_pct/100)
        
        # Prepare features for the ML model (must match your 6 trained features)
        X_sim = region_df[['region_encoded', 'area_sqm', 'status_Under Construction', 'age_Resale', 'floor_level', 'bhk']]
        region_df['new_final_rrr'] = self.model.predict(X_sim)
        
        total_simulated = region_df.apply(
            lambda x: self.calculate_revenue(x['new_final_rrr'], x['area_sqm']), axis=1
        ).sum() * volume_multiplier

        return {
            "baseline_rev_cr": round(total_baseline / 10**7, 2),
            "simulated_rev_cr": round(total_simulated / 10**7, 2),
            "revenue_change_pct": round(((total_simulated/total_baseline)-1)*100, 2),
            "volume_loss_pct": round((1 - volume_multiplier)*100, 2)
        }

# Instantiate the engine
simulator = RRRSimulator(model, df)

# --- 4. ENDPOINTS ---

@app.get("/predict_rrr")
def predict(region_id: int, area: float, uc: bool, resale: bool, floor: int, bhk: int):
    # Prepare features for the Predictor Page
    features = pd.DataFrame([[
        region_id, area, 1 if uc else 0, 1 if resale else 0, floor, bhk
    ]], columns=['region_encoded', 'area_sqm', 'status_Under Construction', 'age_Resale', 'floor_level', 'bhk'])

    prediction = model.predict(features)[0]
    
    # Send results + valuation breakdown for the blue progress bars
    return {
        "predicted_rrr": round(prediction, 2),
        "low_bound": round(prediction * 0.893, 2), # 10.7% margin
        "high_bound": round(prediction * 1.107, 2),
        "breakdown": [
            {"label": "Regional Base", "value": round(prediction * 0.75, 2)},
            {"label": "Structural Premium", "value": round(prediction * 0.25, 2)}
        ]
    }

@app.get("/regions")
def get_regions():
    """Returns a list of unique regions for the dropdowns."""
    return {"regions": sorted(df['region'].unique().tolist())}

@app.get("/simulate/{region_name}")
def simulate_endpoint(region_name: str, hike: float):
    """Calculates the revenue impact for a specific hike on the slider."""
    res = simulator.run_scenario(region_name, hike)
    
    # Generate the Laffer Curve data for the Recharts graph
    curve = []
    for h in range(-5, 21, 2):
        s = simulator.run_scenario(region_name, h)
        curve.append({"hike": h, "revenue": s['simulated_rev_cr']})
    
    return {
        **res, 
        "status": "STABLE" if res['volume_loss_pct'] < 10 else "HIGH RISK", 
        "curve": curve
    }

@app.get("/optimize/{region_name}")
def optimize_endpoint(region_name: str):
    """AI Optimizer: Finds the highest revenue hike that stays 'STABLE'."""
    best_hike = 0.0
    max_rev = -1.0
    
    # Search from 0% to 20% hike in 0.5% steps
    for h in np.arange(0, 20.5, 0.5):
        res = simulator.run_scenario(region_name, h)
        
        # Stability check: Volume loss must be under 10%
        if res['volume_loss_pct'] <= 10.0:
            if res['simulated_rev_cr'] > max_rev:
                max_rev = res['simulated_rev_cr']
                best_hike = h
                
    return {"optimal_hike": float(round(best_hike, 2))}