
import mongoose from "mongoose";
import dotenv from "dotenv";
import Bus from "./src/models/Bus.model.js";

dotenv.config();

const checkBus = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const licensePlate = "NP-1234";
        const bus = await Bus.findOne({ licensePlate });

        if (bus) {
            console.log("Found Bus:");
            console.log(bus);
            console.log("Bus ID Type:", typeof bus._id);
            console.log("Bus ID toString:", bus._id.toString());
        } else {
            console.log("Bus not found!");
        }

        mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

checkBus();
