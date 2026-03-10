import axios from "axios";

// Weather cache: weather doesn't change every 1.5 seconds
// Cache per approximate location for 5 minutes
const weatherCache = new Map();
const WEATHER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_WEATHER_CACHE_SIZE = 100;

function weatherGeoKey(lat, lon) {
  // Round to ~1km grid — weather is the same within 1km
  const latR = Math.round(lat / 0.01) * 0.01;
  const lonR = Math.round(lon / 0.01) * 0.01;
  return `${latR.toFixed(2)}_${lonR.toFixed(2)}`;
}

/**
 * @desc    Fetch real-time weather for a location and determine if road is wet.
 *          Results are cached for 5 minutes per ~1km grid cell.
 * @param   {number} lat - Latitude
 * @param   {number} lon - Longitude
 * @returns {Promise<object>} - { isWet: boolean, condition: string, friction: number }
 */
export const getRoadWeather = async (lat, lon) => {
  // Check cache first
  const cacheKey = weatherGeoKey(lat, lon);
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < WEATHER_CACHE_TTL_MS) {
    console.log(
      `[Weather] Cache HIT (age=${((Date.now() - cached.timestamp) / 1000).toFixed(0)}s)`,
    );
    return cached.result;
  }

  try {
    // Open-Meteo Free API (No key required)
    // Fetch current weather codes: https://open-meteo.com/en/docs
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

    const response = await axios.get(url, { timeout: 5000 });
    const weatherCode = response.data.current_weather.weathercode;

    // Categorize wet/dry based on WMO Weather Codes
    // 0-4: Clear/Cloudy (Dry)
    // 51-67: Drizzle/Rain (Wet)
    // 71-77: Snow (Wet/Slippery)
    // 80-82: Showers (Wet)
    // 95-99: Thunderstorm (Wet)

    const wetCodes = [
      51,
      53,
      55,
      56,
      57, // Drizzle
      61,
      63,
      65,
      66,
      67, // Rain
      71,
      73,
      75,
      77, // Snow
      80,
      81,
      82, // Showers
      95,
      96,
      99, // Thunderstorm
    ];

    const isWet = wetCodes.includes(weatherCode);

    // Friction coefficients for Sri Lankan roads (from ML model constants)
    const friction = isWet ? 0.35 : 0.65;

    const result = {
      isWet,
      weatherCode,
      condition: isWet ? "Rain/Wet" : "Dry",
      friction,
    };

    // Store in cache
    if (weatherCache.size >= MAX_WEATHER_CACHE_SIZE) {
      const oldestKey = weatherCache.keys().next().value;
      weatherCache.delete(oldestKey);
    }
    weatherCache.set(cacheKey, { result, timestamp: Date.now() });

    return result;
  } catch (error) {
    console.error("Weather API Error:", error.message);
    // Fallback to Dry/Average if API fails
    return {
      isWet: false,
      condition: "Unknown (Defaulting to Dry)",
      friction: 0.65,
      error: true,
    };
  }
};
