import React, { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";

export default function LiveDetection() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const uploadedVideoRef = useRef(null);
  const socketRef = useRef(null); // Store socket in ref to persist across renders

  const [results, setResults] = useState({});
  const [videoFile, setVideoFile] = useState(null);
  const [videoResults, setVideoResults] = useState(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);

  // =========================
  // SOCKET CONNECTION
  // =========================
  useEffect(() => {
    // Create socket connection inside useEffect
    socketRef.current = io("http://localhost:5000", {
      transports: ["websocket", "polling"], // Add polling as fallback
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    // Connection event handlers
    socketRef.current.on("connect", () => {
      console.log("✅ Connected to server");
      setIsConnected(true);
      setConnectionError(null);
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("❌ Connection error:", error);
      setIsConnected(false);
      setConnectionError("Cannot connect to detection server. Make sure the Python server is running on port 5000.");
    });

    socketRef.current.on("disconnect", (reason) => {
      console.log("Disconnected:", reason);
      setIsConnected(false);
    });

    socketRef.current.on("result", (data) => {
      console.log("Socket result:", data);
      setResults(data);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // =========================
  // CAMERA STREAM
  // =========================
  const startCamera = async () => {
    if (!isConnected) {
      alert("Please wait for server connection first");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true
      });

      setMediaStream(stream);
      setCameraActive(true);
    } catch (error) {
      console.error("Camera error:", error);
      alert("Failed to access camera: " + error.message);
    }
  };

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [cameraActive, mediaStream]);

  useEffect(() => {
    let interval;
    
    if (cameraActive && isConnected) {
      interval = setInterval(sendFrame, 700);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cameraActive, isConnected]);

  const sendFrame = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!video || !canvas || !socketRef.current?.connected) return;

    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0);

    const base64 = canvas.toDataURL("image/jpeg", 0.6);

    socketRef.current.emit("frame", {
      image: base64
    });
  };

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // =========================
  // VIDEO UPLOAD
  // =========================
  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    
    if (uploadedVideoRef.current) {
      uploadedVideoRef.current.src = url;
    }
  };

  const analyzeVideo = async () => {
    if (!videoFile) {
      alert("Upload a video first");
      return;
    }

    setLoadingVideo(true);

    const formData = new FormData();
    formData.append("video", videoFile);

    try {
      const res = await fetch("http://localhost:5000/predict-video", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      const data = await res.json();
      setVideoResults(data);
    } catch (err) {
      console.error(err);
      alert("Video analysis failed: " + err.message);
    } finally {
      setLoadingVideo(false);
    }
  };

  // =========================
  // ROUTE CHECK
  // =========================
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [routeData, setRouteData] = useState(null);

  const checkRoute = async () => {
    if (!lat || !lng) {
      alert("Please enter latitude and longitude");
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/route/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          busId: "69aca3b6497548a22127c79f",
          lat: parseFloat(lat),
          lon: parseFloat(lng)
        })
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      const data = await res.json();
      setRouteData(data);
    } catch (err) {
      console.error(err);
      alert("Route check failed: " + err.message);
    }
  };

  // =========================
  // RESULT VALUES
  // =========================
  const redCount = results?.redlight?.count || 0;
  const speedCount = results?.speed_limit?.count || 0;
  const doubleLine = results?.double_line?.top1?.class_name || "unknown";
  const detectedLimit = results?.speed_limit_detected_kmh;
  const currentSpeed = results?.currentBusSpeedKmh;
  const overSpeed = results?.overSpeed;
  const overByKmh = results?.overByKmh;
  const redLightViolation = results?.red_light_violation;
  const speedViolation = results?.speed_violation;
  const doubleLineViolation = results?.double_line_violation;

  // Annotated image from server
  const annotatedImageBase64 = results?.speed_limit?.annotated_image_base64_jpg || results?.redlight?.annotated_image_base64_jpg;

  // Show connection error if server not running
  if (connectionError) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <div style={{ 
          background: "#fee2e2", 
          color: "#991b1b",
          padding: 24,
          borderRadius: 12,
          maxWidth: 600,
          margin: "0 auto"
        }}>
          <h2 style={{ fontSize: 24, marginBottom: 16 }}>❌ Server Connection Error</h2>
          <p style={{ marginBottom: 24 }}>{connectionError}</p>
          <div style={{ 
            background: "#fff", 
            padding: 20, 
            borderRadius: 8,
            textAlign: "left"
          }}>
            <h3 style={{ marginBottom: 12 }}>To fix this:</h3>
            <ol style={{ lineHeight: 2 }}>
              <li>Open a new terminal (as Administrator)</li>
              <li>Navigate to your Python server:</li>
              <code style={{
                display: "block",
                background: "#1e293b",
                color: "#fff",
                padding: 12,
                borderRadius: 4,
                margin: "12px 0"
              }}>
                cd "E:\ResearchProject\bus 1 server with socketio latest"
              </code>
              <li>Start the server:</li>
              <code style={{
                display: "block",
                background: "#1e293b",
                color: "#fff",
                padding: 12,
                borderRadius: 4,
                margin: "12px 0"
              }}>
                python app.py
              </code>
              <li>Keep that terminal window open</li>
              <li>Refresh this page after the server starts</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 30, padding: 30 }}>
      {/* LEFT SIDE */}
      <div style={{ width: "55%", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Connection Status */}
        <div style={{
          ...cardStyle,
          background: isConnected ? "#dcfce7" : "#fef9c3",
          color: isConnected ? "#166534" : "#854d0e"
        }}>
          <p style={{ fontWeight: 600 }}>
            {isConnected ? "✅ Connected to server" : "🔄 Connecting to server..."}
          </p>
        </div>

        {/* VIDEO UPLOAD */}
        <div style={cardStyle}>
          <h3>📹 Upload Test Video</h3>
          <input
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            style={{ marginBottom: 10 }}
          />
          <video
            ref={uploadedVideoRef}
            controls
            loop
            style={{
              width: "100%",
              marginTop: 10,
              borderRadius: 10
            }}
          />
          <button
            style={{ ...buttonStyle, marginTop: 10 }}
            onClick={analyzeVideo}
            disabled={loadingVideo || !isConnected}
          >
            {loadingVideo ? "Analyzing..." : "Analyze Video"}
          </button>
        </div>

        <div style={cardStyle}>
          <h2>Live Camera</h2>
          {!cameraActive ? (
            <button
              onClick={startCamera}
              style={buttonStyle}
              disabled={!isConnected}
            >
              Start Camera
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
              <div>
                <h4 style={{ marginBottom: 8, color: "var(--text-secondary)" }}>Raw Camera Feed</h4>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    backgroundColor: "#000"
                  }}
                />
                <canvas ref={canvasRef} style={{ display: "none" }} />
              </div>
              
              {annotatedImageBase64 && (
                <div>
                  <h4 style={{ marginBottom: 8, color: "var(--color-primary-600)" }}>AI Processed Feed</h4>
                  <img 
                    src={`data:image/jpeg;base64,${annotatedImageBase64}`} 
                    alt="AI Annotated" 
                    style={{
                      width: "100%",
                      borderRadius: 10,
                      border: "2px solid var(--color-primary-500)",
                      backgroundColor: "#000"
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ROUTE MONITORING */}
        <div style={cardStyle}>
          <h3>🧭 Route Monitoring</h3>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <input
              type="text"
              placeholder="Latitude"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              style={{ padding: 8, flex: 1 }}
            />
            <input
              type="text"
              placeholder="Longitude"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              style={{ padding: 8, flex: 1 }}
            />
          </div>
          <button onClick={checkRoute} style={buttonStyle} disabled={!isConnected}>
            Check Route
          </button>

          {routeData && (
            <div style={{ marginTop: 15, padding: 15, background: "#f8fafc", borderRadius: 8 }}>
              <p><b>Assigned Route:</b> {routeData.expectedRouteNo || "N/A"}</p>
              <p>
                <b>Distance to Assigned Route:</b>{" "}
                {routeData.distanceToExpected_m?.toFixed(2)} m
              </p>
              
              {routeData.onRoute ? (
                <div style={{ marginTop: 10, padding: 10, background: "#dcfce7", borderRadius: 6, borderLeft: "4px solid #166534" }}>
                  <p style={{ color: "#166534", fontWeight: "bold", margin: 0 }}>
                    ✅ ON ASSIGNED ROUTE
                  </p>
                </div>
              ) : (
                <div style={{ marginTop: 10, padding: 10, background: "#fee2e2", borderRadius: 6, borderLeft: "4px solid #dc2626" }}>
                  <p style={{ color: "#991b1b", fontWeight: "bold", margin: 0 }}>
                    🚨 ROUTE DEVIATION
                  </p>
                  {routeData.matchedRouteNo && routeData.matchedRouteNo !== routeData.expectedRouteNo && (
                    <p style={{ color: "#dc2626", marginTop: 8, fontWeight: 500 }}>
                      ⚠ Bus is detected using unauthorized route: <b>Route {routeData.matchedRouteNo}</b>
                    </p>
                  )}
                  {routeData.offRouteSeconds > 0 && (
                    <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                      Off-route for {routeData.offRouteSeconds.toFixed(0)} seconds
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE - Results (same as before) */}
      <div style={{ width: "45%", display: "flex", flexDirection: "column", gap: 20 }}>
        <h2>AI Detection Results</h2>

        <div style={cardStyle}>
          <h3>🚦 Red Light Detection</h3>
          <p style={valueStyle}>
            {redCount > 0 ? `Detected (${redCount})` : "No Red Light"}
          </p>
          {redLightViolation && (
            <p style={{ color: "red", fontWeight: "bold" }}>
              🚨 RED LIGHT VIOLATION at {redLightViolation.speed} km/h
            </p>
          )}
        </div>

        <div style={cardStyle}>
          <h3>🚧 Double Line</h3>
          <p style={{
            ...valueStyle,
            color: doubleLine === "violation" ? "red" : "green"
          }}>
            {doubleLine}
          </p>
          {doubleLineViolation && (
            <p style={{ color: "red", fontWeight: "bold" }}>
              🚨 DOUBLE LINE VIOLATION at {doubleLineViolation.speed} km/h
            </p>
          )}
        </div>

        <div style={cardStyle}>
          <h3>🚗 Speed Monitoring</h3>
          
          <div style={{ marginBottom: 10 }}>
            <p style={valueStyle}>
              {speedCount > 0 ? `${speedCount} sign(s) detected` : "No speed signs"}
            </p>
          </div>

          <div style={{ background: "#f3f4f6", padding: 15, borderRadius: 8 }}>
            {detectedLimit && (
              <p><b>Speed Limit Detected:</b> {detectedLimit} km/h</p>
            )}
            
            {currentSpeed !== undefined && (
              <p><b>Current Bus Speed:</b> {currentSpeed} km/h</p>
            )}
            
            {overSpeed !== undefined && (
              <p
                style={{
                  fontWeight: "bold",
                  fontSize: 18,
                  color: overSpeed ? "#dc2626" : "#059669",
                  marginTop: 10
                }}
              >
                {overSpeed
                  ? `⚠ OVERSPEED! (${overByKmh} km/h over limit)`
                  : "✅ Within Speed Limit"}
              </p>
            )}
          </div>

          {speedViolation && (
            <div style={{ 
              marginTop: 15, 
              padding: 15, 
              background: "#fee2e2", 
              borderRadius: 8,
              borderLeft: "4px solid #dc2626"
            }}>
              <p style={{ fontWeight: "bold", color: "#991b1b" }}>
                🚨 SPEED VIOLATION REPORTED
              </p>
              <p><b>Speed at violation:</b> {speedViolation.speed} km/h</p>
              <p><b>Time:</b> {new Date(speedViolation.timestamp).toLocaleTimeString()}</p>
            </div>
          )}
        </div>

        {videoResults && (
          <div style={cardStyle}>
            <h3>📊 Video Analysis Summary</h3>
            <div style={{ display: "flex", gap: "20px", marginBottom: "15px" }}>
              <div style={{ background: "#f1f5f9", padding: "10px 15px", borderRadius: 8, flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>Frames Analyzed</p>
                <p style={{ margin: 0, fontSize: 24, fontWeight: "bold", color: "#0f172a" }}>{videoResults.frames_checked}</p>
              </div>
              <div style={{ background: "#fee2e2", padding: "10px 15px", borderRadius: 8, flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, color: "#991b1b" }}>Total Violations</p>
                <p style={{ margin: 0, fontSize: 24, fontWeight: "bold", color: "#7f1d1d" }}>
                  {
                    videoResults.results?.filter(r => 
                      r.redlight > 0 || r.speed_limit > 0
                    ).length || 0
                  }
                </p>
              </div>
            </div>

            <h4 style={{ marginBottom: "10px", marginTop: "20px", color: "#334155" }}>Frame-by-Frame Results</h4>
            <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
                <thead style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                  <tr>
                    <th style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>Frame</th>
                    <th style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>Red Light</th>
                    <th style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>Speed Sign</th>
                    <th style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>Double Line</th>
                  </tr>
                </thead>
                <tbody>
                  {videoResults.results?.map((r, idx) => {
                    const isViolation = r.redlight > 0 || r.speed_limit > 0;
                    return (
                      <tr key={idx} style={{ background: isViolation ? "#fff1f2" : "#fff", borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 12px", fontWeight: "bold" }}>{r.frame}</td>
                        <td style={{ padding: "10px 12px", color: r.redlight > 0 ? "#dc2626" : "#cbd5e1", fontWeight: r.redlight > 0 ? "bold" : "normal" }}>
                          {r.redlight > 0 ? `${r.redlight} Detected` : "Clear"}
                        </td>
                        <td style={{ padding: "10px 12px", color: r.speed_limit > 0 ? "#dc2626" : "#cbd5e1", fontWeight: r.speed_limit > 0 ? "bold" : "normal" }}>
                          {r.speed_limit > 0 ? `${r.speed_limit} Detected` : "Clear"}
                        </td>
                        <td style={{ padding: "10px 12px", color: r.double_line === "violation" ? "#dc2626" : "#64748b" }}>
                          {r.double_line || "unknown"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle = {
  background: "#fff",
  padding: 20,
  borderRadius: 10,
  boxShadow: "0 5px 20px rgba(0,0,0,0.08)"
};

const valueStyle = {
  fontSize: 22,
  fontWeight: 600
};

const buttonStyle = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "10px 18px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 14
};