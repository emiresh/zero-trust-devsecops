#!/usr/bin/env node
/**
 * Database Initialization Script
 * Run this once to create initial admin user and sample data
 * 
 * Usage: node scripts/init-db.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// MongoDB User Schema (simplified version)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['farmer', 'buyer', 'admin'], default: 'farmer' },
  location: String,
  farmName: String,
  mobile: String,
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

// Product Schema (simplified version)
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  image: String,
  farmerId: { type: String, required: true },
  farmerName: { type: String, required: true },
  farmerLocation: String,
  farmerMobile: String,
  inStock: { type: Boolean, default: true },
  isVisible: { type: Boolean, default: true },
  harvestDate: Date,
  organic: { type: Boolean, default: false },
  quantity: String,
  unit: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

async function initializeDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable is required');
    console.log('💡 Set it in your .env file or export it:');
    console.log('   export MONGODB_URI="mongodb+srv://..."');
    process.exit(1);
  }

  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');

    // Create Admin User
    console.log('\n👤 Creating admin user...');
    const existingUser = await User.findOne({ email: 'ireshek@gmail.com' });
    
    if (existingUser) {
      console.log('⚠️  Admin user already exists');
    } else {
      const adminUser = new User({
        name: 'Iresh Ekanayaka',
        email: 'ireshek@gmail.com',
        password: 'Iresh@1998',
        role: 'admin',
        location: 'Kurunegala, Sri Lanka',
        farmName: 'Athugalpura',
        mobile: '0766025562'
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully');
      console.log('   Email: ireshek@gmail.com');
      console.log('   Password: Iresh@1998');
      console.log('   Role: admin');
    }

    // Create Sample Product (optional)
    console.log('\n📦 Creating sample product...');
    const existingProduct = await Product.findOne({ name: 'Carrot' });
    
    if (existingProduct) {
      console.log('⚠️  Sample product already exists');
    } else {
      // Get the admin user ID
      const admin = await User.findOne({ email: 'ireshek@gmail.com' });
      
      const carrotProduct = new Product({
        name: 'Carrot',
        description: 'A carrot is a versatile, orange root vegetable, rich in beta-carotene, which the body converts to vitamin A. It can be eaten raw or cooked and used in both sweet and savory dishes. Carrots are also available in other colors like purple, red, white, and yellow, and can be stored in the refrigerator for several weeks',
        price: 200,
        category: 'Vegetables',
        image: 'https://images.pexels.com/photos/143133/pexels-photo-143133.jpeg?auto=compress&cs=tinysrgb&w=800',
        farmerId: admin._id.toString(),
        farmerName: 'Iresh Ekanayaka',
        farmerLocation: 'Kobeigane',
        farmerMobile: '0766025562',
        inStock: true,
        isVisible: true,
        harvestDate: new Date('2025-11-14'),
        organic: true,
        quantity: '1',
        unit: 'kg'
      });

      await carrotProduct.save();
      console.log('✅ Sample product created successfully');
      console.log('   Product: Carrot (200 LKR/kg)');
    }

    console.log('\n🎉 Database initialization complete!');
    console.log('\n📋 Summary:');
    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();
    console.log(`   Users: ${userCount}`);
    console.log(`   Products: ${productCount}`);

  } catch (error) {
    console.error('❌ Initialization error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  }
}

// Run initialization
initializeDatabase();
