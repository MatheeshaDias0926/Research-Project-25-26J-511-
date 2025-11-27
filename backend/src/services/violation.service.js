import ViolationLog from "../models/ViolationLog.model.js";
import Bus from "../models/Bus.model.js";

/**
 * Checks bus data for safety violations and logs them.
 * This function is triggered by the IoT controller.
 *
 * @param {string} busId - The MongoDB ObjectId of the bus
 * @param {object} busData - The newly created BusDataLog object
 */
export const checkAndLogViolation = async (busId, busData) => {
  const { footboardStatus, speed, gps, currentOccupancy } = busData;

  // Rule from proposal: Check for footboard violation
  // Footboard is being used while the bus is moving at speed > 5 km/h
  if (footboardStatus === true && speed > 5) {
    try {
      await ViolationLog.create({
        busId,
        gps,
        occupancyAtViolation: currentOccupancy,
        violationType: "footboard",
        speed,
      });
      console.log(
        `[ViolationService] Footboard violation logged for bus ${busId}`
      );
    } catch (error) {
      console.error(
        `[ViolationService] Error logging footboard violation: ${error.message}`
      );
    }
  }

  // Rule: Check for overcrowding
  // Bus occupancy exceeds its capacity
  try {
    const bus = await Bus.findById(busId);
    if (bus && currentOccupancy > bus.capacity) {
      await ViolationLog.create({
        busId,
        gps,
        occupancyAtViolation: currentOccupancy,
        violationType: "overcrowding",
        speed,
      });
      console.log(
        `[ViolationService] Overcrowding violation logged for bus ${busId} (${currentOccupancy}/${bus.capacity})`
      );
    }
  } catch (error) {
    console.error(
      `[ViolationService] Error logging overcrowding violation: ${error.message}`
    );
  }
};
