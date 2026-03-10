/**
 * Physics Result Cache
 *
 * Caches physics model results by geohash (approximate location) + speed range + passenger category.
 * Road geometry doesn't change in seconds — a bus 50m down the same road sees the same curves.
 *
 * Cache key: `${geohash}_${speedBucket}_${passengerBucket}`
 * TTL: 30 seconds (road geometry is static, but bus moves)
 */

const physicsCache = new Map();

const CACHE_TTL_MS = 30_000; // 30 seconds
const MAX_CACHE_SIZE = 500;

/**
 * Simple geohash: rounds lat/lon to ~50m precision
 * At equator, 0.0005° lat ≈ 55m, 0.0005° lon ≈ 55m
 */
function geoHash(lat, lon) {
  const latRound = Math.round(lat / 0.0005) * 0.0005;
  const lonRound = Math.round(lon / 0.0005) * 0.0005;
  return `${latRound.toFixed(4)}_${lonRound.toFixed(4)}`;
}

/**
 * Bucket speed into 5 km/h ranges (physics output doesn't change much within 5 km/h)
 */
function speedBucket(speed) {
  return Math.round(speed / 5) * 5;
}

/**
 * Bucket passengers: seated/standing into rough categories
 */
function passengerBucket(seated, standing) {
  const seatBucket = Math.round(seated / 10) * 10;
  const standBucket = Math.round(standing / 5) * 5;
  return `${seatBucket}_${standBucket}`;
}

/**
 * Build cache key from physics parameters
 */
function buildKey({ lat, lon, speed, seated, standing }) {
  return `${geoHash(lat, lon)}_s${speedBucket(speed)}_p${passengerBucket(seated, standing)}`;
}

/**
 * Get cached physics result if available and fresh
 * @param {object} params - { lat, lon, speed, seated, standing }
 * @returns {object|null} - Cached result or null
 */
export function getCachedPhysics(params) {
  const key = buildKey(params);
  const entry = physicsCache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL_MS) {
    physicsCache.delete(key);
    return null;
  }

  console.log(
    `[Physics Cache] HIT (age=${(age / 1000).toFixed(1)}s) key=${key}`,
  );
  return entry.result;
}

/**
 * Store physics result in cache
 * @param {object} params - { lat, lon, speed, seated, standing }
 * @param {object} result - Physics model result
 */
export function setCachedPhysics(params, result) {
  // Evict oldest entries if cache is full
  if (physicsCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = physicsCache.keys().next().value;
    physicsCache.delete(oldestKey);
  }

  const key = buildKey(params);
  physicsCache.set(key, {
    result,
    timestamp: Date.now(),
  });
  console.log(`[Physics Cache] STORED key=${key} (size=${physicsCache.size})`);
}

/**
 * Get cache stats for monitoring
 */
export function getPhysicsCacheStats() {
  return {
    size: physicsCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttlMs: CACHE_TTL_MS,
  };
}
