const Alert = require('../models/Alert');

const createAlertsForCrash = async (crash) => {
  try {
    const authorities = ['police', 'hospital', 'ministry', 'busowner'];
    const alerts = [];

    for (const authority of authorities) {
      const alert = new Alert({
        crash_id: crash._id,
        authority_type: authority,
        severity: crash.severity,
        status: 'pending',
        timestamp: crash.timestamp,
        bus_id: crash.bus_id,
        location: crash.location,
        max_acceleration: crash.max_acceleration
      });

      await alert.save();
      alerts.push(alert);
    }

    console.log(`✅ Created ${alerts.length} alerts for crash ${crash._id}`);
    return alerts;
  } catch (error) {
    console.error('❌ Error creating alerts:', error);
    throw error;
  }
};

module.exports = { createAlertsForCrash };
