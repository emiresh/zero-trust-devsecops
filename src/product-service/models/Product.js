const mongoose = require('mongoose');
const validator = require('validator');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [2, 'Product name must be at least 2 characters long'],
    maxlength: [255, 'Product name must be less than 255 characters'],
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9\s&.-]+$/.test(v);
      },
      message: 'Product name contains invalid characters'
    }
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters long'],
    maxlength: [2000, 'Description must be less than 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0.01, 'Price must be greater than 0'],
    max: [10000, 'Price must be less than $10,000'],
    validate: {
      validator: function(v) {
        return Number.isFinite(v) && v > 0;
      },
      message: 'Price must be a valid positive number'
    }
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['Vegetables', 'Fruits', 'Herbs', 'Dairy & Eggs', 'Meat & Poultry', 'Grains & Cereals', 'Pantry', 'Flowers', 'Other'],
      message: 'Invalid product category'
    }
  },
  image: {
    type: String,
    required: [true, 'Product image is required'],
    validate: {
      validator: function(v) {
        return validator.isURL(v, { protocols: ['http', 'https'] });
      },
      message: 'Invalid image URL'
    }
  },
  farmerId: {
    type: String,
    required: [true, 'Farmer ID is required'],
    validate: {
      validator: function(v) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Invalid farmer ID'
    }
  },
  farmerName: {
    type: String,
    required: [true, 'Farmer name is required'],
    trim: true,
    maxlength: [100, 'Farmer name must be less than 100 characters']
  },
  farmerLocation: {
    type: String,
    required: [true, 'Farmer location is required'],
    trim: true,
    maxlength: [255, 'Farmer location must be less than 255 characters']
  },
  farmerMobile: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || validator.isMobilePhone(v, 'any', { strictMode: false });
      },
      message: 'Invalid mobile number format'
    }
  },
  inStock: {
    type: Boolean,
    default: true
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  harvestDate: {
    type: Date,
    required: [true, 'Harvest date is required'],
    validate: {
      validator: function(v) {
        const now = new Date();
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        const oneMonthFromNow = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        return v >= oneYearAgo && v <= oneMonthFromNow;
      },
      message: 'Harvest date must be within the last year and not more than one month in the future'
    }
  },
  organic: {
    type: Boolean,
    default: false
  },
  quantity: {
    type: String,
    required: [true, 'Quantity is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return /^[0-9]+(\.[0-9]+)?$/.test(v);
      },
      message: 'Quantity must be a valid number'
    }
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: {
      values: ['lbs', 'oz', 'kg', 'g', 'count', 'dozen', 'bunch', 'head', 'pint', 'quart', 'gallon', 'bag', 'box'],
      message: 'Invalid unit'
    }
  },
  isApproved: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for performance and security
productSchema.index({ farmerId: 1 });
productSchema.index({ isVisible: 1 });
productSchema.index({ category: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isApproved: 1 });
productSchema.index({ 
  name: 'text', 
  description: 'text' 
}, {
  weights: { name: 10, description: 5 }
});

// Compound indexes for common queries
productSchema.index({ isVisible: 1, isApproved: 1, createdAt: -1 });
productSchema.index({ farmerId: 1, createdAt: -1 });

// Pre-save middleware for additional validation
productSchema.pre('save', function(next) {
  // Ensure price has max 2 decimal places
  if (this.price) {
    this.price = Math.round(this.price * 100) / 100;
  }
  
  // Sanitize text fields
  if (this.name) {
    this.name = this.name.trim();
  }
  if (this.description) {
    this.description = this.description.trim();
  }
  
  next();
});

// Static methods for secure queries
productSchema.statics.findVisible = function(limit = 100) {
  return this.find({ 
    isVisible: true, 
    isApproved: true,
    inStock: true 
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

productSchema.statics.findByFarmer = function(farmerId, includeHidden = false) {
  const query = { farmerId };
  if (!includeHidden) {
    query.isVisible = true;
    query.isApproved = true;
  }
  return this.find(query).sort({ createdAt: -1 });
};

// Method to increment view count safely
productSchema.methods.incrementViews = function() {
  return this.updateOne({ $inc: { views: 1 } });
};

module.exports = mongoose.model('Product', productSchema);