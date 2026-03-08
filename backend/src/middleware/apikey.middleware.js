/**
 * API Key middleware for IoT endpoint security.
 * ESP32 sends X-API-Key header; we validate against IOT_API_KEY env var.
 * In development (no IOT_API_KEY set), all requests are allowed.
 */
export const verifyApiKey = (req, res, next) => {
  const configuredKey = process.env.IOT_API_KEY;

  // If no API key configured (dev mode), allow all requests
  if (!configuredKey) {
    return next();
  }

  const providedKey = req.headers["x-api-key"];

  if (!providedKey) {
    return res.status(401).json({ error: "Missing X-API-Key header" });
  }

  if (providedKey !== configuredKey) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  next();
};
