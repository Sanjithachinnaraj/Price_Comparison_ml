const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { PythonShell } = require('python-shell');

const app = express();
const PORT = 3000;

const PLATFORM_SEARCH_URLS = {
  Amazon: 'https://www.amazon.com/search?q=',
  Flipkart: 'https://www.flipkart.com/search?q=',
  Myntra: 'https://www.myntra.com/search?q=',
  Ajio: 'https://www.ajio.com/search?q='
};

function buildPlatformSearchLink(platform, productName) {
  const base = PLATFORM_SEARCH_URLS[platform] || PLATFORM_SEARCH_URLS.Amazon;
  
  // Clean product name: remove special chars that cause 404 errors
  let cleaned = (productName || '')
    .trim()
    .replace(/[\u00A0\u2000-\u200F]/g, ' ')  // Replace non-breaking/special spaces with regular space
    .replace(/['"]/g, '')                     // Remove quotes
    .replace(/[|<>]/g, '')                    // Remove invalid URL chars
    .replace(/\s+/g, ' ')                     // Collapse multiple spaces
    .trim();
  
  const query = encodeURIComponent(cleaned).replace(/%20/g, '+');
  return `${base}${query}`;
}

function normalizeProductLink(link, platform, productName) {
  // Always generate search URLs for consistent, working links
  // CSV contains malformed URLs that cause 404 errors
  return buildPlatformSearchLink(platform, productName);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ===== Data Service =====
class ProductService {
  constructor(csvPath) {
    this.csvPath = csvPath;
    this.products = [];
    this.loadData();
  }

  loadData() {
    if (!fs.existsSync(this.csvPath)) {
      console.warn(`⚠️  CSV not found at ${this.csvPath}`);
      return;
    }

    fs.createReadStream(this.csvPath)
      .pipe(csv())
      .on('data', (row) => {
        this.products.push(row);
      })
      .on('end', () => {
        console.log(`✓ Loaded ${this.products.length} products`);
      });
  }

  search(query, limit = 20) {
    const q = query.toLowerCase().trim();
    const results = {};

    this.products.forEach(product => {
      const productName = (product.product_name || '').toLowerCase();
      const productId = product.product_id || '';

      if (productName.includes(q)) {
        if (!results[productId]) {
          results[productId] = {
            product_id: productId,
            product_name: product.product_name || 'Unknown',
            brand: product.brand || 'Unknown',
            prices: {}
          };
        }

        const platform = product.platform || 'Unknown';
        const price = parseFloat(product.price) || 0;
        const link = normalizeProductLink(product.product_link, platform, product.product_name || '');

        results[productId].prices[platform] = {
          price: price,
          link: link
        };
      }
    });

    return Object.values(results)
      .sort((a, b) => a.product_id - b.product_id)
      .slice(0, limit);
  }

  getProduct(productId) {
    const productData = {
      product_id: productId,
      product_name: '',
      brand: '',
      prices: {}
    };

    this.products.forEach(product => {
      if (String(product.product_id) === String(productId)) {
        productData.product_name = product.product_name || 'Unknown';
        productData.brand = product.brand || 'Unknown';

        const platform = product.platform || 'Unknown';
        const price = parseFloat(product.price) || 0;
        const link = normalizeProductLink(product.product_link, platform, product.product_name || '');

        productData.prices[platform] = {
          price: price,
          link: link
        };
      }
    });

    return Object.keys(productData.prices).length > 0 ? productData : null;
  }

  getBestDeal(pricesDict) {
    if (!pricesDict || !pricesDict.prices) return null;

    let minPrice = Infinity;
    let bestPlatform = null;
    let bestLink = null;

    for (const [platform, data] of Object.entries(pricesDict.prices)) {
      const price = data.price || Infinity;
      if (price < minPrice) {
        minPrice = price;
        bestPlatform = platform;
        bestLink = data.link || '';
      }
    }

    return {
      platform: bestPlatform,
      price: minPrice,
      link: bestLink
    };
  }
}

// ===== Initialize =====
const dataPath = path.join(__dirname, '../data/final_price_comparison.csv');
const productService = new ProductService(dataPath);

// ===== API Routes =====

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Search products
app.get('/api/search', (req, res) => {
  const query = req.query.q || '';

  if (!query || query.length < 2) {
    return res.json({
      success: false,
      message: 'Query must be at least 2 characters',
      results: []
    });
  }

  const results = productService.search(query, 20);

  res.json({
    success: true,
    query: query,
    count: results.length,
    results: results
  });
});

// Get product details
app.get('/api/product/:id', (req, res) => {
  const productId = req.params.id;
  const product = productService.getProduct(productId);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  const bestDeal = productService.getBestDeal(product);

  res.json({
    success: true,
    product: product,
    best_deal: bestDeal,
    platforms: Object.keys(product.prices)
  });
});

// Get best deal for prices
app.post('/api/best-deal', (req, res) => {
  const prices = req.body.prices || {};

  try {
    // Call Python prediction service
    const pyshell = new PythonShell(
      path.join(__dirname, 'model/predict.py'),
      {
        args: [JSON.stringify(prices)],
        scriptPath: path.join(__dirname, 'model')
      }
    );

    let prediction = null;

    pyshell.on('message', (message) => {
      prediction = JSON.parse(message);
    });

    pyshell.end((err) => {
      if (err) {
        // Fallback: simple minimum
        let minPrice = Infinity;
        let bestPlatform = 'N/A';
        for (const [platform, price] of Object.entries(prices)) {
          if (price < minPrice) {
            minPrice = price;
            bestPlatform = platform;
          }
        }

        return res.json({
          best_platform: bestPlatform,
          price: minPrice,
          confidence: 0,
          method: 'fallback'
        });
      }

      res.json({
        ...prediction,
        method: 'ml_model'
      });
    });
  } catch (err) {
    console.error('Prediction error:', err);
    res.json({
      best_platform: 'N/A',
      confidence: 0,
      error: err.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    server: 'Smart Price Comparison API',
    version: '1.0.0',
    loaded_products: productService.products.length
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 SMART PRICE COMPARISON SERVER');
  console.log('='.repeat(60));
  console.log(`✓ Server running on: http://localhost:${PORT}`);
  console.log(`✓ Frontend: http://localhost:${PORT}`);
  console.log(`✓ API base: http://localhost:${PORT}/api`);
  console.log('='.repeat(60));
  console.log('\nAvailable endpoints:');
  console.log('  GET  /api/search?q=<product>');
  console.log('  GET  /api/product/<id>');
  console.log('  POST /api/best-deal');
  console.log('  GET  /api/health');
  console.log('='.repeat(60) + '\n');
});

module.exports = app;
