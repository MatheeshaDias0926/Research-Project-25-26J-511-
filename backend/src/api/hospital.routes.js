import express from "express";
import Hospital from "../models/Hospital.model.js";
import { protect, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// Get all hospitals
router.get("/", protect, async (req, res) => {
  try {
    const hospitals = await Hospital.find().sort("name");
    res.json({ hospitals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get hospital by ID
router.get("/:id", protect, async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: "Hospital not found" });
    }
    res.json(hospital);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new hospital
router.post("/", protect, isAdmin, async (req, res) => {
  try {
    const hospital = new Hospital(req.body);
    await hospital.save();
    res.status(201).json(hospital);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update hospital
router.put("/:id", protect, isAdmin, async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!hospital) {
      return res.status(404).json({ error: "Hospital not found" });
    }
    res.json(hospital);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete hospital
router.delete("/:id", protect, isAdmin, async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndDelete(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: "Hospital not found" });
    }
    res.json({ message: "Hospital deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
