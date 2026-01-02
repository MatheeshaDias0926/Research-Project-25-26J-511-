const express = require('express');
const mongoose = require('mongoose');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const mqtt = require('mqtt');
const multer = require('multer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ dest: 'uploads/' });

// 1. DATABASE CONFIG (MongoDB Atlas)
// Replace <password> and YOUR_CLUSTER address
const dbURI = 'mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.mongodb.net/driverDMS?retryWrites=true&w=majority';
mongoose.connect(dbURI)
    .then(() => console.log("Connected to MongoDB Atlas Successfully ✅"))
    .catch(err => console.error("MongoDB Atlas Error ❌:", err));

const Incident = mongoose.model('Incident', {
    deviceId: String,
    event: String,
    videoUrl: String,
    timestamp: { type: Date, default: Date.now }
});

// 2. GOOGLE DRIVE CONFIG
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');
const PARENT_FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID'; 

const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_PATH,
    scopes: ['https://www.googleapis.com/auth/drive'],
});
const drive = google.drive({ version: 'v3', auth });

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// 3. MQTT CONFIG
const mqttClient = mqtt.connect('mqtt://broker.hivemq.com');
mqttClient.on('connect', () => {
    console.log("Connected to MQTT Broker 📡");
    mqttClient.subscribe('bus/alerts/#');
});

mqttClient.on('message', (topic, message) => {
    const data = JSON.parse(message.toString());
    io.emit(`alert-${data.deviceId}`, data);
});

// 4. API ROUTES
app.post('/api/upload-incident', upload.single('video'), async (req, res) => {
    try {
        console.log("Received video from Edge...");
        const fileMetadata = {
            name: `incident_${Date.now()}.mp4`,
            parents: [PARENT_FOLDER_ID],
        };
        const media = {
            mimeType: 'video/mp4',
            body: fs.createReadStream(req.file.path),
        };

        const driveRes = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink',
        });

        // Save to Atlas
        const newIncident = new Incident({
            deviceId: req.body.deviceId,
            event: req.body.event,
            videoUrl: driveRes.data.webViewLink
        });
        await newIncident.save();

        fs.unlinkSync(req.file.path); 
        res.json({ success: true, link: driveRes.data.webViewLink });
    } catch (error) {
        console.error(error);
        res.status(500).send("Upload failed");
    }
});

// Use 5001 if 5000 is blocked
const PORT = 5001;
server.listen(PORT, () => {
    console.log(`Cloud Server running on port ${PORT} 🚀`);
});