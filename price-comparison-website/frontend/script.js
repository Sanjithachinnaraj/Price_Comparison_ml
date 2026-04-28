// ===== State Management =====
const state = {
    products: [],
    lastSearch: '',
    currentPage: 1,
    selectedProduct: null
};

// ===== DOM Elements =====
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const clearBtn = document.getElementById('clearBtn');
const resultsContainer = document.getElementById('resultsContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const noResults = document.getElementById('noResults');
const errorMessage = document.getElementById('errorMessage');
const suggestionsDropdown = document.getElementById('suggestions');
const productModal = document.getElementById('productModal');
const modalBody = document.getElementById('modalBody');
const modalClose = document.querySelector('.modal-close');
const productCount = document.getElementById('productCount');

// ===== Event Listeners =====
searchBtn.addEventListener('click', handleSearch);
clearBtn.addEventListener('click', handleClear);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});
searchInput.addEventListener('input', handleSearchInput);
modalClose.addEventListener('click', closeModal);

// ===== Main Functions =====

async function handleSearch() {
    const query = searchInput.value.trim();

    if (!query || query.length < 2) {
        showError('Please enter at least 2 characters');
        return;
    }

    state.lastSearch = query;
    showLoading(true);
    hideError();
    hideSuggestions();

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (!data.success || data.results.length === 0) {
            showNoResults();
            showLoading(false);
            return;
        }

        state.products = data.results;
        displayResults(state.products);
        showLoading(false);
    } catch (error) {
        console.error('Search error:', error);
        showError('Error fetching results. Please try again.');
        showLoading(false);
    }
}

async function handleSearchInput(e) {
    const query = e.target.value.trim();

    if (query.length < 2) {
        hideSuggestions();
        return;
    }

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            displaySuggestions(data.results);
        } else {
            hideSuggestions();
        }
    } catch (error) {
        console.error('Suggestions error:', error);
        hideSuggestions();
    }
}

function displaySuggestions(products) {
    const uniqueNames = [...new Set(products.map(p => p.product_name))];
    suggestionsDropdown.innerHTML = uniqueNames
        .slice(0, 5)
        .map(name => `
            <div class="suggestion-item" data-name="${name}">
                ${highlightMatch(name, searchInput.value)}
            </div>
        `)
        .join('');

    document.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', (e) => {
            searchInput.value = e.target.textContent;
            handleSearch();
        });
    });

    showSuggestions();
}

function highlightMatch(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
}

function displayResults(products) {
    if (products.length === 0) {
        showNoResults();
        return;
    }

    noResults.style.display = 'none';
    resultsContainer.innerHTML = products
        .map(product => createProductCard(product))
        .join('');

    // Add event listeners
    document.querySelectorAll('.details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.dataset.productId;
            showProductDetails(productId);
        });
    });

    // Add dynamic link handlers
    document.querySelectorAll('.buy-link').forEach(link => {
        link.addEventListener('click', (e) => {
            // Links will open in new tab due to target="_blank"
            console.log('Navigating to:', e.target.href);
        });
    });
}

function createProductCard(product) {
    const prices = product.prices || {};
    const minPrice = Math.min(...Object.values(prices).map(p => p.price || Infinity));
    const bestPlatform = Object.entries(prices)
        .find(([p, d]) => d.price === minPrice)?.[0] || 'N/A';

    const priceRows = Object.entries(prices)
        .map(([platform, data]) => `
            <div class="price-row">
                <div class="platform-col">${platform}</div>
                <div class="price-col">₹${data.price?.toFixed(2) || 'N/A'}</div>
                <div class="link-col">
                    <a href="${data.link}" target="_blank" rel="noopener noreferrer" class="buy-link" title="Buy on ${platform}">Shop</a>
                </div>
            </div>
        `)
        .join('');

    return `
        <div class="product-card">
            <div class="product-card-header">
                <div class="product-name">${product.product_name || 'Unknown'}</div>
                <div class="product-brand">Brand: ${product.brand || 'N/A'}</div>
                <div class="product-id">ID: ${product.product_id}</div>
            </div>
            <div class="product-card-body">
                ${priceRows}
            </div>
            <div class="product-card-footer">
                <div class="best-deal">
                    <span class="best-deal-platform">🏆 ${bestPlatform}</span>
                    <span class="best-deal-price">₹${minPrice?.toFixed(2) || 'N/A'}</span>
                </div>
                <button class="details-btn" data-product-id="${product.product_id}">
                    📊 View Details
                </button>
            </div>
        </div>
    `;
}

