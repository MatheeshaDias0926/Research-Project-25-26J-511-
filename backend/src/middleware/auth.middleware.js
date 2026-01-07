import jwt from "jsonwebtoken";
import User from "../models/User.model.js";

/**
 * @desc    Protect routes - Verify JWT token
 */
export const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extract token from Bearer <token>
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token (exclude password)
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }

      next();
    } catch (error) {
      console.error(
        "[Auth Middleware] Token verification failed:",
        error.message
      );
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: "Not authorized, no token provided" });
  }
};

/**
 * @desc    Check if user is a passenger
 */
export const isPassenger = (req, res, next) => {
  if (req.user && req.user.role === "passenger") {
    next();
  } else {
    res
      .status(403)
      .json({ message: "Access denied. Passenger role required." });
  }
};

/**
 * @desc    Check if user is a conductor
 */
export const isConductor = (req, res, next) => {
  if (req.user && req.user.role === "conductor") {
    next();
  } else {
    res
      .status(403)
      .json({ message: "Access denied. Conductor role required." });
  }
};

/**
 * @desc    Check if user is an authority
 */
export const isAuthority = (req, res, next) => {
  if (req.user && req.user.role === "authority") {
    next();
  } else {
    res
      .status(403)
      .json({ message: "Access denied. Authority role required." });
  }
};

/**
 * @desc    Check if user is conductor or authority
 */
export const isConductorOrAuthority = (req, res, next) => {
  if (
    req.user &&
    (req.user.role === "conductor" || req.user.role === "authority")
  ) {
    next();
  } else {
    res
      .status(403)
      .json({
        message: "Access denied. Conductor or Authority role required.",
      });
  }
};

/**
 * @desc    Check if user has one of the required roles
 * @param   {...String} roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};
