import User from "../models/user.model.js";
import SessionUser from "../models/SessionUserModel.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import cloudinary from "../lib/cloudinary.js";
import { reSendPasswordSetupEmail } from "../service/emailService.js";
import { sendOTPEmail } from "../service/emailService.js";
import { generateToken, generateCSRFToken, setCookies, verifyToken } from '../lib/tokenUtils.js';
import axios from 'axios';

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate and send OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    await user.encryptOTP(otp); // Encrypt and store OTP
    await sendOTPEmail(email, otp); // Send OTP via email

    res.status(200).json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    // console.log("Error in login controller", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const verifyOTPAndLogin = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email' });
    }

    // Verify OTP
    const isOTPValid = await user.verifyOTP(otp);
    if (!isOTPValid || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Clear OTP after successful verification
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // Fetch and normalize the client's IP address
    let clientIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Normalize localhost IP
    if (clientIp === '::1' || clientIp === '127.0.0.1') {
      clientIp = '127.0.0.1'; // Use IPv4 loopback for consistency
    } else {
      // Fetch public IP for non-localhost environments
      try {
        const publicIpResponse = await axios.get('https://api.ipify.org?format=json');
        clientIp = publicIpResponse.data.ip;
      } catch (error) {
        console.error('Error fetching public IP:', error);
        clientIp = req.ip; // Fallback to the original IP if fetching fails
      }
    }

    // Generate tokens and session
    const sessionId = crypto.randomBytes(16).toString('hex');
    const csrfToken = generateCSRFToken();
    const accessToken = generateToken(user._id, '1m', process.env.JWT_SECRET);
    const refreshToken = generateToken(user._id, '7d', process.env.JWT_REFRESH_SECRET);

    // Store session in the database
    await SessionUser.create({
      userId: user._id,
      sessionId,
      csrfToken,
      ipAddress: clientIp,
    });

    // Set cookies
    setCookies(res, { accessToken, refreshToken, csrfToken, sessionId });

    // Return user data
    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const checkAuth = (req, res) => {
  try {
    console.log('CSRF Token:', req.cookies.csrfToken);
    console.log('Session ID:', req.cookies.sessionId);
    res.status(200).json(req.user);
  } catch (error) {
    // console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    // console.log("Refresh token called with:", refreshToken);

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    // Verify the refresh token
    let decoded;
    try {
      decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({ message: "Unauthorized - Invalid refresh token" });
    }

    // Find user session
    const session = await SessionUser.findOne({ userId: decoded.userId });
    if (!session) {
      return res.status(401).json({ message: "Unauthorized - Session expired" });
    }

    // Generate a new access token
    const accessToken = generateToken(decoded.userId, "15m", process.env.JWT_SECRET);
    console.log("New access token generated:", accessToken);

    // Set the new access token in cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.status(200).json({ message: "Token refreshed successfully" });
  } catch (error) {
    // console.log("Error in refreshToken controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    // Clear all cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.clearCookie("sessionId");
    res.clearCookie("csrfToken");
    res.clearCookie("csrfTokenHeader");

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    // console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });

    if (user) return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    if (newUser) {
      // generate jwt token here
      generateToken(newUser._id, "15m");
      await newUser.save();

      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    // console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    // console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getDisappearSettings = async (req, res) => {
  try {
    // console.log("Fetching disappear settings for user:", req.params.userId); // Debug log
    const userId = req.params.userId;
    const user = await User.findById(userId).select("disappearSettings");
    res.status(200).json({ disappearSettings: user.disappearSettings });
  } catch (error) {
    // console.error("Error fetching disappear settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateDisappearSettings = async (req, res) => {
  try {
    // console.log("Updating disappear settings for user:", req.params.userId); // Debug log
    const userId = req.params.userId;
    const { contactId, setting } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update the disappear settings for the contact
    user.disappearSettings.set(contactId, setting);
    await user.save();

    res.status(200).json({ message: "Disappear settings updated successfully" });
  } catch (error) {
    // console.error("Error updating disappear settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const resendPasswordSetupLink = async (req, res) => {
  const { token } = req.body; // Extract token from request body

  // console.log(token);
  try {
    const user = await User.findOne({
      passwordSetupToken: token,
    });

    if (!user) {
      return res.status(404).json({ message: 'Invalid or expired token' });
    }

    // Generate a new token and set expiration
    const newToken = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    user.passwordSetupToken = newToken;
    user.passwordSetupExpires = expires;

    await user.save();

    // Send the new password setup link via email
    const passwordSetupLink = `${process.env.CLIENT_URL}/set-password?token=${newToken}`;
    await reSendPasswordSetupEmail(user.email, passwordSetupLink);

    res.status(200).json({ message: 'A new password setup link has been sent to your email.' });
  } catch (error) {
    // console.error('Error resending password setup link:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const validateToken = async (req, res) => {
  const { token } = req.query; // Extract token from query params

  try {
    const user = await User.findOne({
      passwordSetupToken: token,
      passwordSetupExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    res.status(200).json({ email: user.email });
  } catch (error) {
    // console.error("Token validation error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const setPassword = async (req, res) => {
  const { token } = req.query; // Extract token from URL query params
  const { password } = req.body;

  try {
    // console.log('Setting password for token:', token);

    const user = await User.findOne({
      passwordSetupToken: token,
      passwordSetupExpires: { $gt: Date.now() },
    });

    // console.log('User found:', user);

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user.password = hashedPassword;
    user.passwordSetupToken = undefined;
    user.passwordSetupExpires = undefined;

    await user.save();

    res.status(200).json({ message: 'Password set successfully' });
  } catch (error) {
    // console.error('Set Password Error:', error);
    res.status(500).json({ message: 'Error setting password' });
  }
};
