import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @desc    Call the Physics Model Python script and return parsed output.
 * @param   {object} params - Input parameters for the model.
 * @param   {number} params.seated - Number of seated passengers.
 * @param   {number} params.standing - Number of standing passengers.
 * @param   {number} params.speed - Vehicle speed in km/h.
 * @param   {number} params.lat - Latitude.
 * @param   {number} params.lon - Longitude.
 * @returns {Promise<object>} - Parsed model output.
 */
export const getPhysicsModelResult = async ({
  seated,
  standing,
  speed,
  lat,
  lon,
}) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(
      __dirname,
      "../../../Physics Model-Rollover Prediction/main.py"
    );
    // Use venv Python executable, or fallback to python3
    const venvPython =
      process.env.PHYSICS_MODEL_PYTHON ||
      "/Users/matheeshadias/Documents/Research-Project-25-26J-511-/Physics Model-Rollover Prediction/venv/bin/python";
    const args = [
      scriptPath,
      "--seated",
      String(seated),
      "--standing",
      String(standing),
      "--speed",
      String(speed),
      "--lat",
      String(lat),
      "--lon",
      String(lon),
    ];

    const py = spawn(venvPython, args);
    let output = "";
    let error = "";

    py.stdout.on("data", (data) => {
      output += data.toString();
    });
    py.stderr.on("data", (data) => {
      error += data.toString();
    });
    py.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(error || `Python exited with code ${code}`));
      }
      // Optionally: parse output to structured JSON here
      resolve({ raw: output });
    });
  });
};
