// routes/authRoutes.js
import express from "express";
import { login, verifyOTPAndLogin, refreshToken, logout, signup, updateProfile, checkAuth, getDisappearSettings, updateDisappearSettings, setPassword, resendPasswordSetupLink, validateToken } from "../controllers/auth.controller.js";
import { protectRoute, verifyRefreshToken, validateCSRFToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-otp", verifyOTPAndLogin); // New route
router.post('/refresh-token', verifyRefreshToken, refreshToken);
router.post("/logout", logout);
router.put("/update-profile", protectRoute, updateProfile);
router.get("/check", protectRoute, validateCSRFToken, checkAuth);
router.get("/:userId/disappear-settings", getDisappearSettings);
router.post("/:userId/disappear-settings", updateDisappearSettings);
router.post("/set-password", setPassword);
router.post("/resend-password-link", resendPasswordSetupLink);
router.get("/validate-token", validateToken);

export default router;