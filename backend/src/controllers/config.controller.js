import SystemConfig from "../models/SystemConfig.model.js";

/**
 * @desc    Get emergency message template
 * @route   GET /api/config/emergency-message
 * @access  Private (Authority)
 */
export const getEmergencyMessage = async (req, res, next) => {
    try {
        let config = await SystemConfig.findOne({ key: "emergency_message_template" });

        if (!config) {
            // Create default if not exists
            config = await SystemConfig.create({
                key: "emergency_message_template",
                value: "CRASH DETECTED! Bus {busId} at {location}. Severity: {severity}. Please respond immediately.",
                description: "Template for SMS sent to authorities on crash detection",
            });
        }

        res.json(config);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update emergency message template
 * @route   PUT /api/config/emergency-message
 * @access  Private (Authority)
 */
export const updateEmergencyMessage = async (req, res, next) => {
    try {
        const { template } = req.body;

        if (!template) {
            res.status(400);
            throw new Error("Template content is required");
        }

        const config = await SystemConfig.findOneAndUpdate(
            { key: "emergency_message_template" },
            { value: template },
            { new: true, upsert: true }
        );

        res.json(config);
    } catch (error) {
        next(error);
    }
};
