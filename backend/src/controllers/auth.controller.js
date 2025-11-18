import jwt from "jsonwebtoken";
import User from "../models/User.model.js";

/**
 * Generate JWT Token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d", // Token expires in 30 days
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = async (req, res, next) => {
  const { username, password, role } = req.body;

  try {
    // Validate input
    if (!username || !password) {
      res.status(400);
      throw new Error("Please provide username and password");
    }

    // Check if user already exists
    const userExists = await User.findOne({ username });
    if (userExists) {
      res.status(400);
      throw new Error("Username already exists");
    }

    // Validate role
    const validRoles = ["passenger", "conductor", "authority"];
    if (role && !validRoles.includes(role)) {
      res.status(400);
      throw new Error(
        "Invalid role. Must be passenger, conductor, or authority"
      );
    }

    // Create user
    const user = await User.create({
      username,
      password,
      role: role || "passenger",
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400);
      throw new Error("Invalid user data");
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req, res, next) => {
  const { username, password } = req.body;

  try {
    // Validate input
    if (!username || !password) {
      res.status(400);
      throw new Error("Please provide username and password");
    }

    // Find user by username
    const user = await User.findOne({ username });

    // Check if user exists and password matches
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401);
      throw new Error("Invalid username or password");
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (user) {
      res.json(user);
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  } catch (error) {
    next(error);
  }
};
