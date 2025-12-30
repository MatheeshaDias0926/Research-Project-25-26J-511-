const Alert = require('../models/Alert');
const Response = require('../models/Response');

const getAlertsByRole = async (req, res) => {
  try {
    const { role } = req.user;

    const alerts = await Alert.find({ authority_type: role })
      .populate('crash_id')
      .sort({ timestamp: -1 });

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const acceptAlert = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    alert.status = 'acknowledged';
    alert.acknowledged_at = new Date();
    alert.acknowledged_by = req.user._id;
    await alert.save();

    const response = new Response({
      alert_id: alert._id,
      crash_id: alert.crash_id,
      authority_type: req.user.role,
      responder_id: req.user._id,
      action: 'acknowledged',
      timestamp: new Date()
    });
    await response.save();

    res.json({ message: 'Alert acknowledged', alert });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const dispatchUnits = async (req, res) => {
  try {
    const { units, notes } = req.body;

    const alert = await Alert.findById(req.params.id);
    alert.status = 'in_progress';
    await alert.save();

    const response = new Response({
      alert_id: alert._id,
      crash_id: alert.crash_id,
      authority_type: req.user.role,
      responder_id: req.user._id,
      action: 'dispatched',
      details: { units, notes },
      timestamp: new Date()
    });
    await response.save();

    res.json({ message: 'Units dispatched', response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const closeAlert = async (req, res) => {
  try {
    const { resolution } = req.body;

    const alert = await Alert.findById(req.params.id);
    alert.status = 'resolved';
    alert.resolved_at = new Date();
    await alert.save();

    const response = new Response({
      alert_id: alert._id,
      crash_id: alert.crash_id,
      authority_type: req.user.role,
      responder_id: req.user._id,
      action: 'closed',
      details: { resolution },
      timestamp: new Date()
    });
    await response.save();

    res.json({ message: 'Alert closed', alert });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAlertsByRole, acceptAlert, dispatchUnits, closeAlert };
