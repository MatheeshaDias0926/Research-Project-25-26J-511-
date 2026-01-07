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
  RefreshCw,
  AlertTriangle,
  VideoOff
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

  /* ---------------- AUTO MODE POLLING ---------------- */
  useEffect(() => {
    let interval;
    if (mode === "auto") {
      interval = setInterval(async () => {
        try {
          const res = await axios.get("http://localhost:5001/api/face/status");

          // Update Safety Flags
          setSafetyStatus(prev => {
            const isDrowsy = res.data.drowsy;
            const isYawning = res.data.yawning;

            if (isDrowsy && !prev.drowsy) addLog("⚠️ DROWSY ALERT DETECTED");
            if (isYawning && !prev.yawning) addLog("⚠️ YAWNING DETECTED");

            return { drowsy: isDrowsy, yawning: isYawning };
          });

          if (res.data.match_name) {
            if (autoMatch?.name !== res.data.match_name) {
              setAutoMatch({
                name: res.data.match_name,
                conf: res.data.confidence_dist
              });
              setResult({
                verified: true,
                driverName: res.data.match_name
              });
              addLog(`AUTO MATCH → ${res.data.match_name}`);
              setTimeout(() => setResult(null), 3000);
            }
          } else {
            setAutoMatch(null);
          }
        } catch {
          /* silent */
        }
      }, 800);
    }
    return () => clearInterval(interval);
  }, [mode, autoMatch]);

  /* ---------------- MANUAL MODE ---------------- */
  const captureAndVerify = async () => {
    if (!webcamRef.current) return;
    setLoading(true);
    addLog("Manual capture started");

    const img = webcamRef.current.getScreenshot();
    const blob = await (await fetch(img)).blob();

    const form = new FormData();
    form.append("image", blob, "capture.jpg");

    try {
      const res = await axios.post(
        "http://localhost:3000/api/driver/verify",
        form
      );
      setResult(res.data);
      addLog(res.data.verified ? "Access granted" : "Access denied");
    } catch {
      addLog("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-100 p-4 lg:p-8">

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Scan className="text-blue-600" size={32} />
            Live Face Recognition
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Smart Bus Biometric Control Center
          </p>
        </div>

        {/* MODE SWITCH */}
        <div className="flex bg-white rounded-xl shadow-md overflow-hidden border">
          <button
            onClick={() => setMode("auto")}
            className={`px-6 py-3 font-bold text-sm transition-all
              ${mode === "auto"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100"}`}
          >
            AUTO
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`px-6 py-3 font-bold text-sm transition-all
              ${mode === "manual"
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-100"}`}
          >
            MANUAL
          </button>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* CAMERA */}
        <div className="lg:col-span-3 relative rounded-3xl overflow-hidden shadow-2xl border bg-black">

          {mode === "auto" ? (
            !videoError ? (
              <img
                src="http://localhost:5001/api/face/feed"
                className="w-full aspect-video object-contain"
                onError={() => {
                  setVideoError(true);
                  addLog("Camera feed offline");
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-white h-full">
                <VideoOff size={48} />
                <p className="mt-3 font-bold">Camera Offline</p>
              </div>
            )
          ) : (
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              onUserMedia={() => setCamReady(true)}
              className="w-full aspect-video object-contain"
            />
          )}

          {/* STATUS */}
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-xs text-green-400 px-3 py-1 rounded-full border border-green-800">
            ● LIVE · {mode.toUpperCase()}
          </div>

          {/* RESULT (Verification) */}
          {result && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4 z-40">
              {result.verified ? (
                <CheckCircle size={32} className="text-green-600" />
              ) : (
                <XCircle size={32} className="text-red-600" />
              )}
              <div>
                <div className="font-extrabold text-lg">
                  {result.verified ? "ACCESS GRANTED" : "ACCESS DENIED"}
                </div>
                <div className="text-sm text-slate-500">
                  {result.driverName || "Unknown"}
                </div>
              </div>
            </div>
          )}

          {/* SAFETY ALERTS (Drowsy/Yawning) */}
          {(safetyStatus.drowsy || safetyStatus.yawning) && (
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-8 rounded-3xl backdrop-blur-2xl shadow-2xl border-4 flex flex-col items-center gap-6 animate-pulse z-50 ${safetyStatus.drowsy ? "bg-red-600/90 border-red-400" : "bg-orange-600/90 border-orange-400"
              }`}>
              <AlertTriangle size={80} className="text-white" />
              <div className="text-center">
                <h2 className="text-4xl font-black text-white tracking-tighter mb-2">
                  {safetyStatus.drowsy ? "DROWSY ALERT!" : "YAWN DETECTED!"}
                </h2>
                <p className="text-white/90 font-bold text-lg">
                  {safetyStatus.drowsy ? "DRIVER EYES CLOSED - PLEASE WAKE UP" : "DRIVER YAWNING - TAKE A BREAK IF TIRED"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="flex flex-col gap-6">

          {/* STATS */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 rounded-2xl bg-white/70 backdrop-blur shadow">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <Activity size={14} /> SYSTEM
              </div>
              <div className="font-extrabold text-green-600 text-lg">ONLINE</div>
            </Card>

            <Card className="p-4 rounded-2xl bg-white/70 backdrop-blur shadow">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <Radio size={14} /> DETECTIONS
              </div>
              <div className="font-extrabold text-blue-600 text-lg">
                {autoMatch ? 1 : 0}
              </div>
            </Card>
          </div>

          {/* TERMINAL */}
          <Card className="flex-1 rounded-3xl bg-slate-900 text-cyan-400 font-mono text-xs shadow-xl overflow-hidden">
            <div className="bg-slate-800 px-4 py-2 font-bold flex justify-between">
              TERMINAL <Terminal size={14} />
            </div>
            <div className="p-4 space-y-2 overflow-y-auto max-h-[300px]">
              {logs.map((l, i) => (
                <div key={i}>&gt; {l}</div>
              ))}
            </div>
          </Card>

          {/* MANUAL BUTTON */}
          {mode === "manual" && (
            <button
              onClick={captureAndVerify}
              disabled={loading || !camReady}
              className="rounded-2xl py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-lg shadow-xl transition-all disabled:opacity-50"
            >
              {loading ? "VERIFYING..." : "CAPTURE & VERIFY"}
            </button>
          )}

          {/* INFO */}
          <div className="p-3 rounded-xl bg-blue-50 text-blue-800 text-xs flex gap-2 items-start border">
            <AlertTriangle size={14} />
            Ensure good lighting and face visibility
          </div>

        </div>
      </div>
    </div>
  );
};

export default FacialRecognitionLive;
