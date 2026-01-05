import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/User.model.js";
import bcrypt from "bcryptjs";

dotenv.config();

const debugLogin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const username = "authority1";
        const password = "password123";

        const user = await User.findOne({ username });
        if (!user) {
            console.log("User not found!");
            process.exit(1);
        }

        console.log(`User found: ${user.username}, Role: ${user.role}`);
        console.log(`Stored Hash: ${user.password}`);

        const isMatch = await bcrypt.compare(password, user.password);
        console.log(`Password Match Result: ${isMatch}`);

        if (isMatch) {
            console.log("LOGIN SUCCESS (Backend Logic is OK)");
        } else {
            console.log("LOGIN FAILED (Password mismatch)");
            // Let's check what the hash SHOULD be
            const newHash = await bcrypt.hash(password, 10);
            console.log(`Expected Hash (Example): ${newHash}`);
        }

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

debugLogin();
