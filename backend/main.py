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
df = pd.read_csv('Mumbai_RRR_Extended.csv') 

# --- 3. SIMULATION ENGINE LOGIC ---
class RRRSimulator:
    def __init__(self, ml_model, dataset):
        self.model = ml_model
        self.df = dataset
        self.reg_cap = 30000 # Govt Cap on Registration Fee
        
    def calculate_revenue(self, rrr, area):
        """Calculates total state revenue: Stamp Duty (6%) + Capped Reg Fee (1%)"""
        valuation = rrr * area
        stamp_duty = valuation * 0.06 
        reg_fee = min(valuation * 0.01, self.reg_cap)
        return stamp_duty + reg_fee

    def run_scenario(self, region_name, hike_pct):
        region_df = self.df[self.df['region'] == region_name].copy()
        if region_df.empty:
            return None

        # A. BASELINE (CURRENT REVENUE)
        total_baseline = region_df.apply(
            lambda x: self.calculate_revenue(x['final_rrr_per_sqm'], x['area_sqm']), axis=1
        ).sum()

        # B. DYNAMIC ELASTICITY INFERENCE
        # We infer sensitivity by comparing Market Prediction to the Government Base
        avg_actual = region_df['final_rrr_per_sqm'].mean()
        X_val = region_df[['region_encoded', 'area_sqm', 'status_Under Construction', 'age_Resale', 'floor_level', 'bhk']]
        avg_market = self.model.predict(X_val).mean()
        
        # Calculate the "Buffer" (Leakage Ratio)
        leakage_ratio = (avg_market - avg_actual) / avg_actual

        # Determine Base Sensitivity by Price Tier
        if avg_actual > 250000:
            base_elasticity = 0.3  # Luxury
        elif avg_actual > 120000:
            base_elasticity = 0.7  # Mid-range
        else:
            base_elasticity = 1.1  # Affordable

        # DYNAMIC ADJUSTMENT: High leakage regions have higher hike tolerance
        # (If leakage is 152%, elasticity drops, allowing higher hikes)
        elasticity = base_elasticity / (1 + leakage_ratio)
        elasticity = max(0.1, elasticity) # Floor to prevent zero-sensitivity

        # Calculate Volume Multiplier (Market Resilience)
        volume_multiplier = max(0, 1 - (abs(hike_pct/100) * elasticity))
        
        # C. SIMULATED REVENUE
        region_df['sim_base'] = region_df['base_rrr_per_sqm'] * (1 + hike_pct/100)
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

simulator = RRRSimulator(model, df)

# --- 4. ENDPOINTS ---

@app.get("/predict_rrr")
@app.get("/predict_rrr")
def predict(region_id: int, area: float, uc: bool, resale: bool, floor: int, bhk: int):
    # 1. Prepare Features for ML Model
    features = pd.DataFrame([[
        region_id, area, 1 if uc else 0, 1 if resale else 0, floor, bhk
    ]], columns=['region_encoded', 'area_sqm', 'status_Under Construction', 'age_Resale', 'floor_level', 'bhk'])

    # 2. Get ML Prediction (Rate per Sqm)
    prediction_rate = model.predict(features)[0]
    
    # 3. Financial Calculations
    property_value = prediction_rate * area
    stamp_duty = property_value * 0.06
    # Maharashtra Law: 1% capped at ₹30,000
    registration_fee = min(property_value * 0.01, 30000)
    total_acquisition_cost = property_value + stamp_duty + registration_fee

    # 4. Valuation Attribution (ML Feature Importance Inference)
    regional_base = prediction_rate * 0.78
    structural_premium = prediction_rate * 0.22

    return {
        "predicted_rrr": round(prediction_rate, 2),
        "total_acquisition_cost": round(total_acquisition_cost, 2),
        "rate_breakdown": {
            "regional_base": round(regional_base, 2),
            "structural_premium": round(structural_premium, 2)
        },
        "breakdown": [
            {
                "label": "Agreement Value", 
                "value": round(property_value, 2),
                "subtext": f"Incl. ₹{round(regional_base, 0)}/sqm Location Base"
            },
            {
                "label": "Stamp Duty (6%)", 
                "value": round(stamp_duty, 2),
                "subtext": "Govt Revenue (Stamp + Metro Cess)"
            },
            {
                "label": "Registration Fee", 
                "value": round(registration_fee, 2),
                "subtext": "Capped at ₹30,000 for Mumbai"
            }
        ]
    }

@app.get("/regions")
def get_regions():
    return {"regions": sorted(df['region'].unique().tolist())}

@app.get("/simulate/{region_name}")
def simulate_endpoint(region_name: str, hike: float):
    res = simulator.run_scenario(region_name, hike)
    curve = []
    # Generate points for the Recharts graph (-5% to 30%)
    for h in range(-5, 31, 2):
        s = simulator.run_scenario(region_name, h)
        curve.append({"hike": h, "revenue": s['simulated_rev_cr']})
    
    return {
        **res, 
        "status": "STABLE" if res['volume_loss_pct'] < 10 else "HIGH RISK", 
        "curve": curve
    }

@app.get("/optimize/{region_name}")
def optimize_endpoint(region_name: str):
    """AI Optimizer: Searches for the peak revenue while staying 'STABLE'."""
    best_hike = 0.0
    max_rev = -1.0
    
    for h in np.arange(0, 25.5, 0.5):
        res = simulator.run_scenario(region_name, h)
        if res['volume_loss_pct'] <= 10.0: # Our Safety Boundary
            if res['simulated_rev_cr'] > max_rev:
                max_rev = res['simulated_rev_cr']
                best_hike = h
                
    return {"optimal_hike": float(round(best_hike, 2))}

@app.get("/heatmap_data")
def get_heatmap_data():
    """Calculates Inconsistency Score (Leakage) for every region."""
    heatmap_results = []
    for region in df['region'].unique():
        region_df = df[df['region'] == region]
        avg_actual = region_df['final_rrr_per_sqm'].mean()
        
        X = region_df[['region_encoded', 'area_sqm', 'status_Under Construction', 'age_Resale', 'floor_level', 'bhk']]
        avg_predicted = model.predict(X).mean()
        
        leakage = ((avg_predicted - avg_actual) / avg_actual) * 100
        
        heatmap_results.append({
            "region": region,
            "actual": round(avg_actual, 2),
            "predicted": round(avg_predicted, 2),
            "leakage_score": round(leakage, 2)
        })
        
    return sorted(heatmap_results, key=lambda x: x['leakage_score'], reverse=True)