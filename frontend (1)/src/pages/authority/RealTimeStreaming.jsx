import React, { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

export default function LiveDetection() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [results, setResults] = useState({});

  useEffect(() => {
    startCamera();

    socket.on("result", (data) => {
      setResults(data);
    });
  }, []);

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });

    videoRef.current.srcObject = stream;

    setInterval(sendFrame, 500);
  };

  const sendFrame = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0);

    const base64 = canvas.toDataURL("image/jpeg", 0.6);

    socket.emit("frame", {
      image: base64,
    });
  };

  const redCount = results?.redlight?.count || 0;
  const doubleLine = results?.double_line?.top1?.class_name || "unknown";
  const speedCount = results?.speed_limit?.count || 0;

  return (
    <div style={{ display: "flex", gap: 30, padding: 30 }}>

      {/* LEFT SIDE VIDEO */}
      <div style={{ width: "55%" }}>
        <div style={{
          background:"#fff",
          padding:20,
          borderRadius:10,
          boxShadow:"0 5px 20px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{marginBottom:15}}>Live Camera</h2>

          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: "100%",
              borderRadius:10
            }}
          />

          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>
      </div>

      {/* RIGHT SIDE RESULTS */}
      <div style={{ width: "45%", display:"flex", flexDirection:"column", gap:20 }}>

        <h2>AI Detection Results</h2>

        {/* RED LIGHT */}
        <div style={cardStyle}>
          <h3>🚦 Red Light Detection</h3>
          <p style={valueStyle}>
            {redCount > 0 ? `Detected (${redCount})` : "No Red Light"}
          </p>
        </div>

        {/* DOUBLE LINE */}
        <div style={cardStyle}>
          <h3>🚧 Double Line Status</h3>
          <p style={{
            ...valueStyle,
            color: doubleLine === "violation" ? "red" : "green"
          }}>
            {doubleLine}
          </p>
        </div>

        {/* SPEED SIGN */}
        <div style={cardStyle}>
          <h3>🚗 Speed Limit Signs</h3>
          <p style={valueStyle}>
            {speedCount > 0 ? `${speedCount} detected` : "None"}
          </p>
        </div>

        {/* ALERT */}
        {(redCount > 0 || doubleLine === "violation") && (
          <div style={{
            background:"#ffefef",
            padding:20,
            borderRadius:10,
            border:"2px solid red",
            fontWeight:600
          }}>
            ⚠️ Traffic Violation Detected
          </div>
        )}

      </div>

    </div>
  );
}

const cardStyle = {
  background:"#fff",
  padding:20,
  borderRadius:10,
  boxShadow:"0 5px 20px rgba(0,0,0,0.08)"
};

const valueStyle = {
  fontSize:22,
  fontWeight:600
};