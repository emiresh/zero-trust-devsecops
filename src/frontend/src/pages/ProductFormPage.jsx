import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Calendar, Package, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const ProductFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Vegetables',
    image: '',
    inStock: true,
    isVisible: true,
    harvestDate: '',
    organic: false,
    quantity: '',
    unit: 'lbs'
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

  const categories = [
    'Vegetables',
    'Fruits',
    'Herbs',
    'Dairy & Eggs',
    'Meat & Poultry',
    'Grains & Cereals',
    'Pantry',
    'Flowers',
    'Other'
  ];

  const units = [
    'lbs', 'oz', 'kg', 'g', 'count', 'dozen', 'bunch', 'head', 'pint', 'quart', 'gallon', 'bag', 'box'
  ];

  // Sample images for different categories
  const sampleImages = {
    'Vegetables': [
      'https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1352199/pexels-photo-1352199.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/143133/pexels-photo-143133.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    'Fruits': [
      'https://images.pexels.com/photos/46174/strawberries-berries-fruit-freshness-46174.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/209439/pexels-photo-209439.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    'Dairy & Eggs': [
      'https://images.pexels.com/photos/162712/egg-white-food-protein-162712.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/236010/pexels-photo-236010.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    'Pantry': [
      'https://images.pexels.com/photos/316908/pexels-photo-316908.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=800'
    ]
  };

  useEffect(() => {
    if (isEditing) {
      loadProduct();
    } else {
      // Set default harvest date to today for new products
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        harvestDate: today,
        image: sampleImages['Vegetables'][0] // Default image
      }));
    }
  }, [id, isEditing]);

  const loadProduct = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      console.log('🔍 Loading product for editing:', id);
      const response = await fetch(`${API_URL}/products/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📥 Product response status:', response.status);

      if (response.ok) {
        const product = await response.json();
        console.log('✅ Product loaded:', product);
        
        setFormData({
          name: product.name || '',
          description: product.description || '',
          price: product.price ? product.price.toString() : '',
          category: product.category || 'Vegetables',
          image: product.image || '',
          inStock: product.inStock !== undefined ? product.inStock : true,
          isVisible: product.isVisible !== undefined ? product.isVisible : true,
          harvestDate: product.harvestDate ? product.harvestDate.split('T')[0] : '',
          organic: product.organic || false,
          quantity: product.quantity || '',
          unit: product.unit || 'lbs'
        });
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load product:', response.status, errorText);
        setMessage({ type: 'error', text: 'Product not found' });
        setTimeout(() => navigate('/farmer-dashboard'), 2000);
      }
    } catch (error) {
      console.error('❌ Failed to load product:', error);
      setMessage({ type: 'error', text: 'Failed to load product' });
      setTimeout(() => navigate('/farmer-dashboard'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear message when user starts typing
    if (message.text) setMessage({ type: '', text: '' });
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setFormData(prev => ({
      ...prev,
      category,
      // Auto-select a sample image for the category if no image is set or if using a sample image
      image: !prev.image || Object.values(sampleImages).flat().includes(prev.image) 
        ? (sampleImages[category] ? sampleImages[category][0] : prev.image)
        : prev.image
    }));
  };

  const selectSampleImage = (imageUrl) => {
    setFormData(prev => ({
      ...prev,
      image: imageUrl
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Product name is required' });
      return false;
    }
    if (!formData.description.trim()) {
      setMessage({ type: 'error', text: 'Description is required' });
      return false;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      setMessage({ type: 'error', text: 'Valid price is required' });
      return false;
    }
    if (!formData.quantity.trim()) {
      setMessage({ type: 'error', text: 'Quantity is required' });
      return false;
    }
    if (!formData.harvestDate) {
      setMessage({ type: 'error', text: 'Harvest date is required' });
      return false;
    }
    if (!formData.image.trim()) {
      setMessage({ type: 'error', text: 'Product image is required' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🚀 Form submitted:', { isEditing, user: user?.id });
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    if (!user || !user.id) {
      setMessage({ type: 'error', text: 'User not authenticated' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category,
        image: formData.image.trim(),
        inStock: formData.inStock,
        isVisible: formData.isVisible,
        harvestDate: formData.harvestDate ? new Date(formData.harvestDate).toISOString() : new Date().toISOString(),
        organic: formData.organic,
        quantity: formData.quantity.trim(),
        unit: formData.unit,
        farmerId: user.id,
        farmerName: user.name,
        farmerLocation: user.location || 'Location not specified',
        farmerMobile: user.mobile || ''
      };

      console.log('📤 Sending product data:', { ...productData, farmerId: '[USER_ID]' });

      const url = isEditing ? `${API_URL}/products/${id}` : `${API_URL}/products`;
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      });

      console.log('📥 Save response status:', response.status);
      console.log('📥 Save response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('📥 Raw response:', responseText);

      if (response.ok) {
        let result;
        try {
          result = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
          console.error('❌ Failed to parse success response:', parseError);
          // If parsing fails but response is ok, consider it successful
          result = { success: true };
        }

        console.log('✅ Product saved successfully:', result);
        setMessage({ type: 'success', text: `Product ${isEditing ? 'updated' : 'created'} successfully!` });
        
        // Navigate after a short delay to show success message
        setTimeout(() => {
          navigate('/farmer-dashboard');
        }, 1500);
      } else {
        let errorMessage = 'Failed to save product';
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.details && Array.isArray(errorData.details)) {
            // Show detailed validation errors
            errorMessage = `Validation errors: ${errorData.details.join(', ')}`;
          } else {
            errorMessage = errorData.error || errorData.message || errorMessage;
          }
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError);
          errorMessage = `Server error: ${response.status} - ${responseText || 'Unknown error'}`;
        }
        console.error('❌ Save failed:', errorMessage);
        setMessage({ type: 'error', text: errorMessage });
      }
    } catch (error) {
      console.error('❌ Save error:', error);
      setMessage({ type: 'error', text: error.message || 'Network error - please check your connection' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/farmer-dashboard"
            className="inline-flex items-center text-green-600 hover:text-green-700 font-medium mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Edit Product' : 'Add New Product'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isEditing ? 'Update your product information' : 'Add a new product to your farm listing'}
          </p>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-start ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Organic Heirloom Tomatoes"
                  disabled={saving}
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleCategoryChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={saving}
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Describe your product, growing methods, taste, and best uses..."
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Pricing & Quantity
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                  Price (LKR) *
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter price in LKR"
                  disabled={saving}
                />
              </div>

              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity *
                </label>
                <input
                  type="text"
                  id="quantity"
                  name="quantity"
                  required
                  value={formData.quantity}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., 2, 12, 1"
                  disabled={saving}
                />
              </div>

              <div>
                <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-2">
                  Unit *
                </label>
                <select
                  id="unit"
                  name="unit"
                  required
                  value={formData.unit}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={saving}
                >
                  {units.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Product Image
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                  Image URL *
                </label>
                <input
                  type="url"
                  id="image"
                  name="image"
                  required
                  value={formData.image}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                  disabled={saving}
                />
              </div>

              {sampleImages[formData.category] && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Or choose a sample image:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {sampleImages[formData.category].map((imageUrl, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectSampleImage(imageUrl)}
                        className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                          formData.image === imageUrl
                            ? 'border-green-500 ring-2 ring-green-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        disabled={saving}
                      >
                        <img
                          src={imageUrl}
                          alt={`Sample ${index + 1}`}
                          className="w-full h-24 object-cover"
                        />
                        {formData.image === imageUrl && (
                          <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formData.image && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                  <img
                    src={formData.image}
                    alt="Product preview"
                    className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Additional Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="harvestDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Harvest Date *
                </label>
                <input
                  type="date"
                  id="harvestDate"
                  name="harvestDate"
                  required
                  value={formData.harvestDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={saving}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="organic"
                    name="organic"
                    checked={formData.organic}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    disabled={saving}
                  />
                  <label htmlFor="organic" className="ml-2 block text-sm text-gray-700">
                    Certified Organic
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="inStock"
                    name="inStock"
                    checked={formData.inStock}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    disabled={saving}
                  />
                  <label htmlFor="inStock" className="ml-2 block text-sm text-gray-700">
                    Currently in stock
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isVisible"
                    name="isVisible"
                    checked={formData.isVisible}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    disabled={saving}
                  />
                  <label htmlFor="isVisible" className="ml-2 block text-sm text-gray-700">
                    Make visible to customers
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
            <Link
              to="/farmer-dashboard"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Update Product' : 'Add Product'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormPage;