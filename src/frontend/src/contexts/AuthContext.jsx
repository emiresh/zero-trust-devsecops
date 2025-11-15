import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Use environment variable or fallback to service name for Docker
  const API_URL = import.meta.env.VITE_API_URL || (
    typeof window !== 'undefined' && window.location.hostname === 'localhost' 
      ? 'http://localhost:8080/api' 
      : 'http://api-gateway:8080/api'
  );

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Token validation
  const isTokenValid = (token) => {
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  const fetchUserProfile = async () => {
    try {
      console.log('🔍 Fetching user profile with token:', token ? 'Present' : 'Missing');
      
      // Validate token before making request
      if (!isTokenValid(token)) {
        console.log('❌ Token is invalid or expired');
        logout();
        return;
      }

      const response = await fetch(`${API_URL}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('👤 Profile response status:', response.status);

      if (response.ok) {
        const userData = await response.json();
        console.log('✅ Profile fetched successfully:', userData);
        setUser(userData);
      } else {
        console.error('❌ Failed to fetch profile:', response.status);
        logout();
      }
    } catch (error) {
      console.error('❌ Failed to fetch user profile:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🔐 Attempting login with email:', email);
      
      // Input validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      const requestBody = { email: email.toLowerCase().trim(), password };
      console.log('📤 Login request body:', { email: requestBody.email, password: '[HIDDEN]' });

      const response = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Login response status:', response.status);

      const responseText = await response.text();
      console.log('📥 Raw response length:', responseText.length);

      if (!response.ok) {
        let errorMessage = 'Login failed';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError);
          errorMessage = `Server error: ${response.status}`;
        }
        console.error('❌ Login failed:', errorMessage);
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse success response:', parseError);
        throw new Error('Invalid response from server');
      }

      console.log('✅ Login successful:', { ...data, token: '[HIDDEN]' });
      
      if (!data.user || !data.token) {
        throw new Error('Invalid response: missing user or token');
      }

      // Validate token before storing
      if (!isTokenValid(data.token)) {
        throw new Error('Received invalid token from server');
      }
      
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('token', data.token);
      
      return data;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      console.log('📝 Attempting registration:', { ...userData, password: '[HIDDEN]' });
      
      // Input validation
      if (!userData.name || userData.name.trim().length < 2) {
        throw new Error('Name must be at least 2 characters long');
      }

      if (!userData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
        throw new Error('Please enter a valid email address');
      }

      if (!userData.password || userData.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(userData.password)) {
        throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      }

      if (!userData.farmName || userData.farmName.trim().length < 2) {
        throw new Error('Farm name must be at least 2 characters long');
      }

      // Updated mobile validation for Sri Lankan numbers
      if (!userData.mobile || userData.mobile.trim().length < 10) {
        throw new Error('Please enter a valid mobile number (e.g., 0766025562)');
      }

      // Validate Sri Lankan mobile number format
      const cleanMobile = userData.mobile.replace(/[\s\-\(\)]/g, '');
      if (!/^0[1-9]\d{8}$/.test(cleanMobile)) {
        throw new Error('Please enter a valid Sri Lankan mobile number (e.g., 0766025562)');
      }

      const sanitizedData = {
        name: userData.name.trim(),
        email: userData.email.toLowerCase().trim(),
        password: userData.password,
        role: 'farmer', // Always farmer
        location: userData.location ? userData.location.trim() : null,
        farmName: userData.farmName.trim(),
        mobile: userData.mobile.trim()
      };
      
      const response = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedData),
      });

      console.log('📥 Registration response status:', response.status);

      const responseText = await response.text();
      console.log('📥 Raw response length:', responseText.length);

      if (!response.ok) {
        let errorMessage = 'Registration failed';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError);
          errorMessage = `Server error: ${response.status}`;
        }
        console.error('❌ Registration failed:', errorMessage);
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse success response:', parseError);
        throw new Error('Invalid response from server');
      }

      console.log('✅ Registration successful:', { ...data, token: '[HIDDEN]' });
      
      if (!data.user || !data.token) {
        throw new Error('Invalid response: missing user or token');
      }

      // Validate token before storing
      if (!isTokenValid(data.token)) {
        throw new Error('Received invalid token from server');
      }
      
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('token', data.token);
      
      return data;
    } catch (error) {
      console.error('❌ Registration error:', error);
      throw error;
    }
  };

  const updateProfile = async (profileData) => {
    try {
      console.log('📝 Updating profile:', profileData);
      
      // Input validation
      if (!profileData.name || profileData.name.trim().length < 2) {
        throw new Error('Name must be at least 2 characters long');
      }

      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const data = await response.json();
      setUser(data);
      return data;
    } catch (error) {
      console.error('❌ Profile update error:', error);
      throw error;
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      console.log('🔒 Changing password for user');
      
      // Input validation
      if (!currentPassword || !newPassword) {
        throw new Error('Current password and new password are required');
      }

      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long');
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
        throw new Error('New password must contain at least one uppercase letter, one lowercase letter, and one number');
      }

      const response = await fetch(`${API_URL}/users/password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change password');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Password change error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('👋 Logging out user');
      if (token) {
        await fetch(`${API_URL}/users/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    isAuthenticated: user !== null,
    token,
    loading
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};