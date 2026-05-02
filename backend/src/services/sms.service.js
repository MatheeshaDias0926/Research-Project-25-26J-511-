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

/**
 * Normalizes phone numbers to E.164 format (+94...)
 */
const formatPhoneNumber = (phone) => {
    if (!phone) return null;
    let cleaned = phone.toString().replace(/\D/g, "");
    
    // Ignore short codes (e.g., 1221, 1990)
    if (cleaned.length < 8 && !cleaned.startsWith("0")) {
        return null;
    }

    if (cleaned.startsWith("0") && cleaned.length > 8) {
        cleaned = "94" + cleaned.substring(1);
    }
    
    if (cleaned && !cleaned.startsWith("+")) {
        cleaned = "+" + cleaned;
    }
    return cleaned;
};

const sendSMS = async (to, message) => {
    const formattedTo = formatPhoneNumber(to);

    // Use Twilio if configured
    if (client && formattedTo) {
        try {
            const result = await client.messages.create({
                body: message,
                from: twilioPhone,
                to: formattedTo,
            });
            console.log(`[SMS Service] Sent to ${formattedTo} | SID: ${result.sid}`);
            return true;
        } catch (error) {
            console.error(`[SMS Service] Failed to send to ${formattedTo || 'Unknown'}:`, error.message);
            return false;
        }
    }

    // Fallback: log to console
    console.log("==================================================");
    console.log("[MOCK SMS] Twilio not configured - logging only");
    console.log(`To:      ${formattedTo}`);
    console.log(`Message: ${message}`);
    console.log(`Time:    ${new Date().toISOString()}`);
    console.log("==================================================");
    return true;
};

export default {
    sendSMS,
};
