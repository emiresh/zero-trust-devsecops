import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, User, LogOut, ShoppingBag, Settings, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const getDashboardLink = () => {
    if (user?.role === 'farmer') return '/farmer-dashboard';
    if (user?.role === 'admin') return '/admin-dashboard';
    return '/';
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group" onClick={closeMobileMenu}>
            <div className="p-2 bg-green-500 rounded-lg group-hover:bg-green-600 transition-colors">
              <Leaf className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-gray-900">Fresh Bonds</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className="text-gray-700 hover:text-green-600 font-medium transition-colors flex items-center space-x-1"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Marketplace</span>
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Link
                  to={getDashboardLink()}
                  className="text-gray-700 hover:text-green-600 font-medium transition-colors flex items-center space-x-1"
                >
                  <Settings className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                
                <div className="relative group">
                  <button className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700 max-w-24 truncate">{user.name}</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full capitalize">
                      {user.role}
                    </span>
                  </button>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="py-1">
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profile Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium text-sm"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700 hover:text-green-600 p-2"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-3">
              <Link 
                to="/" 
                className="flex items-center space-x-2 text-gray-700 hover:text-green-600 font-medium transition-colors px-2 py-2"
                onClick={closeMobileMenu}
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Marketplace</span>
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    to={getDashboardLink()}
                    className="flex items-center space-x-2 text-gray-700 hover:text-green-600 font-medium transition-colors px-2 py-2"
                    onClick={closeMobileMenu}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                  
                  <div className="px-2 py-2 border-t border-gray-200">
                    <div className="flex items-center space-x-2 mb-3">
                      <User className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">{user.name}</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full capitalize">
                        {user.role}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <Link
                        to="/profile"
                        className="flex items-center space-x-2 text-gray-700 hover:text-green-600 transition-colors py-1"
                        onClick={closeMobileMenu}
                      >
                        <User className="h-4 w-4" />
                        <span className="text-sm">Profile Settings</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors py-1"
                      >
                        <LogOut className="h-4 w-4" />
                        <span className="text-sm">Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="px-2">
                  <Link
                    to="/login"
                    className="block w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium text-center text-sm"
                    onClick={closeMobileMenu}
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;