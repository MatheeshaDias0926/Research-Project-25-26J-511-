import "dotenv/config"; // Must be first — loads .env before other imports
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import connectDB from "./config/db.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import Routes
import authRoutes from "./api/auth.routes.js";
import iotRoutes from "./api/iot.routes.js";
import busRoutes from "./api/bus.routes.js";
import maintenanceRoutes from "./api/maintenance.routes.js";
import driverRoutes from "./api/driver.routes.js";
import edgeDeviceRoutes from "./api/edgeDevice.routes.js";
import sosRoutes from "./api/sos.routes.js";
import attendanceRoutes from "./api/attendance.routes.js";
import assignmentRoutes from "./api/assignment.routes.js";

// Connect to Database (non-blocking — server starts even if DB is temporarily down)
connectDB();

// Keep server alive on unhandled MongoDB/network errors
process.on("unhandledRejection", (err) => {
  console.error(`[Unhandled Rejection] ${err.message}`);
});

const app = express();

// Middleware
app.use(cors()); // Allow cross-origin requests
app.use(express.json({ limit: "10mb" })); // Body parser for JSON (10mb for Pi base64 images)
app.use(express.urlencoded({ extended: true, limit: "10mb" })); // Body parser for URL-encoded data

// ── Traccar Client catch-all: accept GPS at ANY path with lat/lon query params ──
// Traccar Client (OsmAnd protocol) may send to  /?id=X&lat=Y&lon=Z  or  /gps-update?...
app.use((req, res, next) => {
  if (req.query.lat && req.query.lon && (req.query.id || req.query.deviceId)) {
    console.log(`[GPS-TRACCAR] ${req.method} ${req.originalUrl}`);
    // Forward to the gps-update handler
    req.url = "/api/edge-devices/gps-update" + (req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "");
  }
  next();
});

// Serve static files (GPS tracker page, etc.)
app.use(express.static(path.join(__dirname, "public")));

// Shortcut: /tracker → gps-tracker.html
app.get("/tracker", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "gps-tracker.html"));
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/iot", iotRoutes);
app.use("/api/bus", busRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/edge-devices", edgeDeviceRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/assignments", assignmentRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Smart Bus API is running...",
    version: "2.0.0",
    endpoints: {
      auth: "/api/auth",
      iot: "/api/iot",
      bus: "/api/bus",
      maintenance: "/api/maintenance",
      driver: "/api/driver",
      edgeDevices: "/api/edge-devices",
      sos: "/api/sos",
      attendance: "/api/attendance",
      assignments: "/api/assignments",
    },
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1
      ? "Connected"
      : mongoose.connection.readyState === 2
      ? "Connecting"
      : mongoose.connection.readyState === 0
      ? "Disconnected"
      : "Disconnecting";

  res.json({
    status: "OK",
    mongodb: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

import os from "os";

// Error Handling Middleware (must be last)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const iface of Object.values(nets)) {
    for (const cfg of iface) {
      if (cfg.family === "IPv4" && !cfg.internal) ips.push(cfg.address);
    }
  }
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`[Server] Local:   http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`[Server] Network: http://${ip}:${PORT}`));
});
