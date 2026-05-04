import { getPhysicsModelResult } from "../services/physics.service.js";
import { getRoadWeather } from "../services/weather.service.js";

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

    // 1. Get Real-time Weather / Road Condition
    const weatherData = await getRoadWeather(lat, lon);
    console.log(
      `[Physics] Weather at (${lat}, ${lon}): ${weatherData.condition} (Friction: ${weatherData.friction})`,
    );

    // 2. Run Physics Model with dynamic friction
    const result = await getPhysicsModelResult({
      seated,
      standing,
      speed,
      lat,
      lon,
      friction: weatherData.friction,
    });

    // Save for ML Training
    try {
        const { default: PhysicsTrainingData } = await import("../models/PhysicsTrainingData.model.js");
        await PhysicsTrainingData.create({
            inputs: { 
                seated, 
                standing, 
                speed, 
                lat, 
                lon,
                radius_m: parseFloat(result["Sharpest curve radius ahead"]?.replace("m","")) || 0,
                gradient: parseFloat(result["Road slope"]?.replace("°","")) || 0
            },
            outputs: {
                rollover_threshold_g: parseFloat(result["Rollover threshold"]?.replace("g","")) || 0,
                lateral_accel_g: parseFloat(result["Lateral accel"]?.replace("g","")) || 0,
                decision: result.decision || result["Decision"],
                stopping_distance: parseFloat(result["Total stopping distance"]?.replace("m","")) || 0
            },
            // Save weather data too!
            weather: {
                is_wet: weatherData.isWet,
                condition: weatherData.condition
            },
            source: "simulation"
        });
        console.log("Saved physics simulation data for training.");
    } catch (saveError) {
      console.error("Failed to save training data:", saveError);
    }

    // Add weather info to response
    result["Weather Condition"] = weatherData.condition;

    res.json(result);
  } catch (error) {
    next(error);
  }
};
