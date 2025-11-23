const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const crypto = require('crypto');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 8080;

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "https://freshbonds.com", "http://freshbonds.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "https://freshbonds.com"],
      connectSrc: ["'self'", "https://freshbonds.com", "http://freshbonds.com", "http://172.190.133.147"],
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
    ? [
        'https://freshbonds.com',
        'http://freshbonds.com',
        'http://172.190.133.147',
        'https://172.190.133.147',
        'http://localhost',
        'http://localhost:80'
      ]
    : [
        'https://freshbonds.com',
        'http://freshbonds.com',
        'http://172.190.133.147',
        'https://172.190.133.147',
        'http://localhost:3000', 
        'http://localhost:8080',
        'http://localhost',
        'http://localhost:80'
      ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Enhanced logging
app.use(morgan('combined'));

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

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Health check endpoints
app.get('/health/live', (req, res) => {
  res.status(200).json({ 
    status: 'UP', 
    service: 'api-gateway',
    timestamp: Date.now()
  });
});

app.get('/health/ready', async (req, res) => {
  try {
    // Check if backend services are reachable
    const checks = {
      userService: USER_SERVICE_URL,
      productService: PRODUCT_SERVICE_URL
    };
    
    res.status(200).json({ 
      status: 'UP',
      services: checks,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'DOWN', 
      error: error.message 
    });
  }
});

// Service URLs
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';

console.log('🔗 Service URLs:');
console.log('📡 User Service:', USER_SERVICE_URL);
console.log('📦 Product Service:', PRODUCT_SERVICE_URL);

// IPG Payment Configuration
const IPG_CONFIG = {
  appName: process.env.IPG_APP_NAME || '',
  appId: process.env.IPG_APP_ID || '',
  appToken: process.env.IPG_APP_TOKEN || '',
  hashSalt: process.env.IPG_HASH_SALT || '',
  callbackUrl: process.env.IPG_CALLBACK_URL || 'http://localhost:3000/payment/callback',
  callbackToken: process.env.IPG_CALLBACK_TOKEN || ''
};

// Generate IPG hash for security
function generateIPGHash(data, salt) {
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(dataString + salt).digest('hex');
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'API Gateway', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    security: 'Enhanced'
  });
});

// IPG Payment Initiation Endpoint
app.post('/api/payment/initiate', async (req, res) => {
  try {
    console.log('💳 Payment initiation request:', req.body);
    
    const {
      productId,
      productName,
      amount,
      currency,
      customer,
      farmer,
      quantity,
      unit,
      orderId
    } = req.body;

    // Validate required fields
    if (!productId || !productName || !amount || !customer || !orderId) {
      return res.status(400).json({ error: 'Missing required payment fields' });
    }

    // Validate customer information
    if (!customer.name || !customer.email || !customer.phone || !customer.address) {
      return res.status(400).json({ error: 'Complete customer information is required' });
    }

    // Validate Sri Lankan mobile number
    const cleanPhone = customer.phone.replace(/[\s\-\(\)]/g, '');
    if (!/^0[1-9]\d{8}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'Invalid Sri Lankan mobile number format' });
    }

    // Prepare IPG payment data
    const paymentData = {
      app_name: IPG_CONFIG.appName,
      app_id: IPG_CONFIG.appId,
      app_token: IPG_CONFIG.appToken,
      order_id: orderId,
      amount: parseFloat(amount).toFixed(2),
      currency: currency || 'LKR',
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      customer_address: customer.address,
      product_name: productName,
      product_id: productId,
      quantity: quantity,
      unit: unit,
      farmer_name: farmer?.name || '',
      farmer_mobile: farmer?.mobile || '',
      callback_url: IPG_CONFIG.callbackUrl,
      callback_token: IPG_CONFIG.callbackToken,
      timestamp: new Date().toISOString()
    };

    // Generate security hash
    const hashData = `${paymentData.order_id}${paymentData.amount}${paymentData.currency}${paymentData.customer_email}`;
    paymentData.hash = generateIPGHash(hashData, IPG_CONFIG.hashSalt);

    console.log('🔐 Generated payment data with hash:', { 
      ...paymentData, 
      app_token: '[HIDDEN]',
      hash: paymentData.hash.substring(0, 8) + '...'
    });

    // In a real implementation, you would:
    // 1. Store the payment request in your database
    // 2. Make an API call to your IPG provider
    // 3. Return the redirect URL from IPG

    // For demo purposes, we'll simulate the IPG response
    const ipgResponse = {
      success: true,
      orderId: orderId,
      redirectUrl: `https://your-ipg-gateway.com/payment?order=${orderId}&hash=${paymentData.hash}`,
      message: 'Payment initiated successfully'
    };

    console.log('✅ IPG payment initiated:', ipgResponse);
    res.json(ipgResponse);

  } catch (error) {
    console.error('❌ Payment initiation error:', error);
    res.status(500).json({ error: 'Payment initiation failed' });
  }
});

