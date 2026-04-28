"""
Smart Price Comparison - ML Model Training
Gradient Boosting model for predicting the best platform for each product
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
import pickle
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 60)
print("SMART PRICE COMPARISON - ML MODEL TRAINING")
print("=" * 60)

# ===== 1. Load and prepare data =====
print("\n[1] Loading data...")
try:
    csv_path = os.path.join(os.path.dirname(__file__), '../../data/final_price_comparison.csv')
    df = pd.read_csv(csv_path)
    print(f"✓ Data loaded: {df.shape[0]} rows, {df.shape[1]} columns")
except FileNotFoundError:
    print("❌ Dataset not found! Make sure final_price_comparison.csv is in /data folder")
    sys.exit(1)

# ===== 2. Feature engineering =====
print("\n[2] Creating features...")
# Pivot to get price by platform
price_matrix = df.pivot_table(
    index='product_id',
    columns='platform',
    values='price',
    aggfunc='first'
).fillna(0)

print(f"✓ Price matrix shape: {price_matrix.shape}")
print(f"  Platforms: {list(price_matrix.columns)}")

# Create features
features = price_matrix.copy()
features['min_price'] = price_matrix.min(axis=1)
features['max_price'] = price_matrix.max(axis=1)
features['price_range'] = features['max_price'] - features['min_price']
features['avg_price'] = price_matrix.mean(axis=1)
features['std_price'] = price_matrix.std(axis=1).fillna(0)

# Price differences from minimum
platforms = ['Amazon', 'Flipkart', 'Myntra', 'Ajio']
for platform in platforms:
    if platform in price_matrix.columns:
        features[f'diff_{platform}'] = price_matrix[platform] - features['min_price']

# Target: best platform (lowest price)
best_platform_idx = price_matrix.idxmin(axis=1)
y = best_platform_idx.map(lambda x: x if isinstance(x, str) else platforms[x] if isinstance(x, int) else 'Unknown')

# Handle any unknown platforms
y = y[y != 'Unknown']
features = features.loc[y.index]

print(f"✓ Features created: {features.shape[1]} features, {features.shape[0]} samples")
print(f"  Target distribution:\n{y.value_counts()}")

# ===== 3. Train-Test Split =====
print("\n[3] Splitting data (80% train, 20% test)...")
X_train, X_test, y_train, y_test = train_test_split(
    features, y, 
    test_size=0.2, 
    random_state=42, 
    stratify=y
)

print(f"✓ Training set: {X_train.shape[0]} samples")
print(f"✓ Test set: {X_test.shape[0]} samples")

# ===== 4. Train Gradient Boosting Model =====
print("\n[4] Training Gradient Boosting Classifier...")
print("  Parameters:")
print("    - n_estimators: 100")
print("    - learning_rate: 0.1")
print("    - max_depth: 5")
print("    - random_state: 42")

gb_model = GradientBoostingClassifier(
    n_estimators=100,
    learning_rate=0.1,
    max_depth=5,
    random_state=42,
    verbose=1
)

gb_model.fit(X_train, y_train)
print("✓ Model trained successfully!")

# ===== 5. Evaluate Model =====
print("\n[5] Model Evaluation")
print("-" * 60)

y_pred_train = gb_model.predict(X_train)
y_pred_test = gb_model.predict(X_test)

train_acc = accuracy_score(y_train, y_pred_train)
test_acc = accuracy_score(y_test, y_pred_test)
precision = precision_score(y_test, y_pred_test, average='weighted', zero_division=0)
recall = recall_score(y_test, y_pred_test, average='weighted', zero_division=0)
f1 = f1_score(y_test, y_pred_test, average='weighted', zero_division=0)

print(f"TRAINING ACCURACY:  {train_acc:.4f} ({train_acc*100:.2f}%)")
print(f"TEST ACCURACY:      {test_acc:.4f} ({test_acc*100:.2f}%)")
print(f"PRECISION:          {precision:.4f}")
print(f"RECALL:             {recall:.4f}")
print(f"F1-SCORE:           {f1:.4f}")
print("-" * 60)

print("\nConfusion Matrix (Test Set):")
cm = confusion_matrix(y_test, y_pred_test)
print(cm)

# ===== 6. Feature Importance =====
print("\n[6] Feature Importance (Top 10)")
print("-" * 60)
feature_importance = pd.DataFrame({
    'feature': features.columns,
    'importance': gb_model.feature_importances_
}).sort_values('importance', ascending=False)

for idx, row in feature_importance.head(10).iterrows():
    print(f"  {row['feature']:20s} : {row['importance']:.4f}")

# ===== 7. Save Model =====
print("\n[7] Saving model...")
model_dir = os.path.dirname(__file__)
model_path = os.path.join(model_dir, 'gradient_boosting_model.pkl')

with open(model_path, 'wb') as f:
    pickle.dump(gb_model, f)

features_path = os.path.join(model_dir, 'features_info.pkl')
with open(features_path, 'wb') as f:
    pickle.dump({
        'feature_names': list(features.columns),
        'platforms': platforms,
        'column_order': list(price_matrix.columns)
    }, f)

print(f"✓ Model saved to: {model_path}")
print(f"✓ Features info saved to: {features_path}")

# ===== 8. Summary =====
print("\n" + "=" * 60)
print("TRAINING COMPLETE!")
print("=" * 60)
print(f"\n✓ Model Accuracy: {test_acc*100:.2f}%")
print(f"✓ Samples trained: {X_train.shape[0]}")
print(f"✓ Features used: {X_train.shape[1]}")
print(f"✓ Output classes: {y.nunique()} platforms")
print(f"\nModel ready for predictions!")
print("=" * 60)
