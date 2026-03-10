import mongoose from "mongoose";
import dotenv from "dotenv";
import Bus from "./src/models/Bus.model.js";

dotenv.config();

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const bus = await Bus.findOne({ licensePlate: "NB 2056" });
    if(bus) {
        console.log("BUS_ID=" + bus._id.toString());
    } else {
        console.log("Not found. Creating it...");
        const newBus = await Bus.create({ licensePlate: "NB 2056", routeId: "98", capacity: 55 });
        console.log("BUS_ID=" + newBus._id.toString());
    }
    process.exit();
}
run();
