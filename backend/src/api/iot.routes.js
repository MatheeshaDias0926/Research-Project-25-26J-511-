import express from "express";
import {
  ingestIoTData,
  ingestMockData,
  receiveGpsFeed,
  getActiveGpsFeeds,
} from "../controllers/iot.controller.js";

const router = express.Router();

/**
 * @route   POST /api/iot/gps-feed
 * @desc    Receive GPS data from mobile app (phone GPS)
 * @access  Public (from conductor's phone)
 *
 * Body: { licensePlate, lat, lon, speed }
 */
router.post("/gps-feed", receiveGpsFeed);

/**
 * @route   GET /api/iot/gps-feeds
 * @desc    Get all active GPS feeds (monitoring)
 * @access  Public
 */
router.get("/gps-feeds", getActiveGpsFeeds);

/**
 * @route   POST /api/iot/iot-data
 * @desc    Ingest real-time IoT data from ESP32 device
 *          Auto-fills GPS from phone cache + auto-runs ML safety pipeline
 * @access  Public
 */
router.post("/iot-data", ingestIoTData);

/**
 * @route   POST /api/iot/mock-data
 * @desc    Ingest mock IoT data for simulator (legacy endpoint)
 * @access  Public
 */
router.post("/mock-data", ingestMockData);

export default router;