async function showProductDetails(productId) {
    try {
        const response = await fetch(`/api/product/${productId}`);
        const data = await response.json();

        if (!data.success) {
            showError('Could not load product details');
            return;
        }

        const product = data.product;
        const bestDeal = data.best_deal;
        const prices = product.prices || {};

        const detailsHtml = `
            <h2>${product.product_name}</h2>
            <p style="color: #6b7280; margin-bottom: 1.5rem;">
                <strong>Brand:</strong> ${product.brand}
                | <strong>ID:</strong> ${product.product_id}
            </p>

            <div style="background-color: #fef3c7; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                <p style="margin: 0.5rem 0;">
                    <strong>💰 Best Deal:</strong> <span style="color: #92400e; font-size: 1.2rem; font-weight: 700;">
                        ₹${bestDeal.price?.toFixed(2) || 'N/A'}
                    </span>
                </p>
                <p style="margin: 0.5rem 0;">
                    <strong>🛒 Platform:</strong> ${bestDeal.platform}
                </p>
            </div>

            <h3 style="margin-top: 2rem; margin-bottom: 1rem;">Prices Across Platforms</h3>
            ${Object.entries(prices)
                .map(([platform, data]) => `
                    <div class="modal-detail-row">
                        <div>
                            <div class="modal-platform">${platform}</div>
                            <div class="modal-price">₹${data.price?.toFixed(2) || 'N/A'}</div>
                        </div>
                        <a href="${data.link}" target="_blank" rel="noopener noreferrer" class="modal-buy-btn">
                            Buy Now →
                        </a>
                    </div>
                `)
                .join('')}

            <div style="margin-top: 2rem; padding: 1rem; background-color: #f3f4f6; border-radius: 8px;">
                <p style="font-size: 0.9rem; color: #6b7280; margin: 0;">
                    💡 <strong>Tip:</strong> Click "Buy Now" to purchase directly from the store's website.
                </p>
            </div>
        `;

        modalBody.innerHTML = detailsHtml;
        openModal();
    } catch (error) {
        console.error('Details error:', error);
        showError('Error loading product details');
    }
}

function handleClear() {
    searchInput.value = '';
    resultsContainer.innerHTML = '';
    state.products = [];
    state.lastSearch = '';
    noResults.style.display = 'none';
    hideError();
    hideSuggestions();
    searchInput.focus();
}

// ===== UI Helper Functions =====

function showLoading(show) {
    loadingSpinner.style.display = show ? 'block' : 'none';
}

function showNoResults() {
    noResults.style.display = 'block';
    resultsContainer.innerHTML = '';
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}

function showSuggestions() {
    suggestionsDropdown.classList.add('active');
}

function hideSuggestions() {
    suggestionsDropdown.classList.remove('active');
}

function openModal() {
    productModal.classList.add('active');
}

function closeModal() {
    productModal.classList.remove('active');
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === productModal) {
        closeModal();
    }
});

// ===== Initialize =====
function initializePage() {
    console.log('🚀 Smart Price Comparison Page Loaded');
    console.log('Available platforms: Amazon, Flipkart, Myntra, Ajio');

    // Fetch product count from health check
    fetch('/api/health')
        .then(r => r.json())
        .then(data => {
            productCount.textContent = `${data.loaded_products.toLocaleString()} products`;
        })
        .catch(err => {
            console.error('Health check error:', err);
            productCount.textContent = '5000+';
        });

    // Focus search input
    searchInput.focus();
}

// Start when page loads
document.addEventListener('DOMContentLoaded', initializePage);

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
    }
    // Escape to close modal
    if (e.key === 'Escape') {
        closeModal();
    }
});

// ===== Console Messages =====
console.log('%c💰 Smart Price Comparison', 'font-size: 20px; color: #2563eb; font-weight: bold;');
console.log('%cPowered by Node.js + Python (Gradient Boosting ML)', 'font-size: 12px; color: #6b7280;');
console.log('%cKeyboard shortcuts:', 'font-weight: bold;');
console.log('  Ctrl/Cmd + K → Focus search');
console.log('  Escape → Close modal');
