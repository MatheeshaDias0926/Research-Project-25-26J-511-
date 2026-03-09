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
        let crashes = await Crash.find(filter).sort({ timestamp: -1 }).lean();

        // Try to populate busId for crashes that have valid ObjectIds
        const populatedCrashes = await Promise.all(
            crashes.map(async (crash) => {
                if (crash.busId && typeof crash.busId === "object") {
                    try {
                        const bus = await (await import("../models/Bus.model.js")).default
                            .findById(crash.busId)
                            .select("licensePlate routeId")
                            .lean();
                        if (bus) crash.busId = bus;
                    } catch (e) { /* busId is not a valid ObjectId, skip populate */ }
                }
                return crash;
            })
        );

        res.json({ crashes: populatedCrashes });
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
        const { busId, bus_id, location, severity } = req.body;
        const resolvedBusId = busId || bus_id;

        // 1. Validate bus exists
        console.log(`[CrashController] Received report for busId: ${resolvedBusId}`);
        let bus;
        if (typeof resolvedBusId === 'string' && resolvedBusId.match(/^[0-9a-fA-F]{24}$/)) {
            bus = await Bus.findById(resolvedBusId);
        }

        if (!bus) {
            bus = await Bus.findOne({ licensePlate: resolvedBusId });
        }

        console.log(`[CrashController] Found Bus: ${bus ? bus._id : 'NOT FOUND'}`);

        // Normalize location format (Python sends latitude/longitude, frontend sends lat/lon)
        const normalizedLocation = {
            lat: location?.lat || location?.latitude || 0,
            lon: location?.lon || location?.longitude || 0,
        };

        // 2. Create Crash Record (allow even if bus not in DB — store string ID)
        const crash = await Crash.create({
            busId: bus ? bus._id : resolvedBusId,
            bus_id: resolvedBusId,
            location: normalizedLocation,
            severity: severity || "high",
            status: "active",
            alertSent: false,
        });

        const busLabel = bus ? bus.licensePlate : resolvedBusId;

        // 3. Get Emergency Message Template
        const templateConfig = await SystemConfig.findOne({
            key: "emergency_message_template",
        });
        let messageTemplate =
            templateConfig?.value ||
            "CRASH DETECTED! Bus {busId} at {location}. Severity: {severity}. Please respond immediately.";

        // 4. Format the message
        const message = messageTemplate
            .replace("{busId}", busLabel)
            .replace("{location}", `${normalizedLocation.lat}, ${normalizedLocation.lon}`)
            .replace("{severity}", (severity || "high").toUpperCase());

        // 5. Find Recipients — police stations, hospitals, and users
        const PoliceStation = (await import("../models/PoliceStation.model.js")).default;
        const Hospital = (await import("../models/Hospital.model.js")).default;

        const [policeStations, hospitals, policeUsers, hospitalUsers, authorityUsers] = await Promise.all([
            PoliceStation.find({ status: "active" }).select("phone emergency_hotline name"),
            Hospital.find({ status: "active" }).select("phone emergency_hotline name"),
            User.find({ role: "police" }).select("phoneNumber"),
            User.find({ role: "hospital" }).select("phoneNumber"),
            User.find({ role: { $in: ["authority", "admin"] } }).select("phoneNumber"),
        ]);

        // Collect all unique phone numbers
        const recipientPhones = new Set();

        policeStations.forEach((s) => {
            if (s.phone) recipientPhones.add(s.phone);
            if (s.emergency_hotline) recipientPhones.add(s.emergency_hotline);
        });
        hospitals.forEach((h) => {
            if (h.phone) recipientPhones.add(h.phone);
            if (h.emergency_hotline) recipientPhones.add(h.emergency_hotline);
        });
        policeUsers.forEach((u) => {
            if (u.phoneNumber) recipientPhones.add(u.phoneNumber);
        });
        hospitalUsers.forEach((u) => {
            if (u.phoneNumber) recipientPhones.add(u.phoneNumber);
        });
        authorityUsers.forEach((u) => {
            if (u.phoneNumber) recipientPhones.add(u.phoneNumber);
        });

        // Get bus owner's phone number
        if (bus?.owner) {
            const owner = await User.findById(bus.owner).select("phoneNumber");
            if (owner?.phoneNumber) recipientPhones.add(owner.phoneNumber);
        }

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

/**
 * @desc    Update crash status
 * @route   PATCH /api/crashes/:id/status
 * @access  Private
 */
export const updateCrashStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const crash = await Crash.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );
        if (!crash) {
            return res.status(404).json({ message: "Crash not found" });
        }
        res.json({ success: true, data: crash });
    } catch (error) {
        next(error);
    }
};
