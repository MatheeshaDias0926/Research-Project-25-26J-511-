/**
 * FaceVerification — Capture a single webcam frame with FaceMesh overlay,
 * send to POST /api/driver/verify, and display matched driver or rejection.
 */
import { useState, useRef } from "react";
import Webcam from "react-webcam";
import api from "../../api/axios";
import useFaceMesh from "../../hooks/useFaceMesh";
import {
  Scan, CheckCircle, XCircle, Upload, Camera,
} from "lucide-react";

const VIDEO_CONSTRAINTS = { facingMode: "user", width: 480, height: 360 };

export default function FaceVerification({ cardStyle }) {
  const webcamRef = useRef(null);
  const [mode, setMode] = useState("webcam"); // webcam | upload
  const [camReady, setCamReady] = useState(false);
  const [verifyFile, setVerifyFile] = useState(null);
  const [verifyPreview, setVerifyPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // FaceMesh only active in webcam mode
  const { canvasRef, faceDetected } = useFaceMesh(webcamRef, mode === "webcam" && camReady);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setVerifyFile(f);
      setVerifyPreview(URL.createObjectURL(f));
    }
  };

  const verify = async () => {
    setLoading(true);
    setResult(null);
    const fd = new FormData();

    if (mode === "webcam") {
      if (!webcamRef.current) { setLoading(false); return; }
      const img = webcamRef.current.getScreenshot();
      if (!img) {
        setLoading(false);
        setResult({ verified: false, message: "Failed to capture image" });
        return;
      }
      const blob = await (await fetch(img)).blob();
      fd.append("image", blob, "capture.jpg");
    } else {
      if (!verifyFile) {
        setLoading(false);
        setResult({ verified: false, message: "Please select an image" });
        return;
      }
      fd.append("image", verifyFile);
    }

    try {
      const res = await api.post("/driver/verify", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
    } catch {
      setResult({ verified: false, message: "Verification service error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <Scan size={18} /> Verify Face Recognition
      </h3>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0" }}>
        <button
          onClick={() => { setMode("webcam"); setResult(null); }}
          style={{
            flex: 1, padding: "10px 16px", border: "none", cursor: "pointer",
            fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: mode === "webcam" ? "#0284c7" : "#f8fafc",
            color: mode === "webcam" ? "white" : "#64748b",
          }}
        >
          <Camera size={14} /> Webcam
        </button>
        <button
          onClick={() => { setMode("upload"); setResult(null); }}
          style={{
            flex: 1, padding: "10px 16px", border: "none", cursor: "pointer",
            fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: mode === "upload" ? "#0284c7" : "#f8fafc",
            color: mode === "upload" ? "white" : "#64748b",
          }}
        >
          <Upload size={14} /> Upload Image
        </button>
      </div>

      {/* Camera / upload area */}
      <div style={{ borderRadius: 12, overflow: "hidden", background: "#000", minHeight: 220, position: "relative", marginBottom: 16 }}>
        {mode === "webcam" ? (
          <>
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              onUserMedia={() => setCamReady(true)}
              onUserMediaError={() => setCamReady(false)}
              videoConstraints={VIDEO_CONSTRAINTS}
              style={{ width: "100%", display: "block" }}
            />
            {/* FaceMesh canvas overlay */}
            <canvas
              ref={canvasRef}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}
            />
            {/* Face indicator */}
            <div style={{ position: "absolute", top: 10, left: 10 }}>
              <span style={{
                padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                background: faceDetected ? "rgba(22,163,74,0.85)" : "rgba(220,38,38,0.8)",
                color: "white",
              }}>
                {faceDetected ? "● Face Detected" : "○ No Face"}
              </span>
            </div>
          </>
        ) : (
          <div
            style={{ padding: 30, textAlign: "center", cursor: "pointer", minHeight: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
            onClick={() => document.getElementById("verify-photo-input").click()}
          >
            <input id="verify-photo-input" type="file" accept="image/*" hidden onChange={handleFileChange} />
            {verifyPreview ? (
              <img src={verifyPreview} alt="verify" style={{ maxHeight: 200, borderRadius: 8 }} />
            ) : (
              <div style={{ color: "#94a3b8" }}>
                <Upload size={40} />
                <p style={{ marginTop: 8, fontSize: 14 }}>Click to select an image to verify</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Verify button */}
      <button
        onClick={verify}
        disabled={loading || (mode === "webcam" && !faceDetected)}
        style={{
          width: "100%", padding: "12px 20px", background: "#7c3aed", color: "white",
          border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        <Scan size={16} /> {loading ? "Verifying..." : "Capture & Verify"}
      </button>

      {/* Result */}
      {result && (
        <div style={{
          marginTop: 16, padding: 16, borderRadius: 12,
          display: "flex", alignItems: "center", gap: 14,
          background: result.verified ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${result.verified ? "#bbf7d0" : "#fecaca"}`,
        }}>
          {result.verified
            ? <CheckCircle size={28} color="#16a34a" />
            : <XCircle size={28} color="#dc2626" />}
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: result.verified ? "#16a34a" : "#dc2626" }}>
              {result.verified ? "Driver Verified" : "Driver Not Recognized"}
            </div>
            <div style={{ fontSize: 14, color: "#64748b" }}>
              {result.verified
                ? `Driver: ${result.driverName} | Confidence: ${result.confidence ?? "—"}%`
                : (result.message || "No matching driver found")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
