"""
API routes for the price comparison service
"""

import csv
import os

class ProductService:
    def __init__(self, csv_path):
        self.csv_path = csv_path
        self.products = []
        self.load_data()
    
    def load_data(self):
        """Load products from CSV"""
        if not os.path.exists(self.csv_path):
            print(f"Warning: CSV file not found at {self.csv_path}")
            return
        
        with open(self.csv_path, 'r', encoding='utf-8', errors='ignore') as f:
            reader = csv.DictReader(f)
            for row in reader:
                self.products.append(row)
        
        print(f"Loaded {len(self.products)} products")
    
    def search(self, query, limit=10):
        """Search products by name"""
        query = query.lower().strip()
        results = {}
        
        for product in self.products:
            product_name = (product.get('product_name') or '').lower()
            product_id = product.get('product_id', '')
            
            if query in product_name:
                if product_id not in results:
                    results[product_id] = {
                        'product_id': product_id,
                        'product_name': product.get('product_name', 'Unknown'),
                        'brand': product.get('brand', 'Unknown'),
                        'prices': {}
                    }
                
                platform = product.get('platform', 'Unknown')
                price = product.get('price', '0')
                link = product.get('product_link', '')
                
                results[product_id]['prices'][platform] = {
                    'price': float(price) if price else 0,
                    'link': link
                }
        
        # Sort by product_id and limit
        sorted_results = sorted(results.values(), key=lambda x: x['product_id'])[:limit]
        
        return sorted_results
    
    def get_product(self, product_id):
        """Get all prices for a specific product"""
        product_data = {
            'product_id': product_id,
            'product_name': '',
            'brand': '',
            'prices': {}
        }
        
        for product in self.products:
            if str(product.get('product_id')) == str(product_id):
                product_data['product_name'] = product.get('product_name', 'Unknown')
                product_data['brand'] = product.get('brand', 'Unknown')
                
                platform = product.get('platform', 'Unknown')
                price = product.get('price', '0')
                link = product.get('product_link', '')
                
                product_data['prices'][platform] = {
                    'price': float(price) if price else 0,
                    'link': link
                }
        
        return product_data if product_data['prices'] else None
    
    def get_best_deal(self, prices_dict):
        """Get cheapest option"""
        if not prices_dict or not prices_dict.get('prices'):
            return None
        
        min_price = float('inf')
        best_platform = None
        best_link = None
        
        for platform, data in prices_dict.get('prices', {}).items():
            price = data.get('price', float('inf'))
            if price < min_price:
                min_price = price
                best_platform = platform
                best_link = data.get('link', '')
        
        return {
            'platform': best_platform,
            'price': min_price,
            'link': best_link
        }

# Init
if __name__ == "__main__":
    service = ProductService("../../../data/final_price_comparison.csv")
    results = service.search("nike")
    print(f"Found {len(results)} products")
