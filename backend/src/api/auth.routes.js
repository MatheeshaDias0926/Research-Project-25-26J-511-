import express from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  getSystemStats,
  getConductors,
  getDriverUsers,
  getAllUsers,
  adminCreateUser,
  deleteUser,
  updateUser,
} from "../controllers/auth.controller.js";
import { protect, isAuthority, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (self-register as passenger)
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
router.get("/profile", protect, getUserProfile);

/**
 * @route   GET /api/auth/stats
 * @desc    Get system statistics
 * @access  Private (Admin)
 */
router.get("/stats", protect, isAdmin, getSystemStats);

/**
 * @route   GET /api/auth/conductors
 * @desc    Get all conductors
 * @access  Private (Admin)
 */
router.get("/conductors", protect, isAdmin, getConductors);

/**
 * @route   GET /api/auth/drivers
 * @desc    Get all driver user accounts
 * @access  Private (Admin)
 */
router.get("/drivers", protect, isAdmin, getDriverUsers);

/**
 * @route   GET /api/auth/users
 * @desc    Get all users (optionally filter by role)
 * @access  Private (Admin)
 */
router.get("/users", protect, isAdmin, getAllUsers);

/**
 * @route   POST /api/auth/admin/create-user
 * @desc    Admin creates a conductor or driver user account
 * @access  Private (Admin)
 */
router.post("/admin/create-user", protect, isAdmin, adminCreateUser);

/**
 * @route   DELETE /api/auth/users/:id
 * @desc    Delete a user
 * @access  Private (Admin)
 */
router.delete("/users/:id", protect, isAdmin, deleteUser);

/**
 * @route   PUT /api/auth/users/:id
 * @desc    Update a user
 * @access  Private (Admin)
 */
router.put("/users/:id", protect, isAdmin, updateUser);

export default router;
