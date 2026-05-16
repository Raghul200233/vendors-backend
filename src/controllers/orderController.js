const Order = require('../models/Order');
const Product = require('../models/Product');
const { createPaymentIntent } = require('../config/stripe');

// Create payment intent with INR
exports.createPaymentIntent = async (req, res) => {
  try {
    const { items, total } = req.body;
    
    // Ensure total is in INR
    const amountInINR = Math.round(total * 100); // Convert to paise
    
    const paymentIntent = await createPaymentIntent(amountInINR / 100, 'inr', {
      userId: req.user._id.toString(),
      orderTotal: total
    });
    
    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount / 100,
      currency: 'inr'
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create order with INR
exports.createOrder = async (req, res) => {
  try {
    const { items, total, shippingAddress, paymentIntentId } = req.body;
    
    // Update inventory
    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { inventory: -item.quantity, totalSales: item.quantity }
      });
    }
    
    const order = await Order.create({
      userId: req.user._id,
      items: items.map(item => ({
        productId: item.productId,
        vendorId: item.vendorId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image
      })),
      subtotal: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      tax: total * 0.05, // 5% GST for India
      shippingCost: total > 500 ? 0 : 49, // Free shipping over ₹500
      total,
      paymentIntentId,
      shippingAddress,
      paymentStatus: 'paid',
      status: 'processing',
      currency: 'inr'
    });
    
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};