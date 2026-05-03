# Cloudinary Integration for Traffic Violation Evidence

## Overview
This implementation enables automatic capture, encoding, and cloud storage of evidence images for traffic violations (red-light, double-line, speed-limit). When a violation is detected on the Raspberry Pi edge device, the current video frame is:
1. Captured
2. JPEG-encoded with base64
3. Sent to the backend along with violation metadata
4. Uploaded to Cloudinary cloud storage
5. URL stored in MongoDB violation document

## Architecture

### 1. **Edge Device (RaspberryPi_Setup)**
- **File**: `RaspberryPi_Setup/src/road_analyzer.py` (RoadAnalyzerWorker)
- **File**: `RaspberryPi_Setup/smart_bus_client.py` (SmartBusPiClient)

#### Flow:
```
Frame captured → Violation detected (red/double-line/speed)
    ↓
Frame passed to post_traffic_violation(violation_type, speed, gps, frame=frame)
    ↓
Frame encoded to JPEG base64 (85% quality, ~10-15 KB typical)
    ↓
HTTP POST to backend with payload:
{
  "violationType": "red-light|double-line|speed",
  "speed": 45.2,
  "gps": {"lat": 6.028, "lon": 80.217},
  "deviceId": "RPi5-BUS-001",
  "licensePlate": "NP-1234",
  "imageBase64": "<base64 encoded JPEG>",
  "driverName": "Verified Driver Name"
}
```

#### Key Changes:
- **road_analyzer.py**: Pass `frame=frame` to all three violation calls (lines ~247, ~287, ~310)
- **smart_bus_client.py**: Updated `post_traffic_violation()` to accept optional `frame` parameter, encode it as base64, include in POST

### 2. **Backend (Node.js)**
- **File**: `backend/src/api/edgeDevice.routes.js`
- **File**: `backend/src/models/ViolationLog.model.js`
- **Service**: `backend/src/services/cloudinary.service.js` (existing)

#### Endpoint: `POST /api/edge-devices/traffic-violations`
- **Authentication**: x-device-id header (no auth token required for edge devices)
- **Logic**:
  1. Validate x-device-id header
  2. Verify device exists in EdgeDevice collection
  3. If imageBase64 provided:
     - Upload to Cloudinary under folder `traffic_violations/`
     - Public ID: `{violationType}_{deviceId}_{timestamp}`
     - Store secure_url in evidenceImageUrl field
  4. Create ViolationLog document with evidenceImageUrl
  5. Log to terminal with upload confirmation

#### Response:
```json
{
  "success": true,
  "violation": { /* ViolationLog document */ },
  "evidenceUrl": "https://res.cloudinary.com/...secure_url",
  "message": "red-light violation logged with evidence"
}
```

### 3. **Database (MongoDB)**
- **Collection**: ViolationLog
- **New Fields**:
  - `evidenceImageUrl`: String (Cloudinary secure_url)
  - `deviceId`: String (RPi device ID)
  - `licensePlate`: String (Bus license plate)

#### Schema:
```javascript
{
  busId: ObjectId,
  driverRef: ObjectId,
  driverName: String,
  gps: { lat, lon },
  violationType: String, // "red-light" | "double-line" | "speed" etc.
  speed: Number,
  evidenceImageUrl: String, // NEW - Cloudinary URL
  deviceId: String,         // NEW - RPi5-BUS-001, etc.
  licensePlate: String,     // NEW - NP-1234, etc.
  createdAt: Date,
  updatedAt: Date
}
```

### 4. **Cloudinary Configuration**
- **Service File**: `backend/src/services/cloudinary.service.js`
- **Credentials** (in `.env`):
  - CLOUDINARY_CLOUD_NAME=dixn6bonp
  - CLOUDINARY_API_KEY=156485394516113
  - CLOUDINARY_API_SECRET=5ymGY8uDl2yaXObfFWc0qpOOIUA
- **Folder Structure**: `traffic_violations/{violation_type}_{device_id}_{timestamp}.jpg`

## End-to-End Flow Example

### Scenario: Red-light violation detected on RPi5-BUS-001
1. **RoadAnalyzerWorker** detects red traffic light in frame
2. Calls: `self.pi_client.post_traffic_violation("red-light", 35.2, {"lat": 6.028, "lon": 80.217}, frame=frame)`
3. **SmartBusPiClient.post_traffic_violation()** encodes frame to base64 and POSTs to backend
4. **Backend** receives at `/api/edge-devices/traffic-violations`
5. Uploads image to Cloudinary → returns `https://res.cloudinary.com/.../image.jpg`
6. Stores URL in MongoDB: `ViolationLog.evidenceImageUrl = "https://..."`
7. Returns success response with URL to Pi
8. **Terminal Logs**:
   ```
   [VIOLATION] Sending red-light traffic violation to backend...
   [VIOLATION] red-light sent successfully with evidence: https://res.cloudinary.com/.../image.jpg
   [TRAFFIC VIOLATION] Evidence uploaded: https://res.cloudinary.com/.../image.jpg
   [TRAFFIC VIOLATION] red-light reported by RPi5-BUS-001 at speed 35.2 km/h. Evidence: ✓
   ```

## Features

