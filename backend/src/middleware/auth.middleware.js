// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import SessionUser from '../models/SessionUserModel.js';
import { verifyToken } from '../lib/tokenUtils.js';

export const protectRoute = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;
    const sessionId = req.cookies.sessionId;

    if (!accessToken || !sessionId) {
      return res.status(401).json({ message: 'Unauthorized - No token or session provided' });
    }

    // Verify access token
    const decoded = verifyToken(accessToken, process.env.JWT_SECRET);

    // Verify session
    const session = await SessionUser.findOne({ userId: decoded.userId, sessionId });
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized - Invalid session' });
    }

    // Attach user to request
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    req.user = user;
    req.sessionId = sessionId;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const verifyRefreshToken = async (req, res, next) => {
  try {
    // Log request cookies to check if refreshToken is present
    // console.log('Cookies:', req.cookies);

    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      // console.log('No refresh token found in cookies');
      return res.status(401).json({ message: 'Unauthorized - No refresh token provided' });
    }

    // Log the refresh token
    // console.log('Received Refresh Token:', refreshToken);

    // Decode the token without verification for debugging
    const decodedRaw = jwt.decode(refreshToken);
    // console.log('Decoded Token (Raw, Unverified):', decodedRaw);

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      // console.log('Verified Token:', decoded);
    } catch (error) {
      // console.error('Token verification error:', error);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Unauthorized - Refresh token expired' });
      }
      return res.status(401).json({ message: 'Unauthorized - Invalid refresh token' });
    }

    // Ensure the token contains userId
    if (!decoded?.userId) {
      // console.log('Decoded token is missing userId:', decoded);
      return res.status(401).json({ message: 'Unauthorized - Invalid token payload' });
    }

    // Fetch user from database
    // console.log('Looking for user with ID:', decoded.userId);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      // console.log('User not found in database');
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if session exists
    // console.log('Checking session for user:', decoded.userId);
    const session = await SessionUser.findOne({ userId: decoded.userId });
    if (!session) {
      // console.log('Session not found or expired for user:', decoded.userId);
      return res.status(401).json({ message: 'Unauthorized - Session expired' });
    }

    // Attach user to request
    req.user = user;
    // console.log('User authenticated successfully:', user.email);
    next();
  } catch (error) {
    // console.error('Error in verifyRefreshToken middleware:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const validateCSRFToken = async (req, res, next) => {
  try {
    const csrfToken = req.headers['x-csrf-token'];
    const sessionId = req.cookies.sessionId;

    if (!csrfToken || !sessionId) {
      return res.status(401).json({ message: 'Unauthorized - No CSRF token or session provided' });
    }

    // Verify CSRF token
    const session = await SessionUser.findOne({ sessionId, csrfToken });
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized - Invalid CSRF token' });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};