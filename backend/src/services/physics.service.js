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
  friction = 0.65, // Default to dry if not provided
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
      "--friction",
      String(friction),
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
      // Parse output to structured JSON with original field names and units
      const result = {};
      const lines = output
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      for (let line of lines) {
        if (line.startsWith("Location:")) {
          const match = line.match(/Location: \(([-\d.]+), ([-\d.]+)\)/);
          if (match) {
            result["Location"] = `(${match[1]}, ${match[2]})`;
          }
        } else if (line.startsWith("Passengers")) {
          const match = line.match(
            /Passengers \(seated\/standing\): (\d+) (\d+)/
          );
          if (match) {
            result["Passengers (seated/standing)"] = `${match[1]} ${match[2]}`;
          }
        } else if (line.startsWith("CoG height:")) {
          result["CoG height"] = line.split(":")[1].trim();
        } else if (line.startsWith("Rollover threshold:")) {
          result["Rollover threshold"] = line.split(":")[1].trim();
        } else if (line.startsWith("Sharpest curve radius ahead:")) {
          result["Sharpest curve radius ahead"] = line.split(":")[1].trim();
        } else if (line.startsWith("Road slope:")) {
          result["Road slope"] = line.split(":")[1].trim();
        } else if (line.startsWith("Lateral accel:")) {
          result["Lateral accel"] = line.split(":")[1].trim();
        } else if (line.startsWith("Decision:")) {
          result["Decision"] = line.replace("Decision:", "").trim();
        } else if (line.startsWith("Reaction distance:")) {
          result["Reaction distance"] = line.split(":")[1].trim();
        } else if (line.startsWith("Braking distance:")) {
          result["Braking distance"] = line.split(":")[1].trim();
        } else if (line.startsWith("Total stopping distance:")) {
          result["Total stopping distance"] = line.split(":")[1].trim();
        } else if (line.startsWith("Deceleration:")) {
          result["Deceleration"] = line.split(":")[1].trim();
        } else if (line.startsWith("Curve radius:")) {
          result["Curve radius"] = line.split(":")[1].trim();
        } else if (line.startsWith("Estimated curve length:")) {
          result["Estimated curve length"] = line.split(":")[1].trim();
        } else if (line.startsWith("Max safe speed for curve:")) {
          result["Max safe speed for curve"] = line.split(":")[1].trim();
        } else if (
          line.includes("WARNING: May not stop before exiting curve!")
        ) {
          result["Curve Warning"] = "May not stop before exiting curve!";
        }
      }
      result["raw"] = output;
      resolve(result);
    });
  });
};
