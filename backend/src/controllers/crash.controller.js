import Crash from "../models/Crash.model.js";
import Bus from "../models/Bus.model.js";
import User from "../models/User.model.js";
import SystemConfig from "../models/SystemConfig.model.js";
import smsService from "../services/sms.service.js";

/**
 * @desc    Get all crashes
 * @route   GET /api/crashes
 * @access  Private
 */
export const getCrashes = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.status) {
            filter.status = req.query.status;
        }
        const crashes = await Crash.find(filter)
            .populate("busId", "licensePlate routeId")
            .sort({ timestamp: -1 });
        res.json(crashes);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Report a crash event
 * @route   POST /api/crashes
 * @access  Public (or restricted to IoT/ML service)
 */
export const reportCrash = async (req, res, next) => {
    try {
        const { busId, location, severity } = req.body;

        // 1. Validate bus exists
        console.log(`[CrashController] Received report for busId: ${busId}`);
        let bus;
        if (typeof busId === 'string' && busId.match(/^[0-9a-fA-F]{24}$/)) {
            bus = await Bus.findById(busId);
        }

        if (!bus) {
            bus = await Bus.findOne({ licensePlate: busId });
        }

        console.log(`[CrashController] Found Bus: ${bus ? bus._id : 'NOT FOUND'}`);

        if (!bus) {
            res.status(404);
            throw new Error(`Bus not found: ${busId}`);
        }

        // 2. Create Crash Record
        const crash = await Crash.create({
            busId: bus._id,
            location,
            severity: severity || "high",
            status: "active",
            alertSent: false,
        });

        // 3. Get Emergency Message Template
        const templateConfig = await SystemConfig.findOne({
            key: "emergency_message_template",
        });
        let messageTemplate =
            templateConfig?.value ||
            "CRASH DETECTED! Bus {busId} at {location}. Severity: {severity}. Please respond immediately.";

        // 4. Format the message
        const message = messageTemplate
            .replace("{busId}", bus.licensePlate)
            .replace("{location}", `${location.lat}, ${location.lon}`)
            .replace("{severity}", (severity || "high").toUpperCase());

        // 5. Find Recipients — police, hospitals, and bus owner
        const [policeUsers, hospitalUsers] = await Promise.all([
            User.find({ role: "police" }).select("phoneNumber"),
            User.find({ role: "hospital" }).select("phoneNumber"),
        ]);

        // Get bus owner's phone number
        let busOwnerPhone = null;
        if (bus.owner) {
            const owner = await User.findById(bus.owner).select("phoneNumber");
            if (owner?.phoneNumber) {
                busOwnerPhone = owner.phoneNumber;
            }
        }

        // Collect all unique phone numbers
        const recipientPhones = new Set();

        policeUsers.forEach((u) => {
            if (u.phoneNumber) recipientPhones.add(u.phoneNumber);
        });
        hospitalUsers.forEach((u) => {
            if (u.phoneNumber) recipientPhones.add(u.phoneNumber);
        });
        if (busOwnerPhone) {
            recipientPhones.add(busOwnerPhone);
        }

        // Also include legacy "authority" role users
        const authorityUsers = await User.find({ role: "authority" }).select("phoneNumber");
        authorityUsers.forEach((u) => {
            if (u.phoneNumber) recipientPhones.add(u.phoneNumber);
        });

        // 6. Send SMS to all recipients
        const recipients = Array.from(recipientPhones);
        if (recipients.length > 0) {
            console.log(`[CrashController] Sending SMS to ${recipients.length} recipients...`);
            const smsPromises = recipients.map((phone) => smsService.sendSMS(phone, message));
            await Promise.all(smsPromises);

            crash.alertSent = true;
            await crash.save();
            console.log(`[CrashController] All SMS sent successfully.`);
        } else {
            console.warn("[CrashController] No recipients with phone numbers found!");
        }

        res.status(201).json({
            success: true,
            data: crash,
            recipientCount: recipients.length,
            message: "Crash reported and alerts processed",
        });
    } catch (error) {
        next(error);
    }
};
