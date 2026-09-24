import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Mail, AlertCircle, Eye, EyeOff, Leaf, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'farmer', // Always farmer for registration
    location: '',
    farmName: '',
    mobile: ''
  });

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return false;
    }

    // Enhanced email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!isLogin) {
      if (!formData.name.trim() || formData.name.trim().length < 2) {
        setError('Name must be at least 2 characters long');
        return false;
      }

      // Enhanced name validation
      if (!/^[a-zA-Z\s]+$/.test(formData.name.trim())) {
        setError('Name can only contain letters and spaces');
        return false;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }

      // Enhanced password validation
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long');
        return false;
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        setError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
        return false;
      }

      if (!formData.farmName.trim() || formData.farmName.trim().length < 2) {
        setError('Farm name must be at least 2 characters long');
        return false;
      }

      if (!formData.mobile.trim()) {
        setError('Mobile number is required');
        return false;
      }

      // Enhanced mobile validation for Sri Lankan numbers
      const cleanMobile = formData.mobile.replace(/[\s\-\(\)]/g, '');
      if (!/^0(7[01245678]|1[1-9]|[2-9][1-9])\d{7}$/.test(cleanMobile)) {
        setError('Please enter a valid Sri Lankan mobile number (e.g., 0766025562, 0112345678)');
        return false;
      }

      // Location validation (optional but if provided, validate)
      if (formData.location && formData.location.length > 255) {
        setError('Location must be less than 255 characters');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🚀 Form submitted:', { isLogin, email: formData.email });
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      let result;
      
      if (isLogin) {
        console.log('🔐 Attempting login...');
        result = await login(formData.email.trim(), formData.password);
      } else {
        console.log('📝 Attempting registration...');
        const registrationData = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: 'farmer', // Always farmer
          location: formData.location.trim() || null,
          farmName: formData.farmName.trim(),
          mobile: formData.mobile.trim()
        };
        result = await register(registrationData);
      }
      
      console.log('✅ Authentication successful:', result);
      
      // Navigate based on user role
      const userRole = result.user.role;
      console.log('🧭 Navigating based on role:', userRole);
      
      if (userRole === 'farmer') {
        navigate('/farmer-dashboard');
      } else if (userRole === 'admin') {
        navigate('/admin-dashboard');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      setError(error.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    console.log('🔄 Toggling between login and register');
    setIsLogin(!isLogin);
    setError('');
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'farmer',
      location: '',
      farmName: '',
      mobile: ''
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white rounded-full shadow-lg">
              <Leaf className="h-8 w-8 sm:h-10 sm:w-10 text-green-500" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {isLogin ? 'Welcome Back' : 'Join Fresh Bonds'}
          </h2>
          <p className="text-sm sm:text-base text-green-100">
            {isLogin ? 'Sign in to your account' : 'Create your farmer account to get started'}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded-lg flex items-start">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm">{error}</span>
              </div>
            )}

            {/* Name Field (Register only) */}
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter your full name"
                    required={!isLogin}
                    disabled={loading}
                    maxLength={100}
                    pattern="[a-zA-Z\s]+"
                    title="Name can only contain letters and spaces"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                  maxLength={255}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Mobile Number Field (Register only) */}
            {!isLogin && (
              <div>
                <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Mobile Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
                  <input
                    type="tel"
                    id="mobile"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter your mobile number (e.g., 0766025562)"
                    required={!isLogin}
                    disabled={loading}
                    pattern="^0(7[01245678]|1[1-9]|[2-9][1-9])\d{7}$"
                    title="Please enter a valid Sri Lankan mobile number (e.g., 0766025562, 0112345678)"
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-9 sm:pl-10 pr-10 sm:pr-12 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={isLogin ? "Enter your password" : "Create a password (min 8 characters)"}
                  required
                  disabled={loading}
                  minLength={isLogin ? 1 : 8}
                  maxLength={128}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                </button>
              </div>
              {!isLogin && (
                <p className="text-xs text-gray-500 mt-1">
                  Must contain uppercase, lowercase, and number
                </p>
              )}
            </div>

            {/* Confirm Password Field (Register only) */}
            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full pl-9 sm:pl-10 pr-10 sm:pr-12 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Confirm your password"
                    required={!isLogin}
                    disabled={loading}
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Farm Name Field (Register only) */}
            {!isLogin && (
              <div>
                <label htmlFor="farmName" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Farm Name *
                </label>
                <input
                  type="text"
                  id="farmName"
                  name="farmName"
                  value={formData.farmName}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-3 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter your farm name"
                  required={!isLogin}
                  disabled={loading}
                  maxLength={100}
                />
              </div>
            )}

            {/* Location Field (Register only) */}
            {!isLogin && (
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-3 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="City, State (optional)"
                  disabled={loading}
                  maxLength={255}
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 text-white py-2.5 sm:py-3 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {isLogin ? 'Signing In...' : 'Creating Account...'}
                </>
              ) : (
                isLogin ? 'Sign In' : 'Create Farmer Account'
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-4 sm:mt-6 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-green-600 hover:text-green-700 font-medium text-sm sm:text-base"
              disabled={loading}
            >
              {isLogin 
                ? "Don't have an account? Sign up as a farmer" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>
        </div>

        {/* Back to Marketplace */}
        <div className="text-center">
          <Link
            to="/"
            className="text-green-100 hover:text-white transition-colors font-medium text-sm sm:text-base"
          >
            ← Back to Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;