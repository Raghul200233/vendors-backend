const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Trust proxy for rate limiting (important for Render)
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'https://vendors-frontend.vercel.app', 'https://*.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});
app.use('/api', limiter);

// ============ ROUTES ============
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/admin', adminRoutes);

// ============ ROOT ROUTE (Fix for "Cannot GET /") ============
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Multi-Tenant E-Commerce API',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      orders: '/api/orders',
      vendor: '/api/vendor',
      admin: '/api/admin',
      health: '/health'
    },
    documentation: 'https://github.com/Raghul200233/vendors-backend',
    timestamp: new Date()
  });
});

// ============ HEALTH CHECK ============
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ============ 404 Handler ============
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot find ${req.originalUrl} on this server`,
    availableEndpoints: {
      root: '/',
      health: '/health',
      api: {
        auth: '/api/auth',
        products: '/api/products',
        orders: '/api/orders',
        vendor: '/api/vendor',
        admin: '/api/admin'
      }
    }
  });
});

// ============ Error Handler ============
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

// ============ Connect to MongoDB and Start Server ============
const PORT = process.env.PORT || 5006;

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5006,
})
.then(() => {
  console.log('✅ MongoDB Connected');
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API: https://vendors-backend-xblc.onrender.com`);
    console.log(`🔗 Health Check: https://vendors-backend-xblc.onrender.com/health`);
  });
})
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err);
  process.exit(1);
});