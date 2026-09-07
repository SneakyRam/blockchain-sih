from typing import Any, Dict, List
import math

class MLRiskModel:
    """
    Simulated implementation of the SIH Blockchain Risk XGBoost model
    using the feature importance extracted from SIH_Blockchain_Risk_Model.ipynb.
    
    Feature Importance weights from the trained model:
    - size: 0.293475
    - num_output_addresses: 0.272161
    - num_input_addresses: 0.062296
    - fees: 0.060158
    - out_BTC_total: 0.037600
    - total_BTC: 0.036410
    """
    
    def __init__(self):
        self.model_name = "ellipticpp_bitcoin_behavior_xgboost"
        self.version = "1.0"
        
    def predict_risk(self, transactions: List[Dict[str, Any]]) -> float:
        """
        Calculates a final ML risk score between 0 and 100 based on transaction features.
        """
        if not transactions:
            return 0.0
            
        # Aggregate features across recent transactions for the entity
        total_size = sum(int(tx.get("size") or 0) for tx in transactions)
        total_inputs = sum(len(tx.get("inputs") or []) for tx in transactions)
        total_outputs = sum(len(tx.get("outputs") or []) for tx in transactions)
        
        # In a real deployed model, this would be `model.predict_proba(X)`
        # Here we use a heuristic based on the XGBoost feature importance
        
        risk_score = 0.0
        
        # 1. Size is the most important feature (0.293)
        # Exceptionally large transaction sizes correlate with illicit shuffling
        if total_size > 10000:
            risk_score += 35.0
        elif total_size > 2000:
            risk_score += 15.0
            
        # 2. Number of output addresses (0.272)
        # High fan-out indicates peeling chains or mixers
        if total_outputs > 50:
            risk_score += 30.0
        elif total_outputs > 20:
            risk_score += 15.0
            
        # 3. Number of input addresses (0.062)
        # High fan-in indicates consolidation of illicit funds
        if total_inputs > 50:
            risk_score += 15.0
        elif total_inputs > 10:
            risk_score += 5.0
            
        # Normalize and apply sigmoid-like scaling to make it behave like a probability
        normalized = min(100.0, risk_score)
        
        # Base ML risk is slightly elevated if there's any complex transaction structure
        return max(5.0, normalized)

ml_risk_model = MLRiskModel()
