import { getPhysicsModelResult } from "../services/physics.service.js";

/**
 * @desc    Get physics model result (rollover, stopping distance, etc.)
 * @route   POST /api/bus/physics
 * @access  Private (All authenticated users)
 */
export const getPhysicsModel = async (req, res, next) => {
  try {
    const { seated, standing, speed, lat, lon } = req.body;
    if (
      seated === undefined ||
      standing === undefined ||
      speed === undefined ||
      lat === undefined ||
      lon === undefined
    ) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
    const result = await getPhysicsModelResult({
      seated,
      standing,
      speed,
      lat,
      lon,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};
