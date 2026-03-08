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

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
// CORS — allow all origins for pilot; restrict in production
const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/iot", iotRoutes);
app.use("/api/bus", busRoutes);
app.use("/api/maintenance", maintenanceRoutes);

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || "development"}`);
});
