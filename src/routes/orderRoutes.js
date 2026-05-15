const express = require('express');
const Order = require('../models/Order');
const router = express.Router();

// Auth middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const User = require('../models/User');
    req.user = await User.findById(decoded.id);
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

router.use(authMiddleware);

// Create order
router.post('/', async (req, res) => {
  try {
    const { items, total, shippingAddress, paymentIntentId } = req.body;
    
    const order = await Order.create({
      userId: req.user._id,
      items,
      subtotal: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      tax: total * 0.1,
      shippingCost: total > 50 ? 0 : 5.99,
      total,
      shippingAddress,
      paymentIntentId,
      paymentStatus: 'paid',
      status: 'processing'
    });
    
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// Get user's orders
router.get('/myorders', async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .sort('-createdAt');
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create payment intent (simplified for testing)
router.post('/create-payment-intent', async (req, res) => {
  try {
    // For testing without Stripe, return a mock client secret
    res.json({ 
      clientSecret: 'mock_secret_' + Date.now(),
      success: true 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;