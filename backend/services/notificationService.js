const User = require('../models/User');
const twilio = require('twilio');

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

let twilioClient = null;
if (accountSid && authToken && twilioPhone) {
  twilioClient = twilio(accountSid, authToken);
  console.log('[NotificationService] Twilio configured successfully.');
} else {
  console.warn('[NotificationService] Twilio credentials not found. SMS will be logged to console only.');
}

/**
 * Send SMS via Twilio (falls back to console log if not configured)
 */
const sendSMS = async (to, message) => {
  if (twilioClient) {
    try {
      const result = await twilioClient.messages.create({
        body: message,
        from: twilioPhone,
        to: to,
      });
      console.log(`[SMS] Sent to ${to} | SID: ${result.sid}`);
      return true;
    } catch (error) {
      console.error(`[SMS] Failed to send to ${to}:`, error.message);
      return false;
    }
  }

  // Fallback: log to console
  console.log('==================================================');
  console.log('[MOCK SMS] Twilio not configured - logging only');
  console.log(`To:      ${to}`);
  console.log(`Message: ${message}`);
  console.log(`Time:    ${new Date().toISOString()}`);
  console.log('==================================================');
  return true;
};

const sendNotification = async (userId, message) => {
  console.log(`Notification to user ${userId}:`, message);
};

/**
 * Broadcast emergency alerts to authorities via SMS
 */
const broadcastEmergency = async (crash, alerts) => {
  try {
    console.log(`EMERGENCY BROADCAST: Crash ${crash.bus_id}`);

    const locationStr = crash.location
      ? `${crash.location.latitude}, ${crash.location.longitude}`
      : 'Unknown Location';

    const address = crash.location?.address ? ` (${crash.location.address})` : '';

    const message = `CRASH DETECTED! Bus ${crash.bus_id} at ${locationStr}${address}. Severity: ${crash.severity.toUpperCase()}. Please respond immediately.`;

    // Find all authorities (police, hospital, ministry, admin)
    const authorities = await User.find({
      role: { $in: ['admin', 'police', 'hospital', 'ministry'] }
    });

    console.log(`Found ${authorities.length} authorities to notify.`);

    const promises = authorities.map(user => {
      if (user.phone) {
        return sendSMS(user.phone, message);
      }
      return Promise.resolve();
    });

    // Also notify Bus Owner
    const Bus = require('../models/Bus');
    const bus = await Bus.findOne({ bus_id: crash.bus_id });

    if (bus && bus.owner_id) {
      const owner = await User.findById(bus.owner_id);
      if (owner && owner.phone) {
        console.log("Notifying Bus Owner...");
        promises.push(sendSMS(owner.phone, message));
      }
    }

    await Promise.all(promises);
    console.log("All SMS notifications sent.");

  } catch (error) {
    console.error('Error in broadcastEmergency:', error);
  }
};

module.exports = { sendSMS, sendNotification, broadcastEmergency };
