import mongoose from "mongoose";
import dotenv from "dotenv";
import Bus from "./src/models/Bus.model.js";
import User from "./src/models/User.model.js";

// Load environment variables
dotenv.config();

const sampleBuses = [
  { licensePlate: "NP-1234", capacity: 55, routeId: "ROUTE-138" },
  { licensePlate: "WP-5678", capacity: 50, routeId: "ROUTE-138" },
  { licensePlate: "CP-9012", capacity: 60, routeId: "ROUTE-245" },
  { licensePlate: "SP-3456", capacity: 55, routeId: "ROUTE-245" },
  { licensePlate: "NP-7890", capacity: 52, routeId: "ROUTE-177" },
];

const sampleUsers = [
  { username: "passenger1", password: "password123", role: "passenger" },
  { username: "conductor1", password: "password123", role: "conductor" },
  { username: "authority1", password: "password123", role: "authority" },
];

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("[Seed] Connected to MongoDB");

    // Clear existing data
    await Bus.deleteMany({});
    await User.deleteMany({});
    console.log("[Seed] Cleared existing data");

    // Insert sample buses
    const buses = await Bus.insertMany(sampleBuses);
    console.log(`[Seed] Added ${buses.length} buses`);

    // Insert sample users
    const users = await User.insertMany(sampleUsers);
    console.log(`[Seed] Added ${users.length} users`);

    console.log("\n✅ Database seeded successfully!\n");
    console.log("Sample Users:");
    sampleUsers.forEach((user) => {
      console.log(
        `  - ${user.username} (${user.role}) - password: ${user.password}`
      );
    });
    console.log("\nSample Buses:");
    sampleBuses.forEach((bus) => {
      console.log(
        `  - ${bus.licensePlate} (Route: ${bus.routeId}, Capacity: ${bus.capacity})`
      );
    });

    process.exit(0);
  } catch (error) {
    console.error("[Seed] Error:", error.message);
    process.exit(1);
  }
};

seedDatabase();
