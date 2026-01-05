import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/User.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const debugFullAuth = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const username = "authority1";
        const password = "password123";

        // 1. Find User
        const user = await User.findOne({ username });
        if (!user) {
            console.error("❌ User not found");
            process.exit(1);
        }
        console.log("✅ User found in DB");
        console.log(`   ID: ${user._id}`);
        console.log(`   Role: ${user.role}`);

        // 2. Verify Password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            console.error("❌ Password match failed (bcrypt check)");
            process.exit(1);
        }
        console.log("✅ Password matches");

        // 3. Generate Token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "30d",
        });
        console.log("✅ Token generated");
        // console.log(`   Token: ${token}`);

        // 4. Decode Token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("✅ Token verified & decoded locally");
        console.log(`   Decoded ID: ${decoded.id}`);

        // 5. Simulate "protect" middleware
        const userFromToken = await User.findById(decoded.id).select("-password");
        if (!userFromToken) {
            console.error("❌ User retrieval from token ID failed!");
            // This implies ID in token (from user._id) doesn't match DB? Impossible if step 1 found it.
            // UNLESS step 1 found a different doc? (Uniques?)
        } else {
            console.log("✅ User successfully retrieved from Token ID ('protect' middleware simulation)");
            if (userFromToken.role === 'authority') {
                console.log("✅ User has 'authority' role ('isAuthority' check passed)");
            } else {
                console.error(`❌ User role is '${userFromToken.role}', expected 'authority'`);
            }
        }

        console.log("\n🎉 FULL AUTH CYCLE VALID. The issue is likely Frontend or Network.");
        process.exit(0);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

debugFullAuth();
