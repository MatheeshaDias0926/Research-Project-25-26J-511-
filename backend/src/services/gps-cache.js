/**
 * In-Memory GPS Cache Service
 * Stores latest GPS coordinates and speed from mobile app per bus license plate.
 * Used to fill in GPS data when ESP32 sends IoT data without a GPS module.
 */

// Map<licensePlate, { lat, lon, speed, timestamp }>
const gpsCache = new Map();

/**
 * Update GPS data for a bus (called when mobile app sends GPS feed)
 * @param {string} licensePlate
 * @param {number} lat
 * @param {number} lon
 * @param {number} speed - Speed in km/h from phone GPS
 */
export const updateGps = (licensePlate, lat, lon, speed = 0) => {
  gpsCache.set(licensePlate, {
    lat,
    lon,
    speed,
    timestamp: Date.now(),
  });
};

/**
 * Get latest GPS data for a bus
 * @param {string} licensePlate
 * @returns {{ lat: number, lon: number, speed: number, timestamp: number } | null}
 */
export const getLatestGps = (licensePlate) => {
  const data = gpsCache.get(licensePlate);
  if (!data) return null;

  // Consider GPS stale if older than 30 seconds
  const ageMs = Date.now() - data.timestamp;
  if (ageMs > 30000) {
    console.log(
      `[GPS Cache] Data for ${licensePlate} is stale (${(ageMs / 1000).toFixed(0)}s old)`
    );
    return null;
  }

  return data;
};

/**
 * Check if GPS feed is active for a bus
 * @param {string} licensePlate
 * @returns {boolean}
 */
export const isGpsFeedActive = (licensePlate) => {
  return getLatestGps(licensePlate) !== null;
};

/**
 * Get all active GPS feeds (for monitoring)
 * @returns {Array<{ licensePlate: string, lat: number, lon: number, speed: number, ageMs: number }>}
 */
export const getAllActiveFeeds = () => {
  const feeds = [];
  const now = Date.now();
  for (const [licensePlate, data] of gpsCache.entries()) {
    const ageMs = now - data.timestamp;
    if (ageMs <= 30000) {
      feeds.push({ licensePlate, ...data, ageMs });
    }
  }
  return feeds;
};

export default { updateGps, getLatestGps, isGpsFeedActive, getAllActiveFeeds };
