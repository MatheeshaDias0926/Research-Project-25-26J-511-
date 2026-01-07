import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import {
  Terminal,
  Activity,
  Radio,
  CheckCircle,
  XCircle,
  Scan,
  AlertTriangle,
  VideoOff,
  User
} from "lucide-react";
import { Card } from "../../components/ui/Card";

const FacialRecognitionLive = () => {
  const webcamRef = useRef(null);

  const [mode, setMode] = useState("auto");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState(["System initialized"]);
  const [autoMatch, setAutoMatch] = useState(null);
  const [videoError, setVideoError] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [safetyStatus, setSafetyStatus] = useState({ drowsy: false, yawning: false });

  const addLog = (msg) => {
    const t = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${t}] ${msg}`, ...prev.slice(0, 12)]);
  };

  /* ---------------- AUTO MODE ---------------- */
  useEffect(() => {
    let interval;
    if (mode === "auto") {
      interval = setInterval(async () => {
        try {
          const res = await axios.get("http://localhost:5001/api/face/status");

          setSafetyStatus(prev => {
            if (res.data.drowsy && !prev.drowsy) addLog("⚠️ DROWSY ALERT");
            if (res.data.yawning && !prev.yawning) addLog("⚠️ YAWNING DETECTED");
            return { drowsy: res.data.drowsy, yawning: res.data.yawning };
          });

          if (res.data.match_name) {
            if (autoMatch?.name !== res.data.match_name) {
              setAutoMatch({ name: res.data.match_name });
              setResult({ verified: true, driverName: res.data.match_name });
              addLog(`AUTO MATCH → ${res.data.match_name}`);
              setTimeout(() => setResult(null), 4000);
            }
          } else setAutoMatch(null);
        } catch {}
      }, 800);
    }
    return () => clearInterval(interval);
  }, [mode, autoMatch]);

  /* ---------------- MANUAL ---------------- */
  const captureAndVerify = async () => {
    if (!webcamRef.current) return;
    setLoading(true);
    addLog("Manual capture started");

    const img = webcamRef.current.getScreenshot();
    const blob = await (await fetch(img)).blob();

    const form = new FormData();
    form.append("image", blob);

    try {
      const res = await axios.post("http://localhost:3000/api/driver/verify", form);
      setResult(res.data);
      addLog(res.data.verified ? "Access granted" : "Access denied");
    } catch {
      addLog("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const driverName = result?.driverName || autoMatch?.name || "Unknown Driver";
  const accessGranted = result?.verified;

  return (
    <div style={pageStyle}>
      {/* HEADER */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>
            <Scan size={30} /> Live Face Recognition
          </h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>
            Smart Bus Biometric Control Center
          </p>
        </div>

        <div style={switchStyle}>
          <button onClick={() => setMode("auto")} style={mode === "auto" ? activeBtn : btn}>AUTO</button>
          <button onClick={() => setMode("manual")} style={mode === "manual" ? activeBtn : btn}>MANUAL</button>
        </div>
      </div>

      <div style={gridStyle}>
        {/* CAMERA */}
        <div style={cameraWrap}>
          {mode === "auto" ? (
            !videoError ? (
              <img
                src="http://localhost:5001/api/face/feed"
                style={videoStyle}
                onError={() => setVideoError(true)}
              />
            ) : (
              <div style={offlineStyle}>
                <VideoOff size={48} />
                Camera Offline
              </div>
            )
          ) : (
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              onUserMedia={() => setCamReady(true)}
              style={videoStyle}
            />
          )}

          <div style={liveBadge}>● LIVE · {mode.toUpperCase()}</div>

          {/* RESULT POPUP */}
          {result && (
            <div style={resultBox}>
              {accessGranted ? (
                <CheckCircle size={30} color="#16a34a" />
              ) : (
                <XCircle size={30} color="#dc2626" />
              )}
              <div>
                <strong>{accessGranted ? "ACCESS GRANTED" : "ACCESS DENIED"}</strong>
                <div style={{ fontSize: 13 }}>{driverName}</div>
              </div>
            </div>
          )}

          {/* CRITICAL ALERT */}
          {(safetyStatus.drowsy || safetyStatus.yawning) && (
            <div style={alertBox(safetyStatus.drowsy)}>
              <AlertTriangle size={70} />
              <h2>{safetyStatus.drowsy ? "DROWSY ALERT!" : "YAWN DETECTED!"}</h2>
              <p>
                {safetyStatus.drowsy
                  ? "DRIVER EYES CLOSED – WAKE UP"
                  : "TAKE A BREAK IF TIRED"}
              </p>

              {/* DRIVER INFO BELOW ALERT */}
              <div style={alertDriverBox}>
                <User size={18} />
                <div>
                  <strong>{driverName}</strong>
                  <div style={{ fontSize: 13 }}>
                    {accessGranted ? "ACCESS GRANTED" : "NOT VERIFIED"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* DRIVER STATUS CARD */}
          <Card style={driverStatusCard}>
            <User size={18} />
            <div>
              <div style={{ fontWeight: 700 }}>{driverName}</div>
              <div style={{ fontSize: 13, color: accessGranted ? "#16a34a" : "#dc2626" }}>
                {accessGranted ? "ACCESS GRANTED" : "NOT VERIFIED"}
              </div>
            </div>
          </Card>

          {/* STATS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Card style={statCard}><Activity size={14} /> ONLINE</Card>
            <Card style={statCard}><Radio size={14} /> {autoMatch ? 1 : 0}</Card>
          </div>

          {/* TERMINAL */}
          <Card style={terminal}>
            <div style={terminalHeader}>
              TERMINAL <Terminal size={14} />
            </div>
            <div style={terminalBody}>
              {logs.map((l, i) => <div key={i}>&gt; {l}</div>)}
            </div>
          </Card>

          {mode === "manual" && (
            <button
              onClick={captureAndVerify}
              disabled={loading || !camReady}
              style={verifyBtn}
            >
              {loading ? "VERIFYING..." : "CAPTURE & VERIFY"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacialRecognitionLive;

/* ===================== STYLES ===================== */

const pageStyle = {
  minHeight: "100vh",
  padding: 24,
  background: "linear-gradient(135deg,#f8fafc,#e0f2fe)"
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 24
};

const titleStyle = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  fontSize: 28,
  fontWeight: 800
};

const switchStyle = {
  display: "flex",
  borderRadius: 12,
  overflow: "hidden",
  border: "1px solid #e2e8f0"
};

const btn = {
  padding: "10px 20px",
  background: "white",
  border: "none",
  cursor: "pointer"
};

const activeBtn = { ...btn, background: "#2563eb", color: "white" };

const gridStyle = { display: "grid", gridTemplateColumns: "3fr 1fr", gap: 24 };

const cameraWrap = { position: "relative", borderRadius: 24, overflow: "hidden", background: "black" };

const videoStyle = { width: "100%", aspectRatio: "16/9", objectFit: "contain" };

const liveBadge = {
  position: "absolute",
  top: 12,
  left: 12,
  background: "rgba(0,0,0,0.6)",
  color: "#22c55e",
  padding: "4px 10px",
  borderRadius: 20,
  fontSize: 12
};

const resultBox = {
  position: "absolute",
  bottom: 20,
  left: "50%",
  transform: "translateX(-50%)",
  background: "white",
  padding: 16,
  borderRadius: 16,
  display: "flex",
  gap: 12
};

const alertBox = (danger) => ({
  position: "absolute",
  inset: 0,
  background: danger ? "rgba(220,38,38,0.92)" : "rgba(234,88,12,0.92)",
  color: "white",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 16
});

const alertDriverBox = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "rgba(0,0,0,0.3)",
  padding: "10px 16px",
  borderRadius: 14
};

const statCard = {
  padding: 16,
  display: "flex",
  gap: 8,
  alignItems: "center",
  fontWeight: 700
};

const driverStatusCard = {
  padding: 16,
  display: "flex",
  gap: 12,
  alignItems: "center",
  fontWeight: 700,
  borderLeft: "5px solid #2563eb"
};

const terminal = {
  background: "#020617",
  color: "#22d3ee",
  borderRadius: 20,
  overflow: "hidden"
};

const terminalHeader = {
  padding: 12,
  borderBottom: "1px solid #164e63",
  fontWeight: 700,
  display: "flex",
  justifyContent: "space-between"
};

const terminalBody = {
  padding: 12,
  maxHeight: 260,
  overflowY: "auto",
  fontSize: 12
};

const verifyBtn = {
  padding: 16,
  borderRadius: 16,
  background: "#4f46e5",
  color: "white",
  fontWeight: 800,
  border: "none",
  cursor: "pointer"
};

const offlineStyle = {
  color: "white",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%"
};
