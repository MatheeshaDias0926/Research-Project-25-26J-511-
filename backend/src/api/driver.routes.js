import express from "express";
import { upload } from "../services/cloudinary.service.js";
import Driver from "../models/Driver.model.js";
import axios from "axios";
import fs from "fs";
import path from "path";
import { localUpload } from "../services/local.upload.service.js";
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

            // Call ML Service to register face with Face Mesh
            let isFaceRegistered = false;
            try {
                // We use licenseNumber as the unique driver_id for Face DB
                const mlResponse = await axios.post(
                    `${process.env.ML_SERVICE_URL}/api/face/register`,
                    {
                        imageUrl: photoUrl,
                        name: name,
                        driverId: licenseNumber
                    }
                );
                console.log("Face Mesh Registration success:", mlResponse.data);
                isFaceRegistered = true;
            } catch (mlError) {
                console.error("ML Service Error (Face Mesh):", mlError.message);
                // We continue, but maybe warn?
            }

            const driver = await Driver.create({
                name,
                licenseNumber,
                contactNumber,
                photoUrl,
                // Use [1] to indicate 'Active' status to frontend, since we don't store raw encoding here anymore
                faceEncoding: isFaceRegistered ? [1] : [],
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
// Using local upload to avoid filling Cloudinary with temporary scan images
router.post("/verify", protect, localUpload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Please upload an image to verify" });
        }

        const imagePath = path.resolve(req.file.path); // Use absolute path for Python script

        // Use the new Face Mesh Verify Endpoint
        try {
            // ML Service expects 'imageUrl'. for local files, we might need to serve it or send base64.
            // However, FaceLandmarkRecognition._load_image handles local paths if os.path.exists is true.
            // Since ML Service and Backend are likely on same machine in this setup (localhost), path works.
            // If they were separate containers, we'd need to upload or send bytes.

            const mlResponse = await axios.post(
                `${process.env.ML_SERVICE_URL}/api/face/verify`,
                { imageUrl: imagePath }
            );

            // Cleanup file immediately after scoring
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

            const result = mlResponse.data;

            if (result.verified) {
                // fetch full driver details from DB if needed, but result.driver has the name
                res.json({
                    verified: true,
                    driverName: result.driver,
                    confidence: 100, // Face Mesh binary match usually, or we can get score
                    message: "Driver verified successfully"
                });
            } else {
                res.json({
                    verified: false,
                    message: result.message || "Access Denied",
                    driverName: "Unknown",
                    confidence: 0
                });
            }

        } catch (mlError) {
            console.error("ML Service Verification Error:", mlError.message);
            // Cleanup file
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
            return res.json({ verified: false, message: "Face Verification Service Failed" });
        }

    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ message: "Verification failed on server" });
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

            // Call ML Service to register face
            let isFaceRegistered = false;
            try {
                await axios.post(
                    `${process.env.ML_SERVICE_URL}/api/face/register`,
                    {
                        imageUrl: photoUrl,
                        name: driver.name,
                        driverId: driver.licenseNumber
                    }
                );
                isFaceRegistered = true;
            } catch (mlError) {
                console.error("ML Service Error (Non-blocking):", mlError.message);
            }

            driver.photoUrl = photoUrl;
            driver.faceEncoding = isFaceRegistered ? [1] : []; // Mark as active if success
            await driver.save();

            res.json(driver);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Server Error" });
        }
    }
);

// @desc    Update driver details (excluding photo/encoding re-calc for simplicity, unless photo provided)
// @route   PUT /api/driver/:id
// @access  Private (Authority)
router.put("/:id", protect, authorize("authority"), upload.single("photo"), async (req, res) => {
    try {
        const { name, licenseNumber, contactNumber } = req.body;
        const driver = await Driver.findById(req.params.id);

        if (!driver) {
            return res.status(404).json({ message: "Driver not found" });
        }

        driver.name = name || driver.name;
        driver.licenseNumber = licenseNumber || driver.licenseNumber;
        driver.contactNumber = contactNumber || driver.contactNumber;

        if (req.file) {
            driver.photoUrl = req.file.path;

            try {
                await axios.post(
                    `${process.env.ML_SERVICE_URL}/api/face/register`,
                    {
                        imageUrl: driver.photoUrl,
                        name: driver.name,
                        driverId: driver.licenseNumber
                    }
                );
                driver.faceEncoding = [1]; // Mark active
            } catch (mlError) {
                console.error("ML Service Error (Update):", mlError.message);
                driver.faceEncoding = []; // Reset on error
            }
        }

        await driver.save();
        res.json(driver);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// @desc    Delete driver
// @route   DELETE /api/driver/:id
// @access  Private (Authority)
router.delete("/:id", protect, authorize("authority"), async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver) {
            return res.status(404).json({ message: "Driver not found" });
        }

        await driver.deleteOne();
        res.json({ message: "Driver removed" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

export default router;
