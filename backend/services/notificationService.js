const User = require('../models/User');
const PoliceStation = require('../models/PoliceStation');
const Hospital = require('../models/Hospital');
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

    // Collect all unique phone numbers
    const recipientPhones = new Set();

    // 1. Get phone numbers from PoliceStation collection
    const policeStations = await PoliceStation.find({ status: 'active' }).select('phone emergency_hotline name');
    policeStations.forEach(station => {
      if (station.phone) recipientPhones.add(station.phone);
      if (station.emergency_hotline) recipientPhones.add(station.emergency_hotline);
    });
    console.log(`Found ${policeStations.length} police stations.`);

    // 2. Get phone numbers from Hospital collection
    const hospitals = await Hospital.find({ status: 'active' }).select('phone emergency_hotline name');
    hospitals.forEach(hospital => {
      if (hospital.phone) recipientPhones.add(hospital.phone);
      if (hospital.emergency_hotline) recipientPhones.add(hospital.emergency_hotline);
    });
    console.log(`Found ${hospitals.length} hospitals.`);

    // 3. Get phone numbers from User collection (admin, police, hospital, ministry roles)
    const authorities = await User.find({
      role: { $in: ['admin', 'police', 'hospital', 'ministry'] }
    });
    authorities.forEach(user => {
      if (user.phone) recipientPhones.add(user.phone);
    });

    // 4. Notify Bus Owner
    const Bus = require('../models/Bus');
    const bus = await Bus.findOne({ bus_id: crash.bus_id });
    if (bus && bus.owner_id) {
      const owner = await User.findById(bus.owner_id);
      if (owner && owner.phone) {
        recipientPhones.add(owner.phone);
      }
    }

    // Send SMS to all unique recipients
    const recipients = Array.from(recipientPhones);
    console.log(`Sending SMS to ${recipients.length} recipients: ${recipients.join(', ')}`);

    const promises = recipients.map(phone => sendSMS(phone, message));
    await Promise.all(promises);
    console.log("All SMS notifications sent.");

  } catch (error) {
    console.error('Error in broadcastEmergency:', error);
  }
};

module.exports = { sendSMS, sendNotification, broadcastEmergency };
