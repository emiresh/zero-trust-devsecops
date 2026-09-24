const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [100, 'Name must be less than 100 characters'],
    validate: {
      validator: function(v) {
        return /^[a-zA-Z\s]+$/.test(v);
      },
      message: 'Name can only contain letters and spaces'
    }
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: [255, 'Email must be less than 255 characters'],
    validate: {
      validator: validator.isEmail,
      message: 'Please enter a valid email address'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    maxlength: [128, 'Password must be less than 128 characters'],
    validate: {
      validator: function(v) {
        return /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(v);
      },
      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: ['farmer', 'admin'],
      message: 'Role must be either farmer or admin'
    },
    default: 'farmer'
  },
  location: {
    type: String,
    trim: true,
    maxlength: [255, 'Location must be less than 255 characters'],
    validate: {
      validator: function(v) {
        return !v || /^[a-zA-Z0-9\s,.-]+$/.test(v);
      },
      message: 'Location contains invalid characters'
    }
  },
  farmName: {
    type: String,
    trim: true,
    maxlength: [100, 'Farm name must be less than 100 characters'],
    validate: {
      validator: function(v) {
        if (this.role === 'farmer') {
          return v && v.length >= 2;
        }
        return true;
      },
      message: 'Farm name is required for farmers and must be at least 2 characters'
    }
  },
  mobile: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (this.role === 'farmer') {
          // Updated validation for Sri Lankan mobile numbers
          // 07X XXXXXXX (mobile - 9 digits starting with 07)
          // 011 XXXXXXX (landline - 10 digits starting with 011)
          // 0XX XXXXXXX (other area codes - 9-10 digits)
          return v && /^0(7[01245678]|1[1-9]|[2-9][1-9])\d{7}$/.test(v.replace(/[\s\-\(\)]/g, ''));
        }
        return !v || /^0(7[01245678]|1[1-9]|[2-9][1-9])\d{7}$/.test(v.replace(/[\s\-\(\)]/g, ''));
      },
      message: 'Please enter a valid Sri Lankan mobile number (e.g., 0766025562, 0112345678)'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for performance and security
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    // Use higher salt rounds for better security
    const salt = await bcrypt.genSalt(14);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method with timing attack protection
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// Account locking methods
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: new Date() }
  });
};

// Transform output to remove sensitive data
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.loginAttempts;
  delete user.lockUntil;
  return user;
};

// Static method for secure user lookup
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ 
    email: email.toLowerCase(),
    isActive: true 
  });
};

module.exports = mongoose.model('User', userSchema);