// IPG Payment Callback Endpoint
app.post('/api/payment/callback', async (req, res) => {
  try {
    console.log('📞 Payment callback received:', req.body);
    
    const { order_id, status, amount, hash, callback_token } = req.body;

    // Verify callback token
    if (callback_token !== IPG_CONFIG.callbackToken) {
      console.error('❌ Invalid callback token');
      return res.status(401).json({ error: 'Invalid callback token' });
    }

    // Verify hash
    const expectedHash = generateIPGHash(`${order_id}${status}${amount}`, IPG_CONFIG.hashSalt);
    if (hash !== expectedHash) {
      console.error('❌ Invalid payment hash');
      return res.status(401).json({ error: 'Invalid payment hash' });
    }

    // Process payment result
    if (status === 'success') {
      console.log('✅ Payment successful for order:', order_id);
      // Here you would:
      // 1. Update order status in database
      // 2. Send confirmation email to customer
      // 3. Notify farmer about the order
      // 4. Update product inventory
    } else {
      console.log('❌ Payment failed for order:', order_id);
      // Handle failed payment
    }

    res.json({ success: true, message: 'Callback processed' });

  } catch (error) {
    console.error('❌ Payment callback error:', error);
    res.status(500).json({ error: 'Callback processing failed' });
  }
});

// Enhanced proxy configurations with security
const userServiceProxy = createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/users': '/api/users',
  },
  timeout: 30000,
  proxyTimeout: 30000,
  // Add headers to prevent connection issues
  headers: {
    'Connection': 'keep-alive',
    'Keep-Alive': 'timeout=5, max=1000'
  },
  onError: (err, req, res) => {
    console.error('User service proxy error:', err.message);
    if (!res.headersSent) {
      res.status(503).json({ 
        error: 'User service unavailable', 
        message: 'Please try again later' 
      });
    }
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🔄 Proxying ${req.method} ${req.url} to User Service`);
    
    // Add security headers
    proxyReq.setHeader('X-Forwarded-For', req.ip);
    proxyReq.setHeader('X-Real-IP', req.ip);
    proxyReq.setHeader('Connection', 'keep-alive');
    
    // Remove sensitive headers
    proxyReq.removeHeader('cookie');
    
    // Fix for body parsing issues
    if (req.body && (req.method === 'POST' || req.method === 'PUT')) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // Add security headers to response
    proxyRes.headers['X-Content-Type-Options'] = 'nosniff';
    proxyRes.headers['X-Frame-Options'] = 'DENY';
  }
});

const productServiceProxy = createProxyMiddleware({
  target: PRODUCT_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/products': '/api/products',
  },
  timeout: 30000,
  proxyTimeout: 30000,
  // Add headers to prevent connection issues
  headers: {
    'Connection': 'keep-alive',
    'Keep-Alive': 'timeout=5, max=1000'
  },
  onError: (err, req, res) => {
    console.error('Product service proxy error:', err.message);
    if (!res.headersSent) {
      res.status(503).json({ 
        error: 'Product service unavailable', 
        message: 'Please try again later' 
      });
    }
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🔄 Proxying ${req.method} ${req.url} to Product Service`);
    
    // Add security headers
    proxyReq.setHeader('X-Forwarded-For', req.ip);
    proxyReq.setHeader('X-Real-IP', req.ip);
    proxyReq.setHeader('Connection', 'keep-alive');
    
    // Remove sensitive headers
    proxyReq.removeHeader('cookie');
    
    // Fix for body parsing issues
    if (req.body && (req.method === 'POST' || req.method === 'PUT')) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // Add security headers to response
    proxyRes.headers['X-Content-Type-Options'] = 'nosniff';
    proxyRes.headers['X-Frame-Options'] = 'DENY';
  }
});

// Route proxying with enhanced security
app.use('/api/users', userServiceProxy);
app.use('/api/products', productServiceProxy);

// Default route
app.get('/api', (req, res) => {
  res.json({
    message: 'Fresh Bonds API Gateway',
    version: '1.0.0',
    security: 'Enhanced',
    services: {
      users: '/api/users',
      products: '/api/products',
      payment: '/api/payment'
    },
    endpoints: {
      health: '/health',
      userLogin: '/api/users/login',
      userProfile: '/api/users/profile',
      products: '/api/products',
      productById: '/api/products/:id',
      paymentInitiate: '/api/payment/initiate',
      paymentCallback: '/api/payment/callback'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  
  // Don't leak error details in production
  const errorMessage = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
    
  res.status(500).json({ error: errorMessage });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📡 User Service: ${USER_SERVICE_URL}`);
  console.log(`📦 Product Service: ${PRODUCT_SERVICE_URL}`);
  console.log(`💳 IPG Config: ${IPG_CONFIG.appName ? 'Configured' : 'Not configured'}`);
  console.log(`🛡️ Security: Enhanced mode enabled`);
});

// Graceful shutdown handlers
const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️ ${signal} received, shutting down gracefully...`);
  
  try {
    // Give active requests time to complete
    console.log('⏳ Waiting for active requests to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Exit process
    console.log('✅ API Gateway shut down successfully');
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


// comment added for testing git changes.