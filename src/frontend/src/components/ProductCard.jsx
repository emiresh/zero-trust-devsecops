import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Leaf, ShoppingCart } from 'lucide-react';

const ProductCard = ({ product }) => {
  const handleBuyNow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!product.inStock) {
      alert('This product is currently out of stock');
      return;
    }

    // Redirect to payment gateway with product details
    const paymentData = {
      productId: product.id,
      productName: product.name,
      amount: product.price,
      currency: 'LKR',
      farmerName: product.farmerName,
      farmerMobile: product.farmerMobile,
      quantity: product.quantity,
      unit: product.unit
    };

    // Store payment data in localStorage for the payment page
    localStorage.setItem('paymentData', JSON.stringify(paymentData));
    
    // Navigate to payment page
    window.location.href = `/payment?productId=${product.id}`;
  };

  return (
    <div className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {product.organic && (
            <div className="absolute top-3 left-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
              <Leaf className="h-3 w-3" />
              <span>Organic</span>
            </div>
          )}
          <div className="absolute top-3 right-3 bg-white bg-opacity-90 backdrop-blur-sm px-2 py-1 rounded-lg">
            <span className="text-lg font-bold text-green-600">LKR {product.price}</span>
            <span className="text-sm text-gray-600">/{product.unit}</span>
          </div>
        </div>
      </Link>
      
      <div className="p-4">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-semibold text-lg text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
            {product.name}
          </h3>
          
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {product.description}
          </p>
        </Link>
        
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-500">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{product.farmerName} • {product.farmerLocation}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="h-4 w-4 mr-1" />
              <span>Harvested {new Date(product.harvestDate).toLocaleDateString()}</span>
            </div>
            
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-700">{product.quantity} {product.unit}</span>
              {product.inStock ? (
                <span className="ml-2 w-2 h-2 bg-green-500 rounded-full"></span>
              ) : (
                <span className="ml-2 text-xs text-red-500">Out of Stock</span>
              )}
            </div>
          </div>

          {/* Buy Now Button */}
          <div className="pt-3 border-t border-gray-100">
            <button
              onClick={handleBuyNow}
              disabled={!product.inStock}
              className={`w-full flex items-center justify-center py-2.5 px-4 rounded-lg font-medium transition-all duration-200 ${
                product.inStock
                  ? 'bg-green-500 text-white hover:bg-green-600 hover:shadow-lg transform hover:-translate-y-0.5'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {product.inStock ? 'Buy Now' : 'Out of Stock'}
            </button>
            
            {product.farmerMobile && product.inStock && (
              <p className="text-xs text-gray-500 text-center mt-2">
                📞 Contact: {product.farmerMobile}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;