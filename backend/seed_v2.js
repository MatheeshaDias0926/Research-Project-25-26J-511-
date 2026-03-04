import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

import User from "./src/models/User.model.js";
import Bus from "./src/models/Bus.model.js";
import SystemConfig from "./src/models/SystemConfig.model.js";

dotenv.config();

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("🌱 Connected to MongoDB for seeding...");

        // Clear existing data
        await User.deleteMany({});
        await Bus.deleteMany({});
        await SystemConfig.deleteMany({});
        console.log("✅ Cleared existing data");

        // Create users
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("password123", salt);

        const users = await User.insertMany([
            {
                username: "admin",
                password: hashedPassword, // User model handles hashing but insertMany skips middleware? No, it skips presave. So we hash manually.
                // Wait, User.model.js has pre-save hook. insertMany DOES NOT trigger pre-save hooks.
                // So I should hash it.
                role: "authority",
                phoneNumber: "+94771234567" // Add phone number for testing SMS
            },
            {
                username: "police_officer",
                password: hashedPassword,
                role: "authority",
                phoneNumber: "+94777654321"
            },
            {
                username: "conductor1",
                password: hashedPassword,
                role: "conductor",
                phoneNumber: "+94779876543"
            }
        ]);

        console.log("✅ Created users");

        // Create Buses
        const buses = await Bus.insertMany([
            {
                licensePlate: "NP-1234",
                capacity: 52,
                routeId: "ROUTE-001"
            },
            {
                licensePlate: "WP-5678",
                capacity: 45,
                routeId: "ROUTE-002"
            }
        ]);

        console.log("✅ Created buses");

        // Create Default System Config
        await SystemConfig.create({
            key: "emergency_message_template",
            value: "CRASH DETECTED! Bus {busId} at {location}. Severity: {severity}. Please respond immediately.",
            description: "Template for SMS sent to authorities on crash detection",
        });
        console.log("✅ Created Default System Config");

        console.log("🎉 Database seeded successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding database:", error);
        process.exit(1);
    }
};

seedDatabase();
