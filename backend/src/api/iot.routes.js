import express from "express";
import { ingestMockData } from "../controllers/iot.controller.js";

const router = express.Router();

/**
 * @route   POST /api/iot/mock-data
 * @desc    Ingest mock IoT data from a device
 * @access  Public (for now - consider adding API key authentication)
 *
 * Note: In production, you should secure this endpoint with:
 * - API key authentication
 * - IP whitelisting
 * - Rate limiting
 */
router.post("/mock-data", ingestMockData);

export default router;
