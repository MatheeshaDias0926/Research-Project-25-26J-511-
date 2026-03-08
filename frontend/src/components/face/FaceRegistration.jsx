/**
 * FaceRegistration — Guided 5-angle face scan with MediaPipe FaceMesh overlay.
 *
 * Shows a live webcam feed with green FaceMesh dots. Guides the user through
 * 5 head angles (straight, left, right, up, down), capturing a photo at each.
 * All 5 images are sent to POST /api/driver/register-scan.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import api from "../../api/axios";
import useFaceMesh from "../../hooks/useFaceMesh";
import {
  Camera, CheckCircle, XCircle, UserPlus, RefreshCw,
} from "lucide-react";

// 5 scan angles
const SCAN_STEPS = [
  { label: "Look Straight", icon: "😐", instruction: "Face the camera directly" },
  { label: "Turn Left", icon: "👈", instruction: "Turn your head slightly to the left" },
  { label: "Turn Right", icon: "👉", instruction: "Turn your head slightly to the right" },
  { label: "Look Up", icon: "👆", instruction: "Tilt your head slightly upward" },
  { label: "Look Down", icon: "👇", instruction: "Tilt your chin slightly downward" },
];

const VIDEO_CONSTRAINTS = { facingMode: "user", width: 480, height: 360 };

export default function FaceRegistration({ drivers = [], onComplete, cardStyle, inputStyle }) {
  const webcamRef = useRef(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [step, setStep] = useState(0);
  const [captures, setCaptures] = useState([]); // [{blob, preview, angle}]
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [camReady, setCamReady] = useState(false);

  // FaceMesh hook — only active while scanning
  const { canvasRef, faceDetected } = useFaceMesh(webcamRef, scanning && camReady);

  // ── Start / Reset ──
  const startScan = () => {
    if (!selectedDriverId) {
      setMsg({ type: "error", text: "Please select a driver first" });
      return;
    }
    setMsg(null);
    setCaptures([]);
    setStep(0);
    setScanning(true);
  };

  const resetScan = () => {
    setScanning(false);
    setStep(0);
    setCaptures([]);
  };

  // ── Capture current angle ──
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
      setScanning(false); // all angles done
    }
  };

  const removeCapture = (idx) => {
    setCaptures((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Submit all captures ──
  const submit = async (e) => {
    e.preventDefault();
    if (captures.length === 0) {
      setMsg({ type: "error", text: "Complete the face scan first" });
      return;
    }
    setUploading(true);
    setMsg(null);

    const fd = new FormData();
    fd.append("driverId", selectedDriverId);
    captures.forEach((c, i) => fd.append("photos", c.blob, `scan_${i}.jpg`));

    try {
      const res = await api.post("/driver/register-scan", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const totalEnc = res.data.scanResult?.total_encodings ?? captures.length;
      const failed = res.data.scanResult?.failed_images ?? 0;
      const name = drivers.find((d) => d._id === selectedDriverId)?.name || "Driver";
      setMsg({
        type: "success",
        text: `${name}'s face registered successfully! ${totalEnc} encoding(s) from ${captures.length} photos${failed > 0 ? ` (${failed} failed)` : ""}.`,
      });
      setSelectedDriverId("");
      resetScan();
      onComplete?.(); // refresh parent data
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Registration failed" });
    } finally {
      setUploading(false);
    }
  };

  const progress = captures.length;
  const total = SCAN_STEPS.length;

  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <UserPlus size={18} /> Register Face — Existing Driver
      </h3>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Driver dropdown */}
        <select
          style={{ ...inputStyle, cursor: "pointer" }}
          required
          value={selectedDriverId}
          onChange={(e) => { setSelectedDriverId(e.target.value); setMsg(null); }}
        >
          <option value="">— Select a Driver —</option>
          {drivers.map((d) => (
            <option key={d._id} value={d._id}>
              {d.name} — {d.licenseNumber}
              {d.faceEncoding?.length > 0 ? " ✓ (has face data)" : ""}
            </option>
          ))}
        </select>

        {/* Start button (visible before scanning starts and before any captures) */}
        {!scanning && captures.length === 0 && (
          <button
            type="button"
            onClick={startScan}
            style={{
              padding: "14px 20px",
              background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
              color: "white", border: "none", borderRadius: 10,
              fontSize: 15, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <Camera size={18} /> Start Face Scan ({total} angles)
          </button>
        )}

        {/* ── Live scanning panel ── */}
        {scanning && (
          <div style={{ border: "2px solid #6366f1", borderRadius: 12, overflow: "hidden" }}>
            {/* Header + progress */}
            <div style={{ background: "#eef2ff", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, color: "#4338ca", fontSize: 14 }}>
                {SCAN_STEPS[step].icon} {SCAN_STEPS[step].label}
              </span>
              <span style={{ fontSize: 13, color: "#6366f1", fontWeight: 600 }}>
                {step + 1} / {total}
              </span>
            </div>
            {/* Progress bar */}
            <div style={{ height: 4, background: "#e0e7ff" }}>
              <div style={{ height: "100%", background: "#6366f1", transition: "width 0.3s", width: `${((step + 1) / total) * 100}%` }} />
            </div>

            {/* Webcam + FaceMesh overlay */}
            <div style={{ position: "relative", background: "#000" }}>
              <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                onUserMedia={() => setCamReady(true)}
                onUserMediaError={() => setCamReady(false)}
                videoConstraints={VIDEO_CONSTRAINTS}
                style={{ width: "100%", display: "block" }}
              />
              {/* Canvas overlay for green dots */}
              <canvas
                ref={canvasRef}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}
              />
              {/* Face detection indicator */}
              <div style={{ position: "absolute", top: 10, left: 10 }}>
                <span style={{
                  padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                  background: faceDetected ? "rgba(22,163,74,0.85)" : "rgba(220,38,38,0.8)",
                  color: "white",
                }}>
                  {faceDetected ? "● Face Detected" : "○ No Face"}
                </span>
              </div>
              {/* Instruction overlay */}
              <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, textAlign: "center" }}>
                <span style={{ background: "rgba(0,0,0,0.6)", color: "white", padding: "6px 14px", borderRadius: 20, fontSize: 13 }}>
                  {SCAN_STEPS[step].instruction}
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ padding: 12, display: "flex", gap: 10, justifyContent: "center", background: "#f8fafc" }}>
              <button
                type="button"
                onClick={capture}
                disabled={!faceDetected}
                style={{
                  padding: "10px 28px", background: faceDetected ? "#6366f1" : "#94a3b8",
                  color: "white", border: "none", borderRadius: 8,
                  fontSize: 14, fontWeight: 600,
                  cursor: faceDetected ? "pointer" : "not-allowed",
                  opacity: faceDetected ? 1 : 0.5,
                }}
              >
                📸 Capture
              </button>
              <button
                type="button"
                onClick={resetScan}
                style={{ padding: "10px 18px", background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Captured thumbnails ── */}
        {captures.length > 0 && !scanning && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                {progress} / {total} photos captured
              </span>
              {progress < total && (
                <button type="button" onClick={startScan}
                  style={{ fontSize: 12, color: "#6366f1", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                  + Continue scan
                </button>
              )}
            </div>
            {/* Progress indicator */}
            <div style={{ height: 4, background: "#e0e7ff", borderRadius: 2, marginBottom: 10 }}>
              <div style={{ height: "100%", background: progress === total ? "#16a34a" : "#6366f1", borderRadius: 2, transition: "width 0.3s", width: `${(progress / total) * 100}%` }} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {captures.map((cap, i) => (
                <div key={i} style={{ position: "relative", width: 64, height: 64 }}>
                  <img src={cap.preview} alt={cap.angle} style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", border: "2px solid #e2e8f0" }} />
                  <button type="button" onClick={() => removeCapture(i)}
                    style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#ef4444", color: "white", border: "none", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0 }}>
                    ×
                  </button>
                  <span style={{ position: "absolute", bottom: 2, left: 2, right: 2, fontSize: 8, color: "white", background: "rgba(0,0,0,0.6)", borderRadius: 4, textAlign: "center", padding: "1px 0" }}>
                    {cap.angle.replace("Look ", "").replace("Turn ", "")}
                  </span>
                </div>
              ))}
            </div>
            <button type="button" onClick={resetScan}
              style={{ marginTop: 8, fontSize: 12, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>
              Clear all captures
            </button>
          </div>
        )}

        {/* Status message */}
        {msg && (
          <div style={{ padding: 10, borderRadius: 8, fontSize: 14, background: msg.type === "success" ? "#f0fdf4" : "#fef2f2", color: msg.type === "success" ? "#16a34a" : "#dc2626" }}>
            {msg.type === "success"
              ? <CheckCircle size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
              : <XCircle size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />}
            {msg.text}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={uploading || captures.length === 0 || !selectedDriverId}
          style={{
            padding: "12px 20px", background: "#0284c7", color: "white",
            border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600,
            cursor: (uploading || captures.length === 0 || !selectedDriverId) ? "not-allowed" : "pointer",
            opacity: (uploading || captures.length === 0 || !selectedDriverId) ? 0.5 : 1,
          }}
        >
          {uploading ? "Registering..." : `Register Face (${progress}/${total} photos)`}
        </button>
      </form>
    </div>
  );
}
