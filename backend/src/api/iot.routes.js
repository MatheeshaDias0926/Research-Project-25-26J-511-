import express from "express";
import {
  ingestIoTData,
  updatePhoneGPS,
} from "../controllers/iot.controller.js";
import { verifyApiKey } from "../middleware/apikey.middleware.js";
import {
  protect,
  isConductorOrAuthority,
} from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route   POST /api/iot/iot-data
 * @desc    Ingest real-time IoT data from ESP32 device
 * @access  Protected by API key (X-API-Key header)
 */
router.post("/iot-data", verifyApiKey, ingestIoTData);

/**
 * @route   POST /api/iot/mock-data
 * @desc    Ingest mock IoT data for testing (legacy endpoint)
 * @access  Protected by API key
 */
router.post("/mock-data", verifyApiKey, ingestIoTData);

/**
 * @route   POST /api/iot/phone-gps
 * @desc    Update bus GPS from conductor's phone (fallback for no GPS sensor)
 * @access  Protected by JWT (conductor/authority)
 */
router.post("/phone-gps", protect, isConductorOrAuthority, updatePhoneGPS);

export default router;
