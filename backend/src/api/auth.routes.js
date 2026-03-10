import express from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  getSystemStats,
  getConductors,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post("/register", registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get token
 * @access  Public
 */
router.post("/login", loginUser);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
// Import middleware for checking authority role
import { isAuthority } from "../middleware/auth.middleware.js";

router.get("/profile", protect, getUserProfile);

/**
 * @route   GET /api/auth/stats
 * @desc    Get system statistics
 * @access  Private (Authority)
 */
router.get("/stats", protect, isAuthority, getSystemStats);

// Route to get all conductors
router.get("/conductors", protect, isAuthority, getConductors);

export default router;
