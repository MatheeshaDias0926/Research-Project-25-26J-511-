import express from "express";
import {
  ingestIoTData,
  ingestMockData,
  receiveGpsFeed,
  getActiveGpsFeeds,
  receiveOverlandGps,
  receiveCvEvent,
} from "../controllers/iot.controller.js";

const router = express.Router();

/**
 * @route   POST /api/iot/cv-event
 * @desc    Receive CV passenger count events (IN/OUT) from ML tracking script
 * @access  Public
 */
router.post("/cv-event", receiveCvEvent);
/**
 * @route   GET /api/iot/bus/:licensePlate
 * @desc    Fetch initial bus occupancy for the CV tracking script
 * @access  Public
 */
router.get("/bus/:licensePlate", async (req, res) => {
  try {
    const Bus = (await import("../models/Bus.model.js")).default;
    const bus = await Bus.findOne({ licensePlate: req.params.licensePlate });
    if (!bus) return res.status(404).json({ error: "Bus not found" });
    res.json({ currentOccupancy: bus.currentOccupancy || 0 });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

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

/**
 * @route   POST /api/iot/overland
 * @desc    Receive GPS data from Overland iOS app (GeoJSON batch)
 * @access  Public (from phone running Overland)
 *
 * Configure Overland URL as:
 *   http://<MAC_IP>:3000/api/iot/overland?licensePlate=NA-1234
 */
router.post("/overland", receiveOverlandGps);

export default router;