### ✅ Implemented
- Frame capture from violation detection
- JPEG encoding with base64 (85% quality for size optimization)
- Automatic upload to Cloudinary on violation report
- Evidence URL stored in MongoDB
- Terminal logging with confirmation
- Graceful handling of upload failures (violation still logged without image)
- Device authentication via x-device-id header
- Unique Cloudinary public IDs to prevent overwrites

### 🔧 Configuration Options (if needed later)
- JPEG quality can be adjusted (currently 85%)
- Cloudinary folder structure customizable
- Image resize/optimization before upload possible
- Batch upload for offline violations possible

## Testing

### Manual Test Steps
1. **Trigger a red-light violation** on the Pi client
2. **Check MongoDB**:
   ```javascript
   db.violationlogs.findOne({violationType: "red-light"}).evidenceImageUrl
   ```
   Should contain a Cloudinary HTTPS URL
3. **Check Cloudinary Dashboard**:
   - Log in at https://cloudinary.com
   - Navigate to Media Library
   - Folder: traffic_violations/
   - Verify image uploaded with correct naming: `red-light_RPi5-BUS-001_1704067200000.jpg`
4. **Visit URL** in browser to confirm image is accessible

### Error Scenarios
- If Cloudinary upload fails: Violation still created, `evidenceImageUrl` is null
- If network timeout on Pi: Violation POST retried (see timeout=5 in requests.post)
- If invalid device ID: Backend returns 404 "Device not found"

## Performance Considerations

### Image Size
- Original frame: 640x480 @ JPEG 85% ≈ 10-15 KB
- Encoding overhead: ~13 KB → ~17 KB base64 (1.33x expansion)
- Network: ~150-200 ms upload on typical WiFi
- Cloudinary processing: ~500 ms to 1 sec

### Throttling (future enhancement)
- Currently, all violations with GPS speed > 5 km/h post immediately
- Could add rate limiting to prevent spam (e.g., 1 red-light per 10 sec per device)

## Files Modified

### Python (Edge Device)
1. **RaspberryPi_Setup/smart_bus_client.py**
   - Modified: `post_traffic_violation(violation_type, speed, gps, frame=None)` 
   - Added: Base64 encoding of frame
   - Added: Headers for device authentication

2. **RaspberryPi_Setup/src/road_analyzer.py**
   - Modified: All calls to `post_traffic_violation()` now pass `frame=frame`
   - Lines: ~247 (speed), ~287 (red-light), ~310 (double-line)

### JavaScript (Backend)
1. **backend/src/api/edgeDevice.routes.js**
   - Added: New POST endpoint `/api/edge-devices/traffic-violations`
   - Added: Cloudinary upload logic
   - Added: Device authentication validation

2. **backend/src/models/ViolationLog.model.js**
   - Added: `evidenceImageUrl` field
   - Added: `deviceId` field
   - Added: `licensePlate` field

### Configuration (No changes needed)
- `backend/src/services/cloudinary.service.js`: Already configured
- `backend/.env`: Credentials already present

## Future Enhancements

1. **Image Processing**
   - Resize before upload (currently as-is)
   - Watermark with device ID and timestamp
   - Encrypt sensitive metadata

2. **Analytics**
   - Query violations by evidence URL
   - Generate evidence reports for fleet managers
   - Analytics dashboard showing evidence availability

3. **Reliability**
   - Offline queue: Store violations locally if network unavailable
   - Retry logic: Retry failed uploads periodically
   - Batch upload: Send multiple violations in one request

4. **Security**
   - Implement device authentication tokens instead of just x-device-id
   - Sign images before upload
   - Set Cloudinary upload restrictions (whitelist device IDs)

5. **Compliance**
   - Add data retention policy (auto-delete after 90 days)
   - Add driver consent/privacy controls
   - Generate compliance reports

## Logs to Expect

### Terminal Output (Pi Client)
```
[VIOLATION] Evidence image encoded (16384 bytes)
[VIOLATION] Sending red-light traffic violation to backend...
[VIOLATION] red-light sent successfully with evidence: https://res.cloudinary.com/...
```

### Terminal Output (Backend)
```
[TRAFFIC VIOLATION] Evidence uploaded: https://res.cloudinary.com/...
[TRAFFIC VIOLATION] red-light reported by RPi5-BUS-001 at speed 35.2 km/h. Evidence: ✓
```

## Integration Points

### Existing Services
- Cloudinary SDK already imported and configured
- Device authentication via EdgeDevice model
- Socket.IO for real-time notifications (future)

### Dependencies
- `cloudinary` npm package (backend) - already installed
- `opencv-python` (cv2) - already on Pi
- `requests` library - already on Pi

## Troubleshooting

### Issue: Evidence not uploading to Cloudinary
- Check Cloudinary credentials in `.env`
- Verify `backend/src/services/cloudinary.service.js` is loaded
- Check backend logs for upload errors

### Issue: evidenceImageUrl is null in MongoDB
- Check if imageBase64 was sent from Pi
- Check network connectivity from Pi to backend
- Increase timeout in `requests.post(..., timeout=10)`

### Issue: Image quality too low
- Increase JPEG quality in `cv2.imencode()` (currently 85)
- Trade-off: file size vs. detail

### Issue: Too much data being sent
- Reduce frame size before encoding (currently 640x480)
- Reduce JPEG quality further (to 75-80)
- Implement frame sampling (skip some frames)
