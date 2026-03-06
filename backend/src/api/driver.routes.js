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
    authorize("authority", "admin"),
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

// @desc    Register face scan for an existing driver (multiple photos from different angles)
// @route   POST /api/driver/register-scan
// @access  Private (Authority only)
router.post(
    "/register-scan",
    protect,
    authorize("authority", "admin"),
    upload.array("photos", 10),
    async (req, res) => {
        try {
            const { driverId } = req.body;

            if (!driverId) {
                return res.status(400).json({ message: "Please select a driver" });
            }

            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ message: "Please upload at least one driver photo" });
            }

            // Find existing driver
            const driver = await Driver.findById(driverId);
            if (!driver) {
                return res.status(404).json({ message: "Driver not found" });
            }

            // All files are uploaded to Cloudinary, collect their URLs
            const photoUrls = req.files.map(f => f.path);

            // Call ML Service to register face scan with all images
            let isFaceRegistered = false;
            let mlResult = null;
            try {
                const mlResponse = await axios.post(
                    `${process.env.ML_SERVICE_URL}/api/face/register-scan`,
                    {
                        imageUrls: photoUrls,
                        name: driver.name,
                        driverId: driver.licenseNumber
                    }
                );
                mlResult = mlResponse.data;
                isFaceRegistered = true;
                console.log("Face Scan Registration success:", mlResult);
            } catch (mlError) {
                console.error("ML Service Error (Face Scan):", mlError.message);
            }

            // Update driver with face data and photo
            driver.faceEncoding = isFaceRegistered ? [1] : driver.faceEncoding;
            if (!driver.photoUrl) {
                driver.photoUrl = photoUrls[0];
            }
            await driver.save();

            res.status(200).json({
                ...driver.toObject(),
                scanResult: mlResult || null,
                totalPhotos: photoUrls.length,
            });
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
                res.json({
                    verified: true,
                    driverName: result.driver,
                    driverId: result.driver_id || null,
                    confidence: result.confidence || 100,
                    distance: result.distance || 0,
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
router.get("/", protect, authorize("authority", "admin"), async (req, res) => {
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
    authorize("authority", "admin"),
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

// @desc    Delete face data from ML pickle DB
// @route   POST /api/driver/face-delete
// @access  Private (Admin)
router.post("/face-delete", protect, authorize("authority", "admin"), async (req, res) => {
    try {
        const { driverId, name } = req.body;
        if (!driverId && !name) {
            return res.status(400).json({ message: "driverId or name is required" });
        }

        const payload = {};
        if (driverId) payload.driverId = driverId;
        if (name) payload.name = name;

        const mlResponse = await axios.post(
            `${process.env.ML_SERVICE_URL}/api/face/delete`,
            payload
        );

        // Also clear faceEncoding on matching Driver doc if driverId provided
        if (driverId) {
            await Driver.updateMany(
                { licenseNumber: driverId },
                { $set: { faceEncoding: [] } }
            );
        }

        res.json(mlResponse.data);
    } catch (error) {
        console.error("Face delete error:", error.message);
        res.status(500).json({ message: "Failed to delete face data" });
    }
});

// @desc    Update driver details (excluding photo/encoding re-calc for simplicity, unless photo provided)
// @route   PUT /api/driver/:id
// @access  Private (Authority)
router.put("/:id", protect, authorize("authority", "admin"), upload.single("photo"), async (req, res) => {
    try {
        const { name, licenseNumber, contactNumber } = req.body;
        const driver = await Driver.findById(req.params.id);

        if (!driver) {
            return res.status(404).json({ message: "Driver not found" });
        }

        const oldLicense = driver.licenseNumber;
        const nameChanged = name && name !== driver.name;
        const licenseChanged = licenseNumber && licenseNumber !== driver.licenseNumber;

        driver.name = name || driver.name;
        driver.licenseNumber = licenseNumber || driver.licenseNumber;
        driver.contactNumber = contactNumber || driver.contactNumber;

        // If Name or License changed, sync with ML Service
        if (nameChanged || licenseChanged) {
            try {
                await axios.post(`${process.env.ML_SERVICE_URL}/api/face/sync-driver`, {
                    oldDriverId: oldLicense,
                    newName: driver.name,
                    newDriverId: driver.licenseNumber
                });
                console.log(`ML Sync success for driver: ${driver.name}`);
            } catch (syncErr) {
                console.error("ML Sync failed:", syncErr.message);
            }
        }

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
router.delete("/:id", protect, authorize("authority", "admin"), async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver) {
            return res.status(404).json({ message: "Driver not found" });
        }

        // Notify ML Service to delete face data
        try {
            await axios.post(`${process.env.ML_SERVICE_URL}/api/face/delete`, {
                driverId: driver.licenseNumber
            });
        } catch (mlErr) {
            console.error("ML Delete failed:", mlErr.message);
        }

        await driver.deleteOne();
        res.json({ message: "Driver removed" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// @desc    Get registered drivers from ML face recognition pickle DB
// @route   GET /api/driver/face-db
// @access  Private (Authority/Admin)
router.get("/face-db", protect, authorize("authority", "admin"), async (req, res) => {
    try {
        const mlResponse = await axios.get(`${process.env.ML_SERVICE_URL}/api/face/drivers`);
        res.json(mlResponse.data);
    } catch (error) {
        console.error("ML face-db error:", error.message);
        res.status(503).json({ message: "Face recognition service unavailable" });
    }
});

// @desc    Reload Face_Recognition.pickle from disk
// @route   POST /api/driver/face-reload
// @access  Private (Authority/Admin)
router.post("/face-reload", protect, authorize("authority", "admin"), async (req, res) => {
    try {
        const mlResponse = await axios.post(`${process.env.ML_SERVICE_URL}/api/face/reload`);
        res.json(mlResponse.data);
    } catch (error) {
        console.error("ML face-reload error:", error.message);
        res.status(503).json({ message: "Face recognition service unavailable" });
    }
});

export default router;
