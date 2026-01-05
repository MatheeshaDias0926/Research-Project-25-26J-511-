import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import { Terminal, Activity, Wifi, Cpu, Zap, Radio, Maximize, AlertCircle, Scan, CheckCircle, XCircle } from "lucide-react";
import { Card } from "../../components/ui/Card";

const FacialRecognitionLive = () => {
    const webcamRef = useRef(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [autoMode, setAutoMode] = useState(false);
    const [logs, setLogs] = useState(["System initialized... Waiting for input source."]);

    const addLog = (message) => {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 8)]);
    };

    const captureAndVerify = async () => {
        if (!webcamRef.current) return;
        setLoading(true);
        addLog("CAPTURING_FRAME_BUFFER...");

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;

        try {
            addLog("ENCODING_IMAGE_DATA...");
            const res = await fetch(imageSrc);
            const blob = await res.blob();
            const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
            const formData = new FormData();
            formData.append("image", file);

            const token = localStorage.getItem("token");
            const config = { headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` } };

            addLog("SENDING_PACKET_TO_SERVER...");
            const response = await axios.post("http://localhost:3000/api/driver/verify", formData, config);

            setResult(response.data);
            if (response.data.verified) {
                addLog(`SUCCESS: IDENTITY_VERIFIED [${response.data.driverName}]`);
            } else {
                addLog(`WARNING: IDENTITY_UNKNOWN [Correlation: ${(response.data.confidence || 0).toFixed(2)}]`);
            }

            if (autoMode) {
                setTimeout(() => setResult(null), 3500); // Clear result faster in auto mode
            }

        } catch (error) {
            console.error(error);
            addLog("ERROR: CONNECTION_TIMEOUT / PACKET_LOSS");
            setResult({ verified: false, message: "System Error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let interval;
        if (autoMode) {
            interval = setInterval(captureAndVerify, 6000); // 6s interval for auto
        }
        return () => clearInterval(interval);
    }, [autoMode]);

    return (
        <div style={{ padding: 24, paddingBottom: 40, maxWidth: 1600, margin: "0 auto", background: "#f8fafc", minHeight: "100vh" }}>

            {/* Header / Title Bar */}
            <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 12 }}>
                        <Scan size={32} color="#2563eb" />
                        LIVE FACE RECOGNITION
                    </h1>
                    <p style={{ color: "#64748b", fontWeight: 600, marginTop: 4 }}>
                        Real-time biometrics surveillance and access control system
                    </p>
                </div>

                <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ padding: "8px 16px", background: "#dbeafe", color: "#1e40af", borderRadius: 8, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, background: "#2563eb", borderRadius: "50%", animation: "pulse 2s infinite" }}></div>
                        SYSTEM ONLINE
                    </div>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 32 }}>

                {/* Left Panel: Camera Feed */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{
                        background: "black",
                        borderRadius: 16,
                        overflow: "hidden",
                        position: "relative",
                        border: "4px solid #1e293b",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                        height: 500, // Fixed height constraint
                    }}>
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            videoConstraints={{ facingMode: "user" }}
                        />

                        {/* Overlay Information */}
                        <div style={{ position: "absolute", top: 20, left: 20, color: "white", fontFamily: "monospace", fontSize: 14, textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
                            CAM_01 | 1080p | 60FPS
                        </div>

                        {/* Scan Line Animation */}
                        {(loading || autoMode) && (
                            <div style={{
                                position: "absolute", top: 0, left: 0, width: "100%", height: 2, background: "#3b82f6",
                                boxShadow: "0 0 20px #3b82f6",
                                animation: "scanLine 2s linear infinite"
                            }} />
                        )}

                        {/* Result Popup Overlay */}
                        {result && (
                            <div style={{
                                position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)",
                                background: result.verified ? "rgba(22, 101, 52, 0.9)" : "rgba(153, 27, 27, 0.9)",
                                color: "white", padding: "16px 32px", borderRadius: 12, backdropFilter: "blur(10px)",
                                border: "2px solid rgba(255,255,255,0.2)", textAlign: "center", minWidth: 300
                            }}>
                                <div style={{ fontSize: 24, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                                    {result.verified ? <CheckCircle size={32} /> : <XCircle size={32} />}
                                    {result.verified ? "ACCESS GRANTED" : "ACCESS DENIED"}
                                </div>
                                {result.verified && (
                                    <div style={{ marginTop: 8, fontSize: 16, fontWeight: 500 }}>
                                        Driver: {result.driverName} ({((result.confidence || 0) * 100).toFixed(0)}%)
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <button
                            onClick={captureAndVerify}
                            disabled={loading || autoMode}
                            style={{
                                padding: "16px", borderRadius: 12, border: "none", cursor: "pointer",
                                background: "#0f172a", color: "white", fontSize: 16, fontWeight: 700,
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                                opacity: (loading || autoMode) ? 0.7 : 1, transition: "all 0.2s"
                            }}
                        >
                            <Maximize size={20} />
                            {loading ? "SCANNING..." : "MANUAL SCAN"}
                        </button>

                        <button
                            onClick={() => setAutoMode(!autoMode)}
                            style={{
                                padding: "16px", borderRadius: 12, border: "none", cursor: "pointer",
                                background: autoMode ? "#dc2626" : "#2563eb", color: "white", fontSize: 16, fontWeight: 700,
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                                transition: "all 0.2s"
                            }}
                        >
                            <Radio size={20} />
                            {autoMode ? "STOP AUTO-SCAN" : "START AUTO-SCAN"}
                        </button>
                    </div>
                </div>

                {/* Right Panel: Logs and Metrics */}
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                    {/* Metrics Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <Card style={{ padding: 16, background: "white", border: "1px solid #e2e8f0" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b", marginBottom: 8, fontSize: 12, fontWeight: 700 }}>
                                <Wifi size={14} /> LATENCY
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>24ms</div>
                        </Card>
                        <Card style={{ padding: 16, background: "white", border: "1px solid #e2e8f0" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b", marginBottom: 8, fontSize: 12, fontWeight: 700 }}>
                                <Activity size={14} /> STATUS
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: "#16a34a" }}>Active</div>
                        </Card>
                    </div>

                    {/* System Logs */}
                    <Card style={{ flex: 1, background: "#0f172a", color: "#38bdf8", padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                        <div style={{ padding: "12px 16px", background: "#1e293b", color: "#94a3b8", fontSize: 12, fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                            <span>SYSTEM TERMINAL</span>
                            <Terminal size={14} />
                        </div>
                        <div style={{ padding: 16, fontFamily: "monospace", fontSize: 13, lineHeight: 1.6, overflowY: "auto", flex: 1 }}>
                            {logs.map((log, i) => (
                                <div key={i} style={{ marginBottom: 4, display: "flex", gap: 8 }}>
                                    <span style={{ color: "#64748b" }}>{">"}</span>
                                    <span>{log}</span>
                                </div>
                            ))}
                            <div style={{ animation: "pulse 1s infinite" }}>_</div>
                        </div>
                    </Card>
                </div>
            </div>

            <style>
                {`
                    @keyframes scanLine {
                        0% { top: 0%; opacity: 0; }
                        5% { opacity: 1; }
                        95% { opacity: 1; }
                        100% { top: 100%; opacity: 0; }
                    }
                    @keyframes pulse {
                        0% { opacity: 1; }
                        50% { opacity: 0.5; }
                        100% { opacity: 1; }
                    }
                `}
            </style>
        </div>
    );
};

export default FacialRecognitionLive;
