import express from "express";
import { upload } from "../services/cloudinary.service.js";
import Driver from "../models/Driver.model.js";
import axios from "axios";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// @desc    Register a new driver
// @route   POST /api/driver/register
// @access  Private (Authority only)
router.post(
    "/register",
    protect,
    authorize("authority"),
    upload.single("photo"),
    async (req, res) => {
        try {
            const { name, licenseNumber, contactNumber } = req.body;

            if (!req.file) {
                return res.status(400).json({ message: "Please upload a driver photo" });
            }

            // Check if driver exists
            const driverExists = await Driver.findOne({ licenseNumber });
            if (driverExists) {
                return res.status(400).json({ message: "Driver already exists" });
            }

            const photoUrl = req.file.path;

            // Call ML Service to get face encoding
            let faceEncoding = [];
            try {
                const mlResponse = await axios.post(
                    `${process.env.ML_SERVICE_URL}/api/ml/face-encoding`,
                    { imageUrl: photoUrl }
                );
                // Check if encoding is valid (non-null and has length)
                if (mlResponse.data.encoding && mlResponse.data.encoding.length > 0) {
                    faceEncoding = mlResponse.data.encoding;
                }
            } catch (mlError) {
                console.error("ML Service Error (Non-blocking):", mlError.message);
                // Continue without face encoding
            }

            const driver = await Driver.create({
                name,
                licenseNumber,
                contactNumber,
                photoUrl,
                faceEncoding,
            });

            res.status(201).json(driver);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Server Error" });
        }
    }
);

// @desc    Verify driver face
// @route   POST /api/driver/verify
// @access  Private (Conductor/Authority)
router.post("/verify", protect, upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Please upload an image to verify" });
        }

        const imageUrl = req.file.path;

        // Call ML Service to verify against known drivers
        const mlResponse = await axios.post(
            `${process.env.ML_SERVICE_URL}/api/ml/verify-face`,
            { imageUrl }
        );

        if (mlResponse.data.match) {
            res.json({
                verified: true,
                driverName: mlResponse.data.driverName,
                confidence: mlResponse.data.confidence
            });
        } else {
            res.json({ verified: false, message: "Driver not recognized" });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Verification failed" });
    }
});

// @desc    Get all drivers
// @route   GET /api/driver
// @access  Private (Authority)
router.get("/", protect, authorize("authority"), async (req, res) => {
    try {
        const drivers = await Driver.find({});
        res.json(drivers);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

// @desc    Re-upload driver photo for Face ID
// @route   POST /api/driver/reupload-photo
// @access  Private (Authority only)
router.post(
    "/reupload-photo",
    protect,
    authorize("authority"),
    upload.single("photo"),
    async (req, res) => {
        try {
            const { driverId } = req.body;

            if (!req.file) {
                return res.status(400).json({ message: "Please upload a driver photo" });
            }

            const driver = await Driver.findById(driverId);
            if (!driver) {
                return res.status(404).json({ message: "Driver not found" });
            }

            const photoUrl = req.file.path;

            // Call ML Service to get face encoding
            let faceEncoding = [];
            try {
                const mlResponse = await axios.post(
                    `${process.env.ML_SERVICE_URL}/api/ml/face-encoding`,
                    { imageUrl: photoUrl }
                );

                if (mlResponse.data.encoding && mlResponse.data.encoding.length > 0) {
                    faceEncoding = mlResponse.data.encoding;
                }
            } catch (mlError) {
                console.error("ML Service Error (Non-blocking):", mlError.message);
            }

            driver.photoUrl = photoUrl;
            driver.faceEncoding = faceEncoding;
            await driver.save();

            res.json(driver);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Server Error" });
        }
    }
);

export default router;
