import { Device, Violation } from '../models/index.js';

export const getDashboard = async (req, res) => {
  const devices = await Device.find({ owner: req.user.dbId }).populate('assignedBus');
  res.json(devices);
};

export const reportViolation = async (req, res) => {
  const { deviceId, driverFaceId, type, mediaUrl, mediaType } = req.body;
  const device = await Device.findOne({ deviceId });
  
  const violation = new Violation({
    device: device._id,
    driverFaceId,
    type,
    mediaUrl,
    mediaType
  });
  
  await violation.save();
  res.status(201).json({ message: "Violation logged" });
};