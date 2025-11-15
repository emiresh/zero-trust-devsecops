const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const Product = require('./models/Product');
const { authenticateToken, requireRole, requireOwnership } = require('./middleware/auth');
const { validateProductData, validateProductId } = require('./middleware/validation');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// MongoDB connection with security options
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:admin@dev.qzhiudx.mongodb.net/fresh_bonds?retryWrites=true&w=majority&appName=Dev';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    createSampleProducts();
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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ 
  limit: '5mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📦 ${req.method} ${req.path}`, {
    body: req.method !== 'GET' ? req.body : undefined,
    ip: req.ip,
    userAgent: req.get('User-Agent')?.substring(0, 100)
  });
  next();
});

// Create sample products
async function createSampleProducts() {
  try {
    const existingProducts = await Product.countDocuments();
    if (existingProducts === 0) {
      console.log('🌱 Creating sample products...');
      
      const sampleProducts = [
        {
          name: 'Organic Heirloom Tomatoes',
          description: 'Fresh, juicy heirloom tomatoes grown using organic methods. Perfect for salads, sandwiches, or cooking.',
          price: 699.00, // LKR
          category: 'Vegetables',
          image: 'https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=800',
          farmerId: '1',
          farmerName: 'Sarah Thompson',
          farmerLocation: 'Kandy, Sri Lanka',
          farmerMobile: '0766025562',
          inStock: true,
          isVisible: true,
          harvestDate: new Date('2025-01-15'),
          organic: true,
          quantity: '2',
          unit: 'kg'
        },
        {
          name: 'Fresh Organic Eggs',
          description: 'Farm-fresh eggs from free-range chickens. Rich, golden yolks and superior taste.',
          price: 850.00, // LKR
          category: 'Dairy & Eggs',
          image: 'https://images.pexels.com/photos/162712/egg-white-food-protein-162712.jpeg?auto=compress&cs=tinysrgb&w=800',
          farmerId: '1',
          farmerName: 'Sarah Thompson',
          farmerLocation: 'Kandy, Sri Lanka',
          farmerMobile: '0766025562',
          inStock: true,
          isVisible: true,
          harvestDate: new Date('2025-01-16'),
          organic: true,
          quantity: '12',
          unit: 'count'
        },
        {
          name: 'Crisp Lettuce Mix',
          description: 'A delightful mix of fresh lettuce varieties. Perfect for salads and sandwiches.',
          price: 425.00, // LKR
          category: 'Vegetables',
          image: 'https://images.pexels.com/photos/1352199/pexels-photo-1352199.jpeg?auto=compress&cs=tinysrgb&w=800',
          farmerId: '1',
          farmerName: 'Sarah Thompson',
          farmerLocation: 'Kandy, Sri Lanka',
          farmerMobile: '0766025562',
          inStock: true,
          isVisible: true,
          harvestDate: new Date('2025-01-14'),
          organic: true,
          quantity: '1',
          unit: 'head'
        },
        {
          name: 'Sweet Strawberries',
          description: 'Juicy, sweet strawberries picked at peak ripeness. Perfect for eating fresh or desserts.',
          price: 799.00, // LKR
          category: 'Fruits',
          image: 'https://images.pexels.com/photos/46174/strawberries-berries-fruit-freshness-46174.jpeg?auto=compress&cs=tinysrgb&w=800',
          farmerId: '1',
          farmerName: 'Sarah Thompson',
          farmerLocation: 'Kandy, Sri Lanka',
          farmerMobile: '0766025562',
          inStock: true,
          isVisible: true,
          harvestDate: new Date('2025-01-15'),
          organic: true,
          quantity: '500',
          unit: 'g'
        },
        {
          name: 'Artisan Honey',
          description: 'Pure, raw honey harvested from our own beehives. Complex floral flavor, unfiltered and unpasteurized.',
          price: 1299.00, // LKR
          category: 'Pantry',
          image: 'https://images.pexels.com/photos/316908/pexels-photo-316908.jpeg?auto=compress&cs=tinysrgb&w=800',
          farmerId: '1',
          farmerName: 'Sarah Thompson',
          farmerLocation: 'Kandy, Sri Lanka',
          farmerMobile: '0766025562',
          inStock: true,
          isVisible: true,
          harvestDate: new Date('2025-01-05'),
          organic: true,
          quantity: '350',
          unit: 'g'
        }
      ];

      for (const productData of sampleProducts) {
        const product = new Product(productData);
        await product.save();
        console.log(`✅ Created product: ${product.name}`);
      }
    }
  } catch (error) {
    console.error('❌ Error creating sample products:', error);
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Product Service', 
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Get all visible products (public endpoint)
app.get('/api/products', async (req, res) => {
  try {
    console.log('📦 Getting all visible products');
    const products = await Product.find({ isVisible: true })
      .sort({ createdAt: -1 })
      .limit(100); // Limit results for performance
    
    const formattedProducts = products.map(product => ({
      id: product._id.toString(),
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      image: product.image,
      farmerId: product.farmerId,
      farmerName: product.farmerName,
      farmerLocation: product.farmerLocation,
      farmerMobile: product.farmerMobile,
      inStock: product.inStock,
      isVisible: product.isVisible,
      harvestDate: product.harvestDate,
      organic: product.organic,
      quantity: product.quantity,
      unit: product.unit,
      createdAt: product.createdAt
    }));

    console.log(`✅ Found ${formattedProducts.length} visible products`);
    res.json(formattedProducts);
  } catch (error) {
    console.error('❌ Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all products (admin only)
app.get('/api/products/all', 
  authenticateToken, 
  requireRole(['admin']), 
  async (req, res) => {
    try {
      console.log('📦 Getting all products (admin)');
      const products = await Product.find({})
        .sort({ createdAt: -1 })
        .limit(1000); // Reasonable limit
      
      const formattedProducts = products.map(product => ({
        id: product._id.toString(),
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        image: product.image,
        farmerId: product.farmerId,
        farmerName: product.farmerName,
        farmerLocation: product.farmerLocation,
        farmerMobile: product.farmerMobile,
        inStock: product.inStock,
        isVisible: product.isVisible,
        harvestDate: product.harvestDate,
        organic: product.organic,
        quantity: product.quantity,
        unit: product.unit,
        createdAt: product.createdAt
      }));

      console.log(`✅ Found ${formattedProducts.length} total products`);
      res.json(formattedProducts);
    } catch (error) {
      console.error('❌ Get all products error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get product by ID (public endpoint)
app.get('/api/products/:id', validateProductId, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📦 Getting product by ID:', id);
    
    const product = await Product.findById(id);
    
    if (!product) {
      console.log('❌ Product not found:', id);
      return res.status(404).json({ error: 'Product not found' });
    }

    const formattedProduct = {
      id: product._id.toString(),
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      image: product.image,
      farmerId: product.farmerId,
      farmerName: product.farmerName,
      farmerLocation: product.farmerLocation,
      farmerMobile: product.farmerMobile,
      inStock: product.inStock,
      isVisible: product.isVisible,
      harvestDate: product.harvestDate,
      organic: product.organic,
      quantity: product.quantity,
      unit: product.unit,
      createdAt: product.createdAt
    };

    console.log('✅ Product found:', product.name);
    res.json(formattedProduct);
  } catch (error) {
    console.error('❌ Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get products by farmer (authenticated)
app.get('/api/products/farmer/:farmerId', 
  authenticateToken, 
  async (req, res) => {
    try {
      const { farmerId } = req.params;
      console.log('📦 Getting products for farmer:', farmerId);
      
      // Farmers can only see their own products, admins can see any farmer's products
      if (req.user.role !== 'admin' && req.user.id !== farmerId) {
        return res.status(403).json({ error: 'Access denied - can only view your own products' });
      }
      
      const products = await Product.find({ farmerId })
        .sort({ createdAt: -1 });
      
      const formattedProducts = products.map(product => ({
        id: product._id.toString(),
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        image: product.image,
        farmerId: product.farmerId,
        farmerName: product.farmerName,
        farmerLocation: product.farmerLocation,
        farmerMobile: product.farmerMobile,
        inStock: product.inStock,
        isVisible: product.isVisible,
        harvestDate: product.harvestDate,
        organic: product.organic,
        quantity: product.quantity,
        unit: product.unit,
        createdAt: product.createdAt
      }));

      console.log(`✅ Found ${formattedProducts.length} products for farmer ${farmerId}`);
      res.json(formattedProducts);
    } catch (error) {
      console.error('❌ Get farmer products error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Create new product (farmers only)
app.post('/api/products', 
  authenticateToken, 
  requireRole(['farmer']), 
  validateProductData, 
  async (req, res) => {
    try {
      console.log('📦 Creating new product:', req.body);
      console.log('👤 User creating product:', req.user);
      
      const productData = req.body;

      // Ensure farmer can only create products for themselves
      if (productData.farmerId && productData.farmerId !== req.user.id) {
        return res.status(403).json({ error: 'Cannot create products for other farmers' });
      }

      // Set farmer ID from authenticated user
      productData.farmerId = req.user.id;

      // Validate harvest date
      const harvestDate = new Date(productData.harvestDate);
      if (isNaN(harvestDate.getTime())) {
        console.log('❌ Invalid harvest date:', productData.harvestDate);
        return res.status(400).json({ error: 'Invalid harvest date format' });
      }

      const product = new Product({
        ...productData,
        harvestDate,
        price: parseFloat(productData.price),
        inStock: productData.inStock !== undefined ? productData.inStock : true,
        isVisible: productData.isVisible !== undefined ? productData.isVisible : true,
        organic: productData.organic || false
      });

      console.log('💾 Saving product to database...');
      const savedProduct = await product.save();
      console.log('✅ Product saved with ID:', savedProduct._id);

      const formattedProduct = {
        id: savedProduct._id.toString(),
        name: savedProduct.name,
        description: savedProduct.description,
        price: savedProduct.price,
        category: savedProduct.category,
        image: savedProduct.image,
        farmerId: savedProduct.farmerId,
        farmerName: savedProduct.farmerName,
        farmerLocation: savedProduct.farmerLocation,
        farmerMobile: savedProduct.farmerMobile,
        inStock: savedProduct.inStock,
        isVisible: savedProduct.isVisible,
        harvestDate: savedProduct.harvestDate,
        organic: savedProduct.organic,
        quantity: savedProduct.quantity,
        unit: savedProduct.unit,
        createdAt: savedProduct.createdAt
      };

      console.log('✅ Product created successfully:', savedProduct.name);
      res.status(201).json(formattedProduct);
    } catch (error) {
      console.error('❌ Create product error:', error);
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ 
          error: 'Validation error', 
          details: validationErrors.join(', '),
          validationErrors 
        });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update product (owner or admin only)
app.put('/api/products/:id', 
  authenticateToken, 
  validateProductId,
  requireOwnership,
  validateProductData, 
  async (req, res) => {
    try {
      const { id } = req.params;
      console.log('📦 Updating product:', id, req.body);
      
      const updateData = { ...req.body };
      
      // Prevent changing farmer ID
      delete updateData.farmerId;
      delete updateData.farmerName;
      delete updateData.farmerLocation;
      
      // Validate price if provided
      if (updateData.price !== undefined) {
        updateData.price = parseFloat(updateData.price);
        if (isNaN(updateData.price) || updateData.price <= 0) {
          console.log('❌ Invalid price:', req.body.price);
          return res.status(400).json({ error: 'Price must be a positive number' });
        }
      }

      // Validate harvest date if provided
      if (updateData.harvestDate) {
        const harvestDate = new Date(updateData.harvestDate);
        if (isNaN(harvestDate.getTime())) {
          console.log('❌ Invalid harvest date:', updateData.harvestDate);
          return res.status(400).json({ error: 'Invalid harvest date format' });
        }
        updateData.harvestDate = harvestDate;
      }

      updateData.updatedAt = new Date();
      
      const product = await Product.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!product) {
        console.log('❌ Product not found for update:', id);
        return res.status(404).json({ error: 'Product not found' });
      }

      const formattedProduct = {
        id: product._id.toString(),
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        image: product.image,
        farmerId: product.farmerId,
        farmerName: product.farmerName,
        farmerLocation: product.farmerLocation,
        farmerMobile: product.farmerMobile,
        inStock: product.inStock,
        isVisible: product.isVisible,
        harvestDate: product.harvestDate,
        organic: product.organic,
        quantity: product.quantity,
        unit: product.unit,
        createdAt: product.createdAt
      };

      console.log('✅ Product updated successfully:', product.name);
      res.json(formattedProduct);
    } catch (error) {
      console.error('❌ Update product error:', error);
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ 
          error: 'Validation error', 
          details: validationErrors.join(', '),
          validationErrors 
        });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Toggle product visibility (owner or admin only)
app.patch('/api/products/:id/visibility', 
  authenticateToken, 
  validateProductId,
  requireOwnership,
  async (req, res) => {
    try {
      const { id } = req.params;
      console.log('📦 Toggling visibility for product:', id);
      
      const product = req.product; // Set by requireOwnership middleware
      
      product.isVisible = !product.isVisible;
      product.updatedAt = new Date();
      await product.save();

      const formattedProduct = {
        id: product._id.toString(),
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        image: product.image,
        farmerId: product.farmerId,
        farmerName: product.farmerName,
        farmerLocation: product.farmerLocation,
        farmerMobile: product.farmerMobile,
        inStock: product.inStock,
        isVisible: product.isVisible,
        harvestDate: product.harvestDate,
        organic: product.organic,
        quantity: product.quantity,
        unit: product.unit,
        createdAt: product.createdAt
      };

      console.log('✅ Product visibility toggled:', product.name, 'visible:', product.isVisible);
      res.json(formattedProduct);
    } catch (error) {
      console.error('❌ Toggle visibility error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete product (owner or admin only)
app.delete('/api/products/:id', 
  authenticateToken, 
  validateProductId,
  requireOwnership,
  async (req, res) => {
    try {
      const { id } = req.params;
      console.log('📦 Deleting product:', id);
      
      const product = req.product; // Set by requireOwnership middleware
      await Product.findByIdAndDelete(id);

      console.log('✅ Product deleted successfully:', id);
      res.json({ message: 'Product deleted successfully', productName: product.name });
    } catch (error) {
      console.error('❌ Delete product error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// 404 handler
app.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Product service error:', err);
  
  // Don't leak error details in production
  const errorMessage = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
    
  res.status(500).json({ error: errorMessage });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`📦 Product Service running on port ${PORT}`);
  console.log(`🔗 MongoDB URI: ${MONGODB_URI ? 'Connected' : 'Not configured'}`);
  console.log(`🛡️ Security: Enhanced mode enabled`);
});