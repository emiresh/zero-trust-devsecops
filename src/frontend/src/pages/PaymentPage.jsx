import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const PaymentPage = () => {
  const [searchParams] = useSearchParams();
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  // Use environment variable or fallback to service name for Docker
  const API_URL = import.meta.env.VITE_API_URL || (
    typeof window !== 'undefined' && window.location.hostname === 'localhost' 
      ? 'http://localhost:8080/api' 
      : 'http://api-gateway:8080/api'
  );

  useEffect(() => {
    // Get payment data from localStorage
    const storedData = localStorage.getItem('paymentData');
    if (storedData) {
      setPaymentData(JSON.parse(storedData));
    } else {
      setError('Payment data not found. Please try again.');
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const validateForm = () => {
    if (!customerInfo.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!customerInfo.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
      setError('Valid email is required');
      return false;
    }
    if (!customerInfo.phone.trim()) {
      setError('Phone number is required');
      return false;
    }
    // Validate Sri Lankan mobile number
    const cleanPhone = customerInfo.phone.replace(/[\s\-\(\)]/g, '');
    if (!/^0(7[01245678]|1[1-9]|[2-9][1-9])\d{7}$/.test(cleanPhone)) {
      setError('Please enter a valid Sri Lankan mobile number (e.g., 0766025562, 0112345678)');
      return false;
    }
    if (!customerInfo.address.trim()) {
      setError('Address is required');
      return false;
    }
    return true;
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create payment request for IPG
      const paymentRequest = {
        productId: paymentData.productId,
        productName: paymentData.productName,
        amount: parseFloat(paymentData.amount) + 200, // Include delivery fee
        currency: 'LKR',
        customer: {
          name: customerInfo.name.trim(),
          email: customerInfo.email.trim(),
          phone: customerInfo.phone.trim(),
          address: customerInfo.address.trim()
        },
        farmer: {
          name: paymentData.farmerName,
          mobile: paymentData.farmerMobile
        },
        quantity: paymentData.quantity,
        unit: paymentData.unit,
        orderId: `ORDER_${Date.now()}`,
        timestamp: new Date().toISOString()
      };

      console.log('🔄 Initiating payment with IPG:', paymentRequest);

      // Send payment request to backend
      const response = await fetch(`${API_URL}/payment/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentRequest)
      });

      console.log('📥 Payment response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Payment initiated:', result);
        
        // Clear payment data from localStorage
        localStorage.removeItem('paymentData');
        
        // Redirect to IPG payment gateway
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
        } else {
          // Fallback: show success message for demo
          alert(`Payment initiated successfully! Order ID: ${paymentRequest.orderId}`);
          window.location.href = '/';
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment initiation failed');
      }
      
    } catch (error) {
      console.error('❌ Payment error:', error);
      setError(error.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Data Not Found</h2>
          <p className="text-gray-600 mb-6">Please select a product to purchase.</p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const totalAmount = parseFloat(paymentData.amount) + 200; // Include delivery fee

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to={`/product/${paymentData.productId}`}
            className="inline-flex items-center text-green-600 hover:text-green-700 font-medium mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Product
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Secure Payment</h1>
          <p className="text-gray-600 mt-2">Complete your purchase securely through IPG</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
              Order Summary
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900">{paymentData.productName}</h3>
                  <p className="text-sm text-gray-600">Quantity: {paymentData.quantity} {paymentData.unit}</p>
                  <p className="text-sm text-gray-600">Farmer: {paymentData.farmerName}</p>
                  {paymentData.farmerMobile && (
                    <p className="text-sm text-gray-600">Contact: {paymentData.farmerMobile}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">LKR {parseFloat(paymentData.amount).toFixed(2)}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Product Price</span>
                  <span className="text-sm text-gray-900">LKR {parseFloat(paymentData.amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">Delivery Fee</span>
                  <span className="text-sm text-gray-900">LKR 200.00</span>
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <span className="font-semibold text-gray-900">Total Amount</span>
                  <span className="font-semibold text-xl text-green-600">
                    LKR {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-blue-500" />
              Customer Information
            </h2>

            {error && (
              <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handlePayment} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={customerInfo.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  required
                  disabled={loading}
                  maxLength={100}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={customerInfo.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                  maxLength={255}
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={customerInfo.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0766025562"
                  required
                  disabled={loading}
                  pattern="0[1-9]\d{8}"
                  title="Please enter a valid Sri Lankan mobile number"
                />
                <p className="text-xs text-gray-500 mt-1">Enter Sri Lankan mobile number (10 digits starting with 0)</p>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Address *
                </label>
                <textarea
                  id="address"
                  name="address"
                  value={customerInfo.address}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter your complete delivery address"
                  required
                  disabled={loading}
                  maxLength={500}
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Shield className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="font-medium text-blue-900">Secure IPG Payment</span>
                </div>
                <p className="text-sm text-blue-700">
                  Your payment will be processed securely through our IPG payment gateway. 
                  Your payment details are encrypted and processed securely.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Redirecting to Payment Gateway...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Pay LKR {totalAmount.toFixed(2)} via IPG
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                You will be redirected to the secure IPG payment gateway to complete your payment.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;