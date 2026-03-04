/**
 * SMS Service
 * Handles sending SMS notifications using Twilio.
 * Falls back to console logging if Twilio credentials are not configured.
 */

import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

let client = null;
if (accountSid && authToken && twilioPhone) {
    client = twilio(accountSid, authToken);
    console.log("[SMS Service] Twilio configured successfully.");
} else {
    console.warn(
        "[SMS Service] Twilio credentials not found. SMS will be logged to console only."
    );
}

const sendSMS = async (to, message) => {
    // Use Twilio if configured
    if (client) {
        try {
            const result = await client.messages.create({
                body: message,
                from: twilioPhone,
                to: to,
            });
            console.log(`[SMS Service] Sent to ${to} | SID: ${result.sid}`);
            return true;
        } catch (error) {
            console.error(`[SMS Service] Failed to send to ${to}:`, error.message);
            return false;
        }
    }

    // Fallback: log to console
    console.log("==================================================");
    console.log("[MOCK SMS] Twilio not configured - logging only");
    console.log(`To:      ${to}`);
    console.log(`Message: ${message}`);
    console.log(`Time:    ${new Date().toISOString()}`);
    console.log("==================================================");
    return true;
};

export default {
    sendSMS,
};
