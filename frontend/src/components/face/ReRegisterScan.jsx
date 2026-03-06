/**
 * ReRegisterScan — Guided 5-angle face re-scan for an existing driver.
 * Opened as a modal from the "Re-register Face" button in the Drivers table.
 * Uses the same FaceMesh overlay + 5-angle capture flow as FaceRegistration.
 */
import { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import api from "../../api/axios";
import useFaceMesh from "../../hooks/useFaceMesh";
import { Camera, CheckCircle, XCircle, RefreshCw } from "lucide-react";

const SCAN_STEPS = [
  { label: "Look Straight", icon: "😐", instruction: "Face the camera directly" },
  { label: "Turn Left", icon: "👈", instruction: "Turn your head slightly to the left" },
  { label: "Turn Right", icon: "👉", instruction: "Turn your head slightly to the right" },
  { label: "Look Up", icon: "👆", instruction: "Tilt your head slightly upward" },
  { label: "Look Down", icon: "👇", instruction: "Tilt your chin slightly downward" },
];

const VIDEO_CONSTRAINTS = { facingMode: "user", width: 480, height: 360 };

export default function ReRegisterScan({ driver, onComplete }) {
  const webcamRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [step, setStep] = useState(0);
  const [captures, setCaptures] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [camReady, setCamReady] = useState(false);

  const { canvasRef, faceDetected } = useFaceMesh(webcamRef, scanning && camReady);

  const startScan = () => {
    setMsg(null);
    setCaptures([]);
    setStep(0);
    setScanning(true);
  };

  const resetScan = () => {
    setScanning(false);
    setStep(0);
    setCaptures([]);
    setMsg(null);
  };

  const capture = async () => {
    if (!webcamRef.current) return;
    const imgData = webcamRef.current.getScreenshot();
    if (!imgData) return;
    const blob = await (await fetch(imgData)).blob();
    const newCap = { blob, preview: imgData, angle: SCAN_STEPS[step].label };
    const updated = [...captures, newCap];
    setCaptures(updated);
    if (step < SCAN_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      setScanning(false);
    }
  };

  const submit = async () => {
    if (captures.length === 0) return;
    setUploading(true);
    setMsg(null);

    const fd = new FormData();
    fd.append("driverId", driver._id);
    captures.forEach((c, i) => fd.append("photos", c.blob, `rescan_${i}.jpg`));

    try {
      const res = await api.post("/driver/register-scan", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const totalEnc = res.data.scanResult?.total_encodings ?? captures.length;
      const failed = res.data.scanResult?.failed_images ?? 0;
      setMsg({
        type: "success",
        text: `Face re-registered! ${totalEnc} encoding(s) from ${captures.length} photos${failed > 0 ? ` (${failed} failed)` : ""}.`,
      });
      setTimeout(() => onComplete?.(), 1200);
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Re-registration failed" });
    } finally {
      setUploading(false);
    }
  };

  const total = SCAN_STEPS.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Message */}
      {msg && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: msg.type === "success" ? "#f0fdf4" : "#fef2f2",
          color: msg.type === "success" ? "#16a34a" : "#dc2626",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          {msg.type === "success" ? <CheckCircle size={14} /> : <XCircle size={14} />} {msg.text}
        </div>
      )}

      {/* Start button */}
      {!scanning && captures.length === 0 && !msg && (
        <button type="button" onClick={startScan}
          style={{
            padding: "14px 20px",
            background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
            color: "white", border: "none", borderRadius: 10,
            fontSize: 15, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
          <Camera size={18} /> Start Face Scan ({total} angles)
        </button>
      )}

      {/* Live scanning */}
      {scanning && (
        <div style={{ border: "2px solid #6366f1", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ background: "#eef2ff", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: "#4338ca", fontSize: 14 }}>
              {SCAN_STEPS[step].icon} {SCAN_STEPS[step].label}
            </span>
            <span style={{ fontSize: 13, color: "#6366f1", fontWeight: 600 }}>
              {step + 1} / {total}
            </span>
          </div>
          <div style={{ height: 4, background: "#e0e7ff" }}>
            <div style={{ height: "100%", background: "#6366f1", transition: "width 0.3s", width: `${((step + 1) / total) * 100}%` }} />
          </div>
          <div style={{ position: "relative", background: "#000" }}>
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              onUserMedia={() => setCamReady(true)}
              onUserMediaError={() => setCamReady(false)}
              videoConstraints={VIDEO_CONSTRAINTS}
              style={{ width: "100%", display: "block" }}
            />
            <canvas ref={canvasRef}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}
            />
            <div style={{ position: "absolute", top: 10, left: 10 }}>
              <span style={{
                padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                background: faceDetected ? "rgba(22,163,74,0.85)" : "rgba(220,38,38,0.8)",
                color: "white",
              }}>
                {faceDetected ? "● Face Detected" : "○ No Face"}
              </span>
            </div>
          </div>
          <div style={{ padding: "10px 14px", background: "#f8fafc", display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>{SCAN_STEPS[step].instruction}</p>
            <button type="button" onClick={capture} disabled={!faceDetected}
              style={{
                padding: "10px 20px", border: "none", borderRadius: 8,
                fontSize: 14, fontWeight: 600, cursor: faceDetected ? "pointer" : "not-allowed",
                background: faceDetected ? "#6366f1" : "#cbd5e1",
                color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
              <Camera size={16} /> Capture {SCAN_STEPS[step].label}
            </button>
          </div>
        </div>
      )}

      {/* Thumbnails */}
      {captures.length > 0 && !scanning && (
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
            Captured {captures.length} / {total} angles
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {captures.map((c, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={c.preview} alt={c.angle}
                  style={{ width: 72, height: 54, objectFit: "cover", borderRadius: 6, border: "2px solid #6366f1" }} />
                <div style={{ fontSize: 9, textAlign: "center", color: "#6366f1", fontWeight: 600, marginTop: 2 }}>{c.angle}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" onClick={resetScan}
              style={{ flex: 1, padding: "10px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <RefreshCw size={14} /> Retake
            </button>
            <button type="button" onClick={submit} disabled={uploading}
              style={{
                flex: 2, padding: "10px", border: "none", borderRadius: 8,
                fontSize: 14, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer",
                background: "#0284c7", color: "white",
                opacity: uploading ? 0.6 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
              {uploading ? "Registering..." : `Re-register Face (${captures.length} photos)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
