"""
Prediction utilities for the ML model
"""

import pickle
import pandas as pd
import numpy as np
import os

model_dir = os.path.dirname(__file__)

def load_model():
    """Load the trained gradient boosting model"""
    model_path = os.path.join(model_dir, 'gradient_boosting_model.pkl')
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found at {model_path}. Please run: npm run train")
    
    with open(model_path, 'rb') as f:
        model = pickle.load(f)
    return model

def load_features_info():
    """Load feature information"""
    features_path = os.path.join(model_dir, 'features_info.pkl')
    if not os.path.exists(features_path):
        raise FileNotFoundError(f"Features info not found at {features_path}")
    
    with open(features_path, 'rb') as f:
        info = pickle.load(f)
    return info

def predict_best_platform(prices_dict):
    """
    Predict best platform for a product
    
    Args:
        prices_dict: dict with keys like {'Amazon': 500, 'Flipkart': 520, 'Myntra': 480, 'Ajio': 510}
    
    Returns:
        dict with best platform and confidence
    """
    try:
        model = load_model()
        info = load_features_info()
        
        # Create feature vector
        platforms = info['platforms']
        
        # Initialize feature dict
        features_dict = {}
        
        # Get prices
        price_values = []
        for platform in platforms:
            price = float(prices_dict.get(platform, 0))
            features_dict[platform] = price
            price_values.append(price)
        
        price_values = np.array(price_values)
        
        # Calculate derived features
        features_dict['min_price'] = price_values.min()
        features_dict['max_price'] = price_values.max()
        features_dict['price_range'] = features_dict['max_price'] - features_dict['min_price']
        features_dict['avg_price'] = price_values.mean()
        features_dict['std_price'] = price_values.std()
        
        # Price differences
        for platform in platforms:
            features_dict[f'diff_{platform}'] = features_dict.get(platform, 0) - features_dict['min_price']
        
        # Create feature array in correct order
        X = np.array([features_dict.get(feat, 0) for feat in info['feature_names']]).reshape(1, -1)
        
        # Predict
        prediction = model.predict(X)[0]
        probabilities = model.predict_proba(X)[0]
        confidence = max(probabilities) * 100
        
        return {
            'best_platform': prediction,
            'confidence': confidence,
            'probabilities': {
                platforms[i]: float(prob) * 100 
                for i, prob in enumerate(probabilities)
            }
        }
    
    except Exception as e:
        print(f"Prediction error: {e}")
        # Fallback: simple minimum
        min_platform = min(prices_dict.items(), key=lambda x: x[1])[0]
        return {
            'best_platform': min_platform,
            'confidence': 0,
            'probabilities': {}
        }

if __name__ == "__main__":
    # Test
    test_prices = {
        'Amazon': 500,
        'Flipkart': 520,
        'Myntra': 480,
        'Ajio': 510
    }
    result = predict_best_platform(test_prices)
    print(f"Predicted best platform: {result}")
