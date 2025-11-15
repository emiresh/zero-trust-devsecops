const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const { authenticateToken, requireRole, rateLimit } = require('./middleware/auth');
const { validateRegistration, validateLogin } = require('./middleware/validation');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB connection with security options
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

console.log('🔗 Connecting to MongoDB...');
mongoose.connect(MONGODB_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    createSampleUsers();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:8080'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ 
  limit: '1mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Request logging middleware with security considerations
app.use((req, res, next) => {
  const sanitizedBody = { ...req.body };
  if (sanitizedBody.password) sanitizedBody.password = '[HIDDEN]';
  if (sanitizedBody.currentPassword) sanitizedBody.currentPassword = '[HIDDEN]';
  if (sanitizedBody.newPassword) sanitizedBody.newPassword = '[HIDDEN]';
  
  console.log(`📥 ${req.method} ${req.path}`, {
    body: req.method !== 'GET' ? sanitizedBody : undefined,
    ip: req.ip,
    userAgent: req.get('User-Agent')?.substring(0, 100)
  });
  next();
});

// Health check endpoints
app.get('/health/live', (req, res) => {
  res.status(200).json({ 
    status: 'UP', 
    service: 'user-service',
    timestamp: Date.now()
  });
});

app.get('/health/ready', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      res.status(200).json({ 
        status: 'UP', 
        database: 'connected',
        uptime: process.uptime()
      });
    } else {
      res.status(503).json({ 
        status: 'DOWN', 
        database: 'disconnected' 
      });
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'DOWN', 
      error: error.message 
    });
  }
});

// JWT Secret validation
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters long');
  process.exit(1);
}

// Create sample user with enhanced security
async function createSampleUsers() {
  try {
    const existingUsers = await User.countDocuments();
    if (existingUsers === 0) {
      console.log('🌱 Creating sample user...');
      
      const sampleUsers = [
        {
          name: 'Iresh Ekanayaka',
          email: 'ireshek@gmail.com',
          password: 'Iresh@1998',
          role: 'admin',
          location: 'Kurunegala, Sri Lanka',
          farmName: 'Athugalpura',
          mobile: '0766025562'
        }
      ];

      for (const userData of sampleUsers) {
        try {
          const user = new User(userData);
          await user.save();
          console.log(`✅ Created user: ${user.name} (${user.email})`);
        } catch (error) {
          if (error.code === 11000) {
            console.log(`⚠️ User already exists: ${userData.email}`);
          } else {
            console.error(`❌ Error creating user ${userData.email}:`, error.message);
          }
        }
      }
    } else {
      console.log(`ℹ️ Found ${existingUsers} existing users, skipping sample data creation`);
    }
  } catch (error) {
    console.error('❌ Error creating sample users:', error);
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'User Service', 
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Register endpoint with enhanced security
app.post('/api/users/register', 
  rateLimit(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  validateRegistration,
  async (req, res) => {
    try {
      console.log('📝 Registration attempt for:', req.body.email);
      const { name, email, password, role, location, farmName, mobile } = req.body;
      
      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        console.log('❌ User already exists:', email);
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      // Create new user
      const userData = {
        name,
        email: email.toLowerCase(),
        password,
        role,
        location: location || null,
        farmName: role === 'farmer' ? farmName : null,
        mobile: mobile || null
      };

      console.log('💾 Creating user with data:', { ...userData, password: '[HIDDEN]' });
      const user = new User(userData);
      await user.save();

      // Generate JWT token with shorter expiration
      const token = jwt.sign(
        { 
          id: user._id.toString(), 
          email: user.email, 
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '8h' } // Reduced from 24h
      );

      const responseData = {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          location: user.location,
          farmName: user.farmName,
          mobile: user.mobile
        },
        token
      };

      console.log('✅ Registration successful for:', user.name);
      res.status(201).json(responseData);
    } catch (error) {
      console.error('❌ Registration error:', error);
      if (error.code === 11000) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Login endpoint with enhanced security
app.post('/api/users/login', 
  rateLimit(10, 15 * 60 * 1000), // 10 attempts per 15 minutes
  validateLogin,
  async (req, res) => {
    try {
      console.log('🔐 Login attempt for:', req.body.email);
      const { email, password } = req.body;
      
      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        console.log('❌ User not found:', email);
        // Use same error message to prevent email enumeration
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      console.log('👤 User found:', { id: user._id, name: user.name, role: user.role });

      // Check password with timing attack protection
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        console.log('❌ Invalid password for user:', email);
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user._id.toString(), 
          email: user.email, 
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      const responseData = {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          location: user.location,
          farmName: user.farmName,
          mobile: user.mobile
        },
        token
      };

      console.log('✅ Login successful for:', user.name);
      res.json(responseData);
    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get user profile with enhanced security
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    console.log('👤 Profile request for user ID:', req.user.id);
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      console.log('❌ User not found:', req.user.id);
      return res.status(404).json({ error: 'User not found' });
    }

    const responseData = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location,
      farmName: user.farmName,
      mobile: user.mobile
    };

    console.log('✅ Profile retrieved for:', user.name);
    res.json(responseData);
  } catch (error) {
    console.error('❌ Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile with enhanced security
app.put('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    console.log('📝 Profile update for user ID:', req.user.id);
    const { name, location, farmName, mobile } = req.body;
    
    // Validate inputs
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters long' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update only allowed fields
    user.name = name.trim();
    user.location = location ? location.trim() : null;
    user.mobile = mobile ? mobile.trim() : null;
    if (user.role === 'farmer') {
      user.farmName = farmName ? farmName.trim() : null;
    }

    await user.save();

    const responseData = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location,
      farmName: user.farmName,
      mobile: user.mobile
    };

    console.log('✅ Profile updated for:', user.name);
    res.json(responseData);
  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password with enhanced security
app.put('/api/users/password', 
  authenticateToken,
  rateLimit(5, 60 * 60 * 1000), // 5 attempts per hour
  async (req, res) => {
    try {
      console.log('🔒 Password change for user ID:', req.user.id);
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long' });
      }

      // Enhanced password validation
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
        return res.status(400).json({ 
          error: 'New password must contain at least one uppercase letter, one lowercase letter, and one number' 
        });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isValidPassword = await user.comparePassword(currentPassword);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      console.log('✅ Password changed for user ID:', req.user.id);
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('❌ Password change error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Logout endpoint
app.post('/api/users/logout', (req, res) => {
  console.log('👋 User logout');
  res.json({ message: 'Logged out successfully' });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ User service error:', err);
  
  // Don't leak error details in production
  const errorMessage = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
    
  res.status(500).json({ error: errorMessage });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`👤 User Service running on port ${PORT}`);
  console.log(`🔗 MongoDB URI: ${MONGODB_URI ? 'Configured' : 'Not configured'}`);
  console.log(`🔑 JWT Secret: ${JWT_SECRET ? 'Configured' : 'Not configured'}`);
  console.log(`🛡️ Security: Enhanced mode enabled`);
});

// Graceful shutdown handlers
const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️ ${signal} received, shutting down gracefully...`);
  
  try {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('📊 MongoDB connection closed');
    
    // Exit process
    console.log('✅ User service shut down successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, you might want to gracefully shutdown here
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});