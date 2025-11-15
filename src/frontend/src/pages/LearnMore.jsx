import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Leaf, Heart, Shield, Truck, Award } from 'lucide-react';

const LearnMore = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            to="/" 
            className="inline-flex items-center text-green-600 hover:text-green-700 font-medium"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              About FreshBonds
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-green-100 max-w-3xl mx-auto">
              Connecting communities through sustainable agriculture and fresh, local produce
            </p>
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Mission</h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto">
            To create a direct connection between local farmers and consumers, promoting sustainable agriculture 
            while ensuring everyone has access to fresh, healthy, and affordable produce.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Community First</h3>
            <p className="text-gray-600">
              Building strong relationships between farmers and consumers in local communities.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Leaf className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Sustainable Farming</h3>
            <p className="text-gray-600">
              Supporting eco-friendly farming practices that protect our environment.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Heart className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Fresh & Healthy</h3>
            <p className="text-gray-600">
              Delivering the freshest produce directly from farm to your table.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Quality Assured</h3>
            <p className="text-gray-600">
              Rigorous quality checks ensure you receive only the best products.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Truck className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Fast Delivery</h3>
            <p className="text-gray-600">
              Quick and reliable delivery service to bring fresh produce to your door.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Award className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Fair Pricing</h3>
            <p className="text-gray-600">
              Competitive prices that benefit both farmers and consumers.
            </p>
          </div>
        </div>

        {/* Story Section */}
        <div className="bg-white rounded-xl p-8 md:p-12 shadow-sm">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Our Story</h2>
            <div className="space-y-6 text-gray-600 text-lg">
              <p>
                FreshBonds was founded with a simple vision: to create a direct bridge between local farmers 
                and consumers, ensuring that fresh, high-quality produce reaches your table while supporting 
                sustainable agriculture in our communities.
              </p>
              <p>
                We recognized that many consumers want to know where their food comes from, while farmers 
                struggle to reach customers directly. Our platform eliminates the middleman, creating 
                better prices for consumers and fair compensation for farmers.
              </p>
              <p>
                Today, we're proud to work with over 100 local farmers and serve thousands of families 
                across the region. Every purchase you make supports local agriculture and helps build 
                a more sustainable food system for future generations.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of satisfied customers who choose fresh, local produce.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-105"
            >
              Browse Products
            </Link>
            <Link 
              to="/register"
              className="border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300"
            >
              Join as Farmer
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearnMore;
