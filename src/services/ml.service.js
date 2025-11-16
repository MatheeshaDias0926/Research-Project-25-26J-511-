import axios from "axios";

// Python ML Service Configuration
const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL || "http://localhost:5001/predict";
const ML_SERVICE_TIMEOUT = 10000; // 10 seconds timeout

/**
 * @desc    Call the Python ML model service for occupancy prediction.
 * @param   {string} routeId - Bus route identifier.
 * @param   {number} stopId - Bus stop number (1,2,3,4......10).
 * @param   {string} dayOfWeek - Day of the week (Sunday, Monday, etc.).
 * @param   {string} timeOfDay - Time bin (e.g., '8-10', '18-20').
 * @param   {string} weather - Weather condition (rain/not_rain).
 * @returns {Promise<object>} - An object with prediction data.
 */
export const getOccupancyPrediction = async (
  routeId,
  stopId,
  dayOfWeek,
  timeOfDay,
  weather
) => {
  console.log(
    `[ML Service] Requesting prediction for route ${routeId}, stop ${stopId}, ${dayOfWeek} at ${timeOfDay}, weather: ${weather}`
  );

  try {
    // Call Python ML service
    const response = await axios.post(
      ML_SERVICE_URL,
      {
        route_id: routeId,
        stop_id: stopId,
        day_of_week: dayOfWeek,
        time_of_day: timeOfDay,
        weather: weather,
      },
      {
        timeout: ML_SERVICE_TIMEOUT,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // Return the prediction data from Python service
    return {
      routeId: response.data.route_id,
      stopId: response.data.stop_id,
      dayOfWeek: response.data.day_of_week,
      timeOfDay: response.data.time_of_day,
      weather: response.data.weather,
      predictedOccupancy: response.data.predicted_occupancy,
      confidence: response.data.confidence,
    };
  } catch (error) {
    console.error(`[ML Service] Error: ${error.message}`);

    // Check if it's a network/connection error
    if (error.code === "ECONNREFUSED") {
      console.error(
        "[ML Service] Cannot connect to Python ML service. Make sure it is running on port 5001."
      );
    }

    // Fallback to mock data if service is unavailable
    console.log("[ML Service] Falling back to mock prediction");
    const mockPrediction = Math.floor(Math.random() * (55 - 20 + 1)) + 20;

    return {
      routeId,
      stopId,
      dayOfWeek,
      timeOfDay,
      weather,
      predictedOccupancy: mockPrediction,
      confidence: 0.5, // Lower confidence for mock data
      warning: "Using mock data - ML service unavailable",
      error: error.message,
    };
  }
};
