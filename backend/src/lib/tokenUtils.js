//lib/tokenUtils.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Generate a token
export const generateToken = (userId, expiresIn, secret) => {
  return jwt.sign({ userId }, secret, { expiresIn });
};

// Verify a token
export const verifyToken = (token, secret) => {
  return jwt.verify(token, secret);
};

// Generate a random CSRF token
export const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Set secure cookies
export const setCookies = (res, tokens) => {
  const { accessToken, refreshToken, csrfToken, sessionId } = tokens;

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    maxAge: 1 * 60 * 1000, // 1 hour
  });

  res.cookie('refreshToken', refreshToken, {
    // httpOnly: true,
    secure: true,
    sameSite: 'None',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });

  res.cookie('csrfToken', csrfToken, {
    // httpOnly: true,
    secure: true,
    sameSite: 'None',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
  });
};