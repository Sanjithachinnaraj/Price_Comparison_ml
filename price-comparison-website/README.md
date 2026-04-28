# Smart Price Comparison Website

A full-stack web application that compares prices across multiple e-commerce platforms (Amazon, Flipkart, Myntra, Ajio) with machine learning-powered price predictions using gradient boosting.

## Features

- 🔍 Search products across multiple platforms
- 💰 Compare prices in real-time
- 🤖 ML-powered price predictions (Gradient Boosting)
- 🔗 Direct links to purchase on each platform
- 📊 Best price recommendation
- 💻 Responsive web interface
- 🚀 Express.js backend with Python ML integration

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js + Express
- **ML Model**: Python (scikit-learn - Gradient Boosting)
- **Database**: CSV data storage
- **Deployment**: Localhost / GitHub

## Installation

### 1. Clone/Download the project
```bash
cd price-comparison-website
```

### 2. Install Node.js dependencies
```bash
npm install
```

### 3. Set up Python environment
```bash
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux
pip install pandas scikit-learn numpy
```

### 4. Train the ML model
```bash
npm run train
```

### 5. Start the server
```bash
npm start
```

The website will be available at `http://localhost:3000`

## Project Structure

```
price-comparison-website/
├── backend/
│   ├── server.js           # Express server
│   ├── model/
│   │   ├── train_model.py  # ML model training
│   │   └── predict.py      # Prediction utilities
│   └── routes/
│       └── products.js     # API endpoints
├── frontend/
│   ├── index.html          # Main page
│   ├── style.css           # Styling
│   └── script.js           # Frontend logic
├── data/
│   └── final_price_comparison.csv  # Dataset
└── package.json
```

## Usage

1. **Search for products**: Enter product name in search box
2. **View prices**: Compare prices across all platforms
3. **Get recommendation**: See the best platform with lowest price
4. **Shop now**: Click platform link to purchase directly

## ML Model Details

The gradient boosting model predicts the best platform for each product based on:
- Price differences across platforms
- Product category
- Brand information
- Historical price trends

Model Accuracy: See console output after training

## Files

- `final_price_comparison.csv`: Main dataset with multi-platform prices
- `train_model.py`: Trains gradient boosting classifier
- `server.js`: Express backend with API routes
- `index.html`: Frontend search interface

## API Endpoints

- `GET /api/search?q=<product_name>` - Search products
- `GET /api/product/<id>` - Get product details
- `GET /api/prices/<id>` - Get all prices for a product

## GitHub

Push to GitHub for version control:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

## Notes

- Dataset contains ~5000+ products
- Supports 4 platforms: Amazon, Flipkart, Myntra, Ajio
- Dynamic URLs generated for direct shopping links
- Model trained with cross-validation

---
Enjoy smart price comparison!
