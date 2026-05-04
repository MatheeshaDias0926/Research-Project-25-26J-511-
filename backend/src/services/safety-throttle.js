/**
 * Safety Pipeline Throttle
 *
 * Throttles the expensive safety pipeline (physics + ML) per bus.
 * Telemetry (occupancy, footboard) is always saved at full rate,
 * but model computation only runs once per THROTTLE_INTERVAL per bus.
 *
 * Between runs, the last computed riskScore and distToCurve are reused.
 */

// Map<licensePlate, { riskScore, distToCurve, safetyResult, lastRunTime }>
const safetyState = new Map();

const THROTTLE_INTERVAL_MS = 5_000; // Run full safety pipeline at most every 5 seconds per bus

/**
 * Check if the safety pipeline should run for this bus
 * @param {string} licensePlate
 * @returns {boolean}
 */
export function shouldRunSafety(licensePlate) {
  const state = safetyState.get(licensePlate);
  if (!state) return true; // First time — always run
  return Date.now() - state.lastRunTime >= THROTTLE_INTERVAL_MS;
}

/**
 * Store the latest safety result for a bus
 * @param {string} licensePlate
 * @param {object} result - { riskScore, distToCurve, safetyResult }
 */
export function updateSafetyState(
  licensePlate,
  { riskScore, distToCurve, safetyResult },
) {
  safetyState.set(licensePlate, {
    riskScore,
    distToCurve,
    safetyResult,
    lastRunTime: Date.now(),
  });
}

/**
 * Get the last known safety result for reuse between pipeline runs
 * @param {string} licensePlate
 * @returns {{ riskScore: number, distToCurve: number, safetyResult: object|null } | null}
 */
export function getLastSafetyState(licensePlate) {
  return safetyState.get(licensePlate) || null;
}
