import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";

// Import Routes
import authRoutes from "./api/auth.routes.js";
import iotRoutes from "./api/iot.routes.js";
import busRoutes from "./api/bus.routes.js";
import maintenanceRoutes from "./api/maintenance.routes.js";
import crashRoutes from "./api/crash.routes.js";

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Body parser for JSON
app.use(express.urlencoded({ extended: true })); // Body parser for URL-encoded data

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/iot", iotRoutes);
app.use("/api/bus", busRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/crashes", crashRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Smart Bus API is running...",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      iot: "/api/iot",
      bus: "/api/bus",
      maintenance: "/api/maintenance",
    },
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

// Error Handling Middleware (must be last)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || "development"}`);
});
