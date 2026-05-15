const Order = require('../models/Order');
const Product = require('../models/Product');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createPaymentIntent = async (req, res) => {
  try {
    const { items, total } = req.body;
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'usd',
      metadata: {
        userId: req.user._id.toString()
      }
    });
    
    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { items, total, shippingAddress, paymentIntentId } = req.body;
    
    // Update inventory
    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { inventory: -item.quantity }
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
      tax: total * 0.1,
      shippingCost: total > 50 ? 0 : 5.99,
      total,
      paymentIntentId,
      shippingAddress,
      paymentStatus: 'paid',
      status: 'processing'
    });
    
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .sort('-createdAt');
    
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getVendorOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      'items.vendorId': req.vendor._id
    }).sort('-createdAt');
    
    const vendorOrders = orders.map(order => ({
      ...order.toObject(),
      items: order.items.filter(item => item.vendorId.toString() === req.vendor._id.toString())
    }));
    
    res.status(200).json({ success: true, data: vendorOrders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    order.status = status;
    if (status === 'delivered') {
      order.deliveredAt = new Date();
    }
    
    await order.save();
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};