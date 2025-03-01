// lib/utils.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Generate JWT token
export const generateToken = (userId, expiresIn, secret) => {
  return jwt.sign({ userId }, secret, { expiresIn });
};

// Verify JWT token
export const verifyToken = (token, secret) => {
  return jwt.verify(token, secret); // Let it throw an error naturally
};
