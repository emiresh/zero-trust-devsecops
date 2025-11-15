const validator = require('validator');
const mongoose = require('mongoose');

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
  } else {
    const harvestDateObj = new Date(harvestDate);
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const oneMonthFromNow = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    
    if (harvestDateObj < oneYearAgo || harvestDateObj > oneMonthFromNow) {
      errors.push('Harvest date must be within the last year and not more than one month in the future');
    }
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

const validateProductId = (req, res, next) => {
  const { id } = req.params;
  
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    console.log('❌ Invalid product ID format:', id);
    return res.status(400).json({ error: 'Invalid product ID format' });
  }
  
  next();
};

module.exports = {
  validateProductData,
  validateProductId
};