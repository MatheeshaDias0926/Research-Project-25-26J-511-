import axios from "axios";

// Python ML Service Configuration
const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL || "http://localhost:5001/predict";
const ML_SERVICE_TIMEOUT = 10000; // 10 seconds timeout


/**
 * @desc    Call the Python ML model for Safety Prediction (Rollover/Stopping).
 * @param   {object} features - { n_seated, n_standing, speed_kmh, radius_m, is_wet, gradient_deg }
 * @returns {Promise<object>} - { risk_score, stopping_distance, source }
 */
export const getSafetyPrediction = async (features) => {
  try {
    const response = await axios.post(
      `${ML_SERVICE_URL.replace("/predict", "/predict-safety")}`,
      features,
      {
        timeout: 2000, // Fast timeout for real-time safety
        headers: { "Content-Type": "application/json" },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`[ML Service] Safety Predict Error: ${error.message}`);
    // Fallback: Zero values if ML fails (clearly indicating no prediction)
    return {
      risk_score: 0,
      stopping_distance: 0,
      source: "Fallback_ML_Unavailable",
      error: error.message,
    };
  }
};
