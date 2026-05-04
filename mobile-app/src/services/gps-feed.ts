import * as Location from "expo-location";
import client from "../api/client";

let gpsFeedInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

/**
 * Start sending GPS data from phone to backend.
 * Called when the conductor selects a bus and starts their shift.
 *
 * @param licensePlate - The bus license plate to tag GPS data with
 * @param onUpdate - Callback with latest GPS data for UI display
 * @param intervalMs - How often to send GPS (default: 3 seconds)
 */
export async function startGpsFeed(
  licensePlate: string,
  onUpdate?: (data: {
    lat: number;
    lon: number;
    speed: number;
    timestamp: number;
  }) => void,
  intervalMs: number = 3000
): Promise<{ success: boolean; error?: string }> {
  if (isRunning) {
    console.log("[GPS Feed] Already running");
    return { success: true };
  }

  // Request location permission
  const { status: foreground } =
    await Location.requestForegroundPermissionsAsync();
  if (foreground !== "granted") {
    return {
      success: false,
      error: "Location permission denied. Please enable in Settings.",
    };
  }

  isRunning = true;
  console.log(`[GPS Feed] Started for bus: ${licensePlate}`);

  // Send GPS data at interval
  gpsFeedInterval = setInterval(async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude, speed: rawSpeed } = location.coords;

      // Convert speed from m/s to km/h (GPS speed can be null)
      const speedKmh = rawSpeed && rawSpeed > 0 ? rawSpeed * 3.6 : 0;

      const gpsData = {
        licensePlate,
        lat: latitude,
        lon: longitude,
        speed: Math.round(speedKmh * 10) / 10, // 1 decimal
      };

      // Send to backend
      await client.post("/iot/gps-feed", gpsData);

      // Notify UI
      if (onUpdate) {
        onUpdate({
          lat: latitude,
          lon: longitude,
          speed: speedKmh,
          timestamp: Date.now(),
        });
      }
    } catch (error: any) {
      console.error("[GPS Feed] Error:", error.message);
    }
  }, intervalMs);

  return { success: true };
}

/**
 * Stop the GPS feed.
 * Called when conductor ends their shift or navigates away.
 */
export function stopGpsFeed(): void {
  if (gpsFeedInterval) {
    clearInterval(gpsFeedInterval);
    gpsFeedInterval = null;
  }
  isRunning = false;
  console.log("[GPS Feed] Stopped");
}

/**
 * Check if GPS feed is currently running
 */
export function isGpsFeedRunning(): boolean {
  return isRunning;
}
