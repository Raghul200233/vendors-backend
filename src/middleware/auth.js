const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user || !req.user.isActive) {
      return res.status(401).json({ message: 'User account is inactive' });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Role ${req.user.role} is not authorized` 
      });
    }
    next();
  };
};

const vendorOwnership = async (req, res, next) => {
  const Vendor = require('../models/Vendor');
  const vendor = await Vendor.findOne({ userId: req.user._id });
  
  if (!vendor && req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'No vendor account found' });
  }
  
  req.vendor = vendor;
  next();
};

module.exports = { protect, authorize, vendorOwnership };