

const sendNotification = async (userId, message) => {
  
  console.log(`📢 Notification to user ${userId}:`, message);
  
};

const broadcastEmergency = async (crash, alerts) => {
  console.log(`🚨 EMERGENCY BROADCAST: Crash ${crash.bus_id} at ${crash.location.address}`);
  
};

module.exports = { sendNotification, broadcastEmergency };
