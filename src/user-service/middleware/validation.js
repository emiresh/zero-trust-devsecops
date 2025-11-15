const validator = require('validator');

// Input validation middleware
const validateRegistration = (req, res, next) => {
  const { name, email, password, role, farmName, mobile } = req.body;
  const errors = [];

  // Name validation
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  if (name && name.length > 100) {
    errors.push('Name must be less than 100 characters');
  }

  // Email validation
  if (!email || !validator.isEmail(email)) {
    errors.push('Valid email address is required');
  }
  if (email && email.length > 255) {
    errors.push('Email must be less than 255 characters');
  }

  // Password validation
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (password && password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  if (password && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
  }

  // Role validation
  if (!role || !['farmer', 'admin'].includes(role)) {
    errors.push('Role must be either farmer or admin');
  }

  // Farmer-specific validation
  if (role === 'farmer') {
    if (!farmName || farmName.trim().length < 2) {
      errors.push('Farm name is required for farmers and must be at least 2 characters');
    }
    if (farmName && farmName.length > 100) {
      errors.push('Farm name must be less than 100 characters');
    }

    // Updated mobile validation for Sri Lankan numbers
    if (!mobile) {
      errors.push('Mobile number is required for farmers');
    } else {
      const cleanMobile = mobile.replace(/[\s\-\(\)]/g, '');
      // Sri Lankan mobile number formats:
      // 07X XXXXXXX (9 digits starting with 07)
      // 011 XXXXXXX (landline - 10 digits starting with 011)
      // 0XX XXXXXXX (other area codes - 9-10 digits)
      if (!/^0(7[01245678]|1[1-9]|[2-9][1-9])\d{7}$/.test(cleanMobile)) {
        errors.push('Please enter a valid Sri Lankan mobile number (e.g., 0766025562, 0112345678)');
      }
    }
  }

  // Location validation (optional)
  if (req.body.location && req.body.location.length > 255) {
    errors.push('Location must be less than 255 characters');
  }

  if (errors.length > 0) {
    console.log('❌ Registration validation failed:', errors);
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  // Sanitize inputs
  req.body.name = validator.escape(name.trim());
  req.body.email = validator.normalizeEmail(email);
  req.body.farmName = farmName ? validator.escape(farmName.trim()) : null;
  req.body.location = req.body.location ? validator.escape(req.body.location.trim()) : null;
  req.body.mobile = mobile ? mobile.trim() : null;

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !validator.isEmail(email)) {
    errors.push('Valid email address is required');
  }

  if (!password || password.length < 1) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    console.log('❌ Login validation failed:', errors);
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  req.body.email = validator.normalizeEmail(email);
  next();
};

const validateProductData = (req, res, next) => {
  const { name, description, price, category, quantity, unit, harvestDate } = req.body;
  const errors = [];

  // Name validation
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Product name must be at least 2 characters long');
  }
  if (name && name.length > 255) {
    errors.push('Product name must be less than 255 characters');
  }

  // Description validation
  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    errors.push('Product description must be at least 10 characters long');
  }
  if (description && description.length > 2000) {
    errors.push('Product description must be less than 2000 characters');
  }

  // Price validation
  if (!price || isNaN(price) || parseFloat(price) <= 0) {
    errors.push('Price must be a positive number');
  }
  if (price && parseFloat(price) > 1000000) {
    errors.push('Price must be less than LKR 1,000,000');
  }

  // Category validation
  const validCategories = ['Vegetables', 'Fruits', 'Herbs', 'Dairy & Eggs', 'Meat & Poultry', 'Grains & Cereals', 'Pantry', 'Flowers', 'Other'];
  if (!category || !validCategories.includes(category)) {
    errors.push('Invalid product category');
  }

  // Quantity validation
  if (!quantity || typeof quantity !== 'string' || quantity.trim().length < 1) {
    errors.push('Quantity is required');
  }

  // Unit validation
  const validUnits = ['lbs', 'oz', 'kg', 'g', 'count', 'dozen', 'bunch', 'head', 'pint', 'quart', 'gallon', 'bag', 'box'];
  if (!unit || !validUnits.includes(unit)) {
    errors.push('Invalid unit');
  }

  // Harvest date validation
  if (!harvestDate || !validator.isISO8601(harvestDate)) {
    errors.push('Valid harvest date is required');
  }

  // Image URL validation
  if (req.body.image && !validator.isURL(req.body.image, { protocols: ['http', 'https'] })) {
    errors.push('Invalid image URL');
  }

  if (errors.length > 0) {
    console.log('❌ Product validation failed:', errors);
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  // Sanitize inputs
  req.body.name = validator.escape(name.trim());
  req.body.description = validator.escape(description.trim());
  req.body.quantity = validator.escape(quantity.trim());

  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateProductData
};