const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const protectRoute = async (req, res, next) => {
  try {
    // Get token from cookie or Authorization header
    let token = req.cookies?.jwt;
    
    // Check for header-based token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('Using token from Authorization header');
    } else if (token) {
      console.log('Using token from cookie');
    }

    if (!token) {
      console.log('No token found in request');
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    try {
      const decoded = jwt.verify(token, process.env.SECRET);
      
      if (!decoded || !decoded.userId) {
        console.log('Invalid token payload');
        return res.status(401).json({ message: 'Unauthorized: Invalid token payload' });
      }
      
      // Get user from database
      const user = await User.findById(decoded.userId).select('-password');

      if (!user) {
        console.log('User not found for token');
        return res.status(404).json({ message: 'User not found' });
      }

      // Attach user to request object
      req.user = user;
      next();
    } catch (verifyError) {
      console.log('Token verification failed:', verifyError.message);
      
      // Handle different types of JWT errors
      if (verifyError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Unauthorized: Token expired' });
      } else if (verifyError.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
      }
      
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
  } catch (error) {
    console.log('Error in the protectRoute middleware: ', error.message);
    res.status(500).json({ message: 'Internal Server error' });
  }
};

module.exports = { protectRoute };