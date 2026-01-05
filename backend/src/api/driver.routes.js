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

// Helper for Euclidean distance
function getEuclideanDistance(face1, face2) {
    if (!face1 || !face2 || face1.length !== face2.length) return 100.0;
    let sum = 0.0;
    for (let i = 0; i < face1.length; i++) {
        sum += Math.pow(face1[i] - face2[i], 2);
    }
    return Math.sqrt(sum);
}

// @desc    Verify driver face
// @route   POST /api/driver/verify
// @access  Private (Conductor/Authority)
router.post("/verify", protect, upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Please upload an image to verify" });
        }

        const imageUrl = req.file.path;

        // 1. Get encoding of the PROBE image from ML Service
        let probeEncoding = null;
        try {
            const mlResponse = await axios.post(
                `${process.env.ML_SERVICE_URL}/api/ml/face-encoding`,
                { imageUrl }
            );
            if (mlResponse.data.encoding && mlResponse.data.encoding.length > 0) {
                probeEncoding = mlResponse.data.encoding;
            }
        } catch (mlError) {
            console.error("ML Service Encoding Error:", mlError.message);
            // If ML fails to find a face, we can't verify
            return res.json({ verified: false, message: "No face detected in image" });
        }

        if (!probeEncoding) {
            return res.json({ verified: false, message: "No face detected in image" });
        }

        // 2. Fetch all drivers with encodings
        // Optimization: In a real system, use MongoDB vector search or similar. 
        // Here we iterate in memory as driver count is small.
        const drivers = await Driver.find({
            faceEncoding: { $exists: true, $not: { $size: 0 } },
            status: 'active'
        });

        // 3. Compare
        let bestMatch = null;
        let minDistance = 1000.0; // Increase init max

        // Determine threshold based on vector size
        // 128-d (FaceNet) -> ~0.6
        // 1024-d (32x32 Pixel) -> ~10.0 (Tunable)
        let THRESHOLD = 0.6;
        if (probeEncoding.length > 200) {
            THRESHOLD = 12.0; // Higher threshold for pixel matching
        }

        for (const driver of drivers) {
            // Skip mismatched formats
            if (!driver.faceEncoding || driver.faceEncoding.length !== probeEncoding.length) continue;

            const dist = getEuclideanDistance(probeEncoding, driver.faceEncoding);
            if (dist < minDistance) {
                minDistance = dist;
                bestMatch = driver;
            }
        }

        if (bestMatch && minDistance < THRESHOLD) {
            // Calculate confidence
            let confidence = 0;
            if (probeEncoding.length > 200) {
                // Confidence for pixel match: Max dist ~20?
                confidence = Math.max(0, 1 - (minDistance / 15.0));
            } else {
                confidence = Math.max(0, 1 - minDistance);
            }

            res.json({
                verified: true,
                driverName: bestMatch.name,
                confidence: confidence,
                message: "Driver verified successfully"
            });
        } else {
            res.json({
                verified: false,
                message: "Driver not recognized",
                debugDistance: minDistance
            });
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
            // Note: In a full implementation, we might want to re-run face encoding here
            // For now, we'll reset encoding if photo changes so they have to re-verify
            // or we could trigger the ML service again. Let's trigger ML for better UX.
            try {
                const mlResponse = await axios.post(
                    `${process.env.ML_SERVICE_URL}/api/ml/face-encoding`,
                    { imageUrl: driver.photoUrl }
                );
                if (mlResponse.data.encoding && mlResponse.data.encoding.length > 0) {
                    driver.faceEncoding = mlResponse.data.encoding;
                } else {
                    driver.faceEncoding = []; // Reset if no face found
                }
            } catch (mlError) {
                console.error("ML Service Error (Update):", mlError.message);
                driver.faceEncoding = []; // Reset on error/no-face
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
