import React, { useRef, useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";

const FLASK_BASE = "http://localhost:5000";
const BUS_API_BASE = "http://localhost:3000/api";
const DEFAULT_BUS_ID = "69f2d328bf4a01aeeb3ec29e"; // NP-2345
const ROUTE_POLL_MS = 5000;

const getActiveBusId = () => localStorage.getItem("activeBusId") || DEFAULT_BUS_ID;

export default function LiveDetection() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const uploadedVideoRef = useRef(null);
  const socketRef = useRef(null);

  const [results, setResults] = useState({});
  const [videoFile, setVideoFile] = useState(null);
  const [videoResults, setVideoResults] = useState(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [buses, setBuses] = useState([]);
  const [busLoading, setBusLoading] = useState(true);
  const [busError, setBusError] = useState(null);
  const [selectedBusId, setSelectedBusId] = useState(getActiveBusId());

  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [lastRouteFetchAt, setLastRouteFetchAt] = useState(null);

  // =========================
  // BUS LIST
  // =========================
  useEffect(() => {
    const fetchBuses = async () => {
      try {
        setBusLoading(true);
        setBusError(null);
        const response = await fetch(`${BUS_API_BASE}/bus/public`);
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        const nextBuses = await response.json();
        setBuses(nextBuses);

        if (!nextBuses.some((bus) => bus._id === selectedBusId)) {
          const fallbackId = nextBuses[0]?._id || DEFAULT_BUS_ID;
          setSelectedBusId(fallbackId);
          localStorage.setItem("activeBusId", fallbackId);
        }
      } catch (error) {
        console.error("Failed to load buses:", error);
        setBusError("Failed to load buses");
      } finally {
        setBusLoading(false);
      }
    };

    fetchBuses();
  }, []);

  const handleBusChange = (event) => {
    const nextBusId = event.target.value;
    setSelectedBusId(nextBusId);
    localStorage.setItem("activeBusId", nextBusId);
  };

  // =========================
  // SOCKET CONNECTION
  // =========================
  useEffect(() => {
    socketRef.current = io(FLASK_BASE, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    socketRef.current.on("connect", () => {
      console.log("✅ Connected to server");
      setIsConnected(true);
      setConnectionError(null);
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("❌ Connection error:", error);
      setIsConnected(false);
      setConnectionError(
        "Cannot connect to detection server. Make sure the Python server is running on port 5000."
      );
    });

    socketRef.current.on("disconnect", (reason) => {
      console.log("Disconnected:", reason);
      setIsConnected(false);
    });

    socketRef.current.on("result", (data) => {
      console.log("Socket result:", data);
      setResults(data);
    });

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
    const busId = selectedBusId || getActiveBusId();

    if (!video || !canvas || !socketRef.current?.connected) return;
    if (!video.videoWidth || !video.videoHeight) return;

    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0);

    const base64 = canvas.toDataURL("image/jpeg", 0.6);

    socketRef.current.emit("frame", {
      image: base64,
      busId,
    });
  };

  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
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
      const res = await fetch(`${FLASK_BASE}/predict-video`, {
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
  // ROUTE MONITORING
  // =========================
  const fetchRouteStatus = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setRouteLoading(true);
      setRouteError(null);
      const busId = selectedBusId || getActiveBusId();

      const res = await fetch(
        `${FLASK_BASE}/bus/route-status?busId=${encodeURIComponent(busId)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Server responded with ${res.status}`);
      }

      setRouteData(data);
      setLastRouteFetchAt(Date.now());
    } catch (err) {
      console.error("Route fetch failed:", err);
      setRouteError(err.message || "Failed to load route status");
    } finally {
      if (showLoader) setRouteLoading(false);
    }
  }, [selectedBusId]);

  useEffect(() => {
    fetchRouteStatus(true);

    const interval = setInterval(() => {
      fetchRouteStatus(false);
    }, ROUTE_POLL_MS);

    return () => clearInterval(interval);
  }, [fetchRouteStatus]);

  // =========================
  // RESULT VALUES
  // =========================
  const redCount = results?.redlight?.count || 0;
  const speedCount = results?.speed_limit?.count || 0;
  const doubleLine = results?.double_line?.top1?.class_name || "unknown";
  const detectedLimit = results?.speed_limit_detected_kmh;
  const currentSpeed = results?.currentBusSpeedKmh;
  const speedSource = results?.speedSource;
  const gpsSpeed = results?.gpsSpeedKmh ?? results?.gps_speed;
  const displayedSpeed =
    speedSource === "GPS" && gpsSpeed !== undefined ? gpsSpeed : currentSpeed;
  const overSpeed = results?.overSpeed;
  const overByKmh = results?.overByKmh;
  const redLightViolation = results?.red_light_violation;
  const speedViolation = results?.speed_violation;
  const doubleLineViolation = results?.double_line_violation;

  const annotatedImageBase64 =
    results?.speed_limit?.annotated_image_base64_jpg ||
    results?.redlight?.annotated_image_base64_jpg;

  const route = routeData?.route || null;
  const telemetry = routeData?.telemetry || null;
  const isOnRoute = Boolean(route?.onRoute);
  const routeStatus = route?.status || "unknown";
  const currentRouteNo = route?.currentRouteNo || route?.matchedRouteNo || "N/A";
  const matchedRouteNo = route?.matchedRouteNo || "N/A";
  const expectedRouteNo = route?.expectedRouteNo || "Not assigned";
  const distanceToMatched =
    typeof route?.distanceToMatched_m === "number"
      ? route.distanceToMatched_m.toFixed(2)
      : null;
  const distanceToExpected =
    typeof route?.distanceToExpected_m === "number"
      ? route.distanceToExpected_m.toFixed(2)
      : null;
  const threshold =
    typeof route?.threshold_m === "number" ? route.threshold_m.toFixed(0) : null;
  const offRouteSeconds =
    typeof route?.offRouteSeconds === "number"
      ? route.offRouteSeconds.toFixed(0)
      : null;

  if (connectionError) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: 24,
            borderRadius: 12,
            maxWidth: 600,
            margin: "0 auto"
          }}
        >
          <h2 style={{ fontSize: 24, marginBottom: 16 }}>❌ Server Connection Error</h2>
          <p style={{ marginBottom: 24 }}>{connectionError}</p>
          <div
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 8,
              textAlign: "left"
            }}
          >
            <h3 style={{ marginBottom: 12 }}>To fix this:</h3>
            <ol style={{ lineHeight: 2 }}>
              <li>Open a new terminal</li>
              <li>Navigate to your Python server</li>
              <code
                style={{
                  display: "block",
                  background: "#1e293b",
                  color: "#fff",
                  padding: 12,
                  borderRadius: 4,
                  margin: "12px 0"
                }}
              >
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
      <div
        style={{
          width: "55%",
          display: "flex",
          flexDirection: "column",
          gap: 20
        }}
      >
        {/* Connection Status */}
        <div
          style={{
            ...cardStyle,
            background: isConnected ? "#dcfce7" : "#fef9c3",
            color: isConnected ? "#166534" : "#854d0e"
          }}
        >
          <p style={{ fontWeight: 600, margin: 0 }}>
            {isConnected ? "✅ Connected to server" : "🔄 Connecting to server..."}
          </p>
        </div>

        {/* BUS SELECTOR */}
        <div style={cardStyle}>
          <h3>🚌 Select Bus</h3>
          {busError && (
            <div style={{ marginBottom: 12, padding: 10, background: "#fee2e2", color: "#991b1b", borderRadius: 8 }}>
              {busError}
            </div>
          )}
          {busLoading ? (
            <div style={{ padding: 12, color: "#64748b" }}>Loading buses...</div>
          ) : (
            <select
              value={selectedBusId}
              onChange={handleBusChange}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "#fff",
                fontSize: 14,
              }}
            >
              {buses.length === 0 && <option value="">No buses available</option>}
              {buses.map((bus) => (
                <option key={bus._id} value={bus._id}>
                  {bus.licensePlate} - Route {bus.routeId}
                </option>
              ))}
            </select>
          )}
          <p style={{ marginTop: 10, color: "#64748b", fontSize: 13 }}>
            The selected bus ID is sent with camera frames and route checks.
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

        {/* LIVE CAMERA */}
        <div style={cardStyle}>
          <h2>Live Camera</h2>
          {!cameraActive ? (
            <button onClick={startCamera} style={buttonStyle} disabled={!isConnected}>
              Start Camera
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
              <div>
                <h4 style={{ marginBottom: 8, color: "#475569" }}>Raw Camera Feed</h4>
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
                  <h4 style={{ marginBottom: 8, color: "#2563eb" }}>AI Processed Feed</h4>
                  <img
                    src={`data:image/jpeg;base64,${annotatedImageBase64}`}
                    alt="AI Annotated"
                    style={{
                      width: "100%",
                      borderRadius: 10,
                      border: "2px solid #3b82f6",
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 14
            }}
          >
            <h3 style={{ margin: 0 }}>🧭 Route Monitoring</h3>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              
              <button
                onClick={() => fetchRouteStatus(true)}
                style={buttonStyle}
                disabled={routeLoading}
              >
                {routeLoading ? "Refreshing..." : "Refresh Now"}
              </button>
            </div>
          </div>

          {routeError && (
            <div
              style={{
                marginBottom: 14,
                padding: 12,
                background: "#fee2e2",
                color: "#991b1b",
                borderRadius: 8,
                borderLeft: "4px solid #dc2626"
              }}
            >
              <b>Route status error:</b> {routeError}
            </div>
          )}

          {!routeData && routeLoading ? (
            <div
              style={{
                padding: 16,
                background: "#f8fafc",
                borderRadius: 8,
                color: "#475569"
              }}
            >
              Loading latest route status...
            </div>
          ) : null}

          {routeData && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                  marginBottom: 15
                }}
              >
                <InfoBox label="Expected Route" value={expectedRouteNo} />
                <InfoBox label="Current Route" value={currentRouteNo} />
                <InfoBox label="Matched Route" value={matchedRouteNo} />
                <InfoBox label="Status" value={routeStatus} />
                <InfoBox
                  label="Last Update"
                  value={
                    lastRouteFetchAt
                      ? new Date(lastRouteFetchAt).toLocaleTimeString()
                      : "N/A"
                  }
                />
              </div>

              <div
                style={{
                  marginTop: 10,
                  padding: 12,
                  background: isOnRoute ? "#dcfce7" : "#fee2e2",
                  borderRadius: 8,
                  borderLeft: isOnRoute ? "4px solid #16a34a" : "4px solid #dc2626"
                }}
              >
                <p
                  style={{
                    color: isOnRoute ? "#166534" : "#991b1b",
                    fontWeight: "bold",
                    margin: 0
                  }}
                >
                  {isOnRoute ? "✅ ON ROUTE" : "🚨 OFF ROUTE"}
                </p>

                <div style={{ marginTop: 10, color: "#334155", lineHeight: 1.8 }}>
                  <p style={{ margin: 0 }}>
                    <b>Distance to matched route:</b>{" "}
                    {distanceToMatched ? `${distanceToMatched} m` : "N/A"}
                  </p>
                  <p style={{ margin: 0 }}>
                    <b>Distance to expected route:</b>{" "}
                    {distanceToExpected ? `${distanceToExpected} m` : "N/A"}
                  </p>
                  <p style={{ margin: 0 }}>
                    <b>Threshold:</b> {threshold ? `${threshold} m` : "N/A"}
                  </p>
                  <p style={{ margin: 0 }}>
                    <b>Off-route time:</b>{" "}
                    {offRouteSeconds ? `${offRouteSeconds} seconds` : "0 seconds"}
                  </p>
                </div>
              </div>

              {telemetry && (
                <div
                  style={{
                    marginTop: 15,
                    padding: 15,
                    background: "#f8fafc",
                    borderRadius: 8
                  }}
                >
                  <h4 style={{ marginTop: 0, marginBottom: 10 }}>Latest Telemetry</h4>
                  <p style={{ margin: 0 }}>
                    <b>Latitude:</b> {telemetry.lat ?? "N/A"}
                  </p>
                  <p style={{ margin: 0 }}>
                    <b>Longitude:</b> {telemetry.lng ?? "N/A"}
                  </p>
                  <p style={{ margin: 0 }}>
                    <b>Speed:</b> {telemetry.speedKmh ?? "N/A"} km/h
                  </p>
                  <p style={{ margin: 0 }}>
                    <b>Accuracy:</b> {telemetry.accuracyM ?? "N/A"} m
                  </p>
                  <p style={{ margin: 0 }}>
                    <b>Heading:</b> {telemetry.heading ?? "N/A"}
                  </p>
                  <p style={{ margin: 0 }}>
                    <b>Telemetry Time:</b>{" "}
                    {telemetry.ts ? new Date(telemetry.ts).toLocaleString() : "N/A"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div
        style={{
          width: "45%",
          display: "flex",
          flexDirection: "column",
          gap: 20
        }}
      >
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
          <p
            style={{
              ...valueStyle,
              color: doubleLine === "violation" ? "red" : "green"
            }}
          >
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
              <p>
                <b>Speed Limit Detected:</b> {detectedLimit} km/h
              </p>
            )}

            {displayedSpeed !== undefined && (
              <p>
                <b>Current Bus Speed:</b> {displayedSpeed} km/h
              </p>
            )}

            {speedSource && (
              <p>
                <b>Speed Source:</b> {speedSource}
              </p>
            )}

            {speedSource === "GPS" && gpsSpeed !== undefined && (
              <p>
                <b>Raw GPS Speed:</b> {gpsSpeed} km/h
              </p>
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
            <div
              style={{
                marginTop: 15,
                padding: 15,
                background: "#fee2e2",
                borderRadius: 8,
                borderLeft: "4px solid #dc2626"
              }}
            >
              <p style={{ fontWeight: "bold", color: "#991b1b" }}>
                🚨 SPEED VIOLATION REPORTED
              </p>
              <p>
                <b>Speed at violation:</b> {speedViolation.speed} km/h
              </p>
              <p>
                <b>Time:</b>{" "}
                {speedViolation.timestamp
                  ? new Date(speedViolation.timestamp).toLocaleTimeString()
                  : "N/A"}
              </p>
            </div>
          )}
        </div>

        {videoResults && (
          <div style={cardStyle}>
            <h3>📊 Video Analysis Summary</h3>
            <div style={{ display: "flex", gap: "20px", marginBottom: "15px" }}>
              <div
                style={{
                  background: "#f1f5f9",
                  padding: "10px 15px",
                  borderRadius: 8,
                  flex: 1
                }}
              >
                <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
                  Frames Analyzed
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: "bold",
                    color: "#0f172a"
                  }}
                >
                  {videoResults.frames_checked}
                </p>
              </div>

              <div
                style={{
                  background: "#fee2e2",
                  padding: "10px 15px",
                  borderRadius: 8,
                  flex: 1
                }}
              />
            </div>

            <h4 style={{ marginBottom: "10px", marginTop: "20px", color: "#334155" }}>
              Frame-by-Frame Results
            </h4>

            <div
              style={{
                maxHeight: "300px",
                overflowY: "auto",
                border: "1px solid #e2e8f0",
                borderRadius: 8
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                  fontSize: 14
                }}
              >
                <thead style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                  <tr>
                    <th style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>
                      Frame
                    </th>
                    <th style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>
                      Red Light
                    </th>
                    <th style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>
                      Speed Sign
                    </th>
                    <th style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>
                      Double Line
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {videoResults.results?.map((r, idx) => {
                    const isViolation = r.redlight > 0 || r.speed_limit > 0;

                    return (
                      <tr
                        key={idx}
                        style={{
                          background: isViolation ? "#fff1f2" : "#fff",
                          borderBottom: "1px solid #f1f5f9"
                        }}
                      >
                        <td style={{ padding: "10px 12px", fontWeight: "bold" }}>
                          {r.frame}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            color: r.redlight > 0 ? "#dc2626" : "#cbd5e1",
                            fontWeight: r.redlight > 0 ? "bold" : "normal"
                          }}
                        >
                          {r.redlight > 0 ? `${r.redlight} Detected` : "Clear"}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            color: r.speed_limit > 0 ? "#dc2626" : "#cbd5e1",
                            fontWeight: r.speed_limit > 0 ? "bold" : "normal"
                          }}
                        >
                          {r.speed_limit > 0 ? `${r.speed_limit} Detected` : "Clear"}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            color: r.double_line === "violation" ? "#dc2626" : "#64748b"
                          }}
                        >
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

function InfoBox({ label, value }) {
  return (
    <div
      style={{
        background: "#f8fafc",
        padding: 12,
        borderRadius: 8,
        border: "1px solid #e2e8f0"
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: "#64748b",
          marginBottom: 6
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 700,
          color: "#0f172a"
        }}
      >
        {value}
      </p>
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