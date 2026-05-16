const Stripe = require('stripe');

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  maxNetworkRetries: 2,
  timeout: 60000,
});

// Create a payment intent (INR Currency)
const createPaymentIntent = async (amount, currency = 'inr', metadata = {}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to paise (cents for INR)
      currency,
      metadata,
      payment_method_types: ['card', 'upi'], // Enable UPI payments
    });
    return paymentIntent;
  } catch (error) {
    console.error('Stripe payment intent error:', error);
    throw error;
  }
};

// Create UPI payment intent specifically
const createUPIPaymentIntent = async (amount, upiId, metadata = {}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'inr',
      metadata,
      payment_method_types: ['upi'],
      payment_method_options: {
        upi: {
          upi_id: upiId, // For collect payments
        },
      },
    });
    return paymentIntent;
  } catch (error) {
    console.error('UPI payment intent error:', error);
    throw error;
  }
};

// Create a customer for recurring payments
const createCustomer = async (email, name, metadata = {}) => {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    });
    return customer;
  } catch (error) {
    console.error('Stripe create customer error:', error);
    throw error;
  }
};

// Refund payment
const refundPayment = async (paymentIntentId, amount = null) => {
  try {
    const refundParams = {
      payment_intent: paymentIntentId,
    };
    if (amount) {
      refundParams.amount = Math.round(amount * 100);
    }
    const refund = await stripe.refunds.create(refundParams);
    return refund;
  } catch (error) {
    console.error('Stripe refund error:', error);
    throw error;
  }
};

// Webhook handling
const constructWebhookEvent = (payload, signature, webhookSecret) => {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
    return event;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw error;
  }
};

module.exports = {
  stripe,
  createPaymentIntent,
  createUPIPaymentIntent,
  createCustomer,
  refundPayment,
  constructWebhookEvent
};