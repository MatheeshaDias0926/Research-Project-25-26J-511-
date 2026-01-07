import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/User.model.js";
import Bus from "./src/models/Bus.model.js";

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Error: ${error.message}`);
    process.exit(1);
  }
};

const importData = async () => {
  try {
    await connectDB();

    console.log("Clearing database...");
    await User.deleteMany();
    await Bus.deleteMany();

    console.log("Creating users...");
    const users = [
      {
        username: "passenger1",
        password: "password123",
        role: "passenger",
      },
      {
        username: "conductor1",
        password: "password123",
        role: "conductor",
      },
      {
        username: "authority1",
        password: "password123",
        role: "authority",
      },
    ];

    await User.create(users);

    console.log("Creating buses...");
    const buses = [
      { licensePlate: "NP-1234", routeId: "101", capacity: 55 },
      { licensePlate: "WP-5678", routeId: "102", capacity: 45 },
      { licensePlate: "CP-9012", routeId: "103", capacity: 60 },
      { licensePlate: "SP-3456", routeId: "104", capacity: 50 },
      { licensePlate: "NP-7890", routeId: "105", capacity: 55 },
    ];

    await Bus.create(buses);

    console.log("Data seeded successfully!");
    process.exit();
  } catch (error) {
    console.error(`Error with seeding: ${error}`);
    process.exit(1);
  }
};

importData();
