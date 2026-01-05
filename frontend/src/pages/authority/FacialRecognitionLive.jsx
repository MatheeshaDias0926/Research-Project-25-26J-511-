import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import { Copy, Terminal, Activity, Wifi, Cpu, Zap, Radio, Maximize, AlertCircle } from "lucide-react";

const FacialRecognitionLive = () => {
    const webcamRef = useRef(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [autoMode, setAutoMode] = useState(false);
    const [logs, setLogs] = useState(["System initialized... Waiting for input source."]);

    // IoT Simulation States
    const [latency, setLatency] = useState(24);
    const [cpuUsage, setCpuUsage] = useState(12);
    const [memory, setMemory] = useState(34);

    // Simulated IoT Data Stream Updates
    useEffect(() => {
        const interval = setInterval(() => {
            setLatency(Math.floor(Math.random() * (45 - 20) + 20));
            setCpuUsage(Math.floor(Math.random() * (30 - 10) + 10));
            setMemory(Math.floor(Math.random() * (40 - 30) + 30));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

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
                addLog(`WARNING: IDENTITY_UNKNOWN [Correlation: 0.0]`);
            }

            if (autoMode) {
                setTimeout(() => setResult(null), 2500);
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
            interval = setInterval(captureAndVerify, 4000);
        }
        return () => clearInterval(interval);
    }, [autoMode]);

    return (
        <div className="min-h-screen bg-slate-950 p-4 md:p-6 font-mono text-cyan-500 overflow-hidden">
            {/* Top Bar: System Stats */}
            <div className="flex flex-wrap items-center justify-between border-b border-cyan-900/50 pb-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-cyan-400">
                        <Terminal size={20} />
                        <h1 className="text-xl font-bold tracking-widest">FACE_ID_NODE_v2.4</h1>
                    </div>
                    <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-cyan-950/30 rounded border border-cyan-900 text-xs">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>ONLINE</span>
                    </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-cyan-600/80">
                    <div className="flex items-center gap-2">
                        <Wifi size={14} />
                        <span>LATENCY: {latency}ms</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Cpu size={14} />
                        <span>CPU: {cpuUsage}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Zap size={14} />
                        <span>MEM: {memory}%</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">

                {/* Main Viewport */}
                <div className="lg:col-span-8 relative flex flex-col">
                    <div className="flex-1 bg-black rounded-sm border border-cyan-900/50 relative overflow-hidden group">

                        {/* Live Camera Feed */}
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            className="w-full h-full object-cover opacity-80 mix-blend-screen"
                            videoConstraints={{ facingMode: "user" }}
                        />

                        {/* Digital Overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                            {/* Grid Lines */}
                            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

                            {/* Corners */}
                            <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-cyan-500/50"></div>
                            <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-cyan-500/50"></div>
                            <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-cyan-500/50"></div>
                            <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-cyan-500/50"></div>

                            {/* Scanning Line */}
                            {(loading || autoMode) && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-[scan_2s_linear_infinite]"></div>
                            )}

                            {/* Center ROI */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-cyan-500/30 rounded-lg">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[1px] w-2 h-2 bg-cyan-500"></div>
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[1px] w-2 h-2 bg-cyan-500"></div>
                                <div className="absolute left-0 top-1/2 -translate-x-[1px] -translate-y-1/2 w-2 h-2 bg-cyan-500"></div>
                                <div className="absolute right-0 top-1/2 translate-x-[1px] -translate-y-1/2 w-2 h-2 bg-cyan-500"></div>
                            </div>
                        </div>

                        {/* Result Overlay */}
                        {result && (
                            <div className="absolute top-8 left-8 right-8 flex justify-center">
                                <div className={`backdrop-blur-sm px-8 py-4 border-l-4 ${result.verified ? "bg-green-900/40 border-green-500" : "bg-red-900/40 border-red-500"}`}>
                                    <h2 className={`text-2xl font-bold tracking-widest ${result.verified ? "text-green-400" : "text-red-400"}`}>
                                        {result.verified ? "ACCESS GRANTED" : "ACCESS DENIED"}
                                    </h2>
                                    {result.verified && (
                                        <p className="text-sm font-mono text-green-300/80 mt-1">ID: {result.driverName} | CONF: {((result.confidence || 0) * 100).toFixed(1)}%</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controls Bar */}
                    <div className="h-16 mt-4 grid grid-cols-2 gap-4">
                        <button
                            onClick={captureAndVerify}
                            disabled={loading || autoMode}
                            className="bg-cyan-950/50 border border-cyan-800 hover:bg-cyan-900/50 hover:border-cyan-500 transition-all text-cyan-400 font-bold tracking-wider rounded-sm flex items-center justify-center gap-2 group disabled:opacity-50"
                        >
                            <Maximize size={18} className="group-hover:scale-110 transition-transform" />
                            {loading ? "PROCESSING..." : "MANUAL_TRIGGER"}
                        </button>
                        <button
                            onClick={() => setAutoMode(!autoMode)}
                            className={`border transition-all font-bold tracking-wider rounded-sm flex items-center justify-center gap-2 ${autoMode
                                    ? "bg-red-950/30 border-red-800 text-red-500 animate-pulse"
                                    : "bg-cyan-950/50 border-cyan-800 hover:bg-cyan-900/50 text-cyan-400 hover:border-cyan-500"
                                }`}
                        >
                            <Radio size={18} />
                            {autoMode ? "STOP_STREAM" : "AUTO_POLLING"}
                        </button>
                    </div>
                </div>

                {/* Sidebar: Logs & Data */}
                <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">

                    {/* Console Output */}
                    <div className="flex-1 bg-black border border-cyan-900/50 rounded-sm p-4 font-mono text-xs overflow-hidden flex flex-col">
                        <div className="border-b border-cyan-900/50 pb-2 mb-2 flex justify-between items-center bg-cyan-950/20 -mx-4 -mt-4 px-4 py-2">
                            <span className="font-bold text-cyan-300">SYSTEM_LOGS</span>
                            <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-1 font-mono">
                            {logs.map((log, i) => (
                                <div key={i} className="text-cyan-600 border-l border-cyan-900 pl-2 hover:bg-cyan-900/10 hover:text-cyan-400 transition-colors cursor-default">
                                    <span className="opacity-50 mr-2">{">"}</span>{log}
                                </div>
                            ))}
                            <div className="animate-pulse text-cyan-500">_</div>
                        </div>
                    </div>

                    {/* Sim Data Visualization */}
                    <div className="h-1/3 bg-black border border-cyan-900/50 rounded-sm p-4 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-cyan-900"></div>
                        <h3 className="text-xs font-bold text-cyan-500 mb-4 tracking-wider">HARCODED_METRICS</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-[10px] text-cyan-600 mb-1">
                                    <span>ENCODING_BUFFER</span>
                                    <span>256Kb</span>
                                </div>
                                <div className="w-full bg-cyan-950 h-1 rounded-full overflow-hidden">
                                    <div className="bg-cyan-600 h-full w-[45%]"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-[10px] text-cyan-600 mb-1">
                                    <span>PACKET_QUEUE</span>
                                    <span>IDLE</span>
                                </div>
                                <div className="w-full bg-cyan-950 h-1 rounded-full overflow-hidden">
                                    <div className="bg-cyan-600 h-full w-[12%]"></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                <div className="bg-cyan-950/20 p-2 border border-cyan-900/30 text-center">
                                    <div className="text-[10px] text-cyan-700">UPTIME</div>
                                    <div className="text-lg font-bold text-cyan-500">14h</div>
                                </div>
                                <div className="bg-cyan-950/20 p-2 border border-cyan-900/30 text-center">
                                    <div className="text-[10px] text-cyan-700">ERRORS</div>
                                    <div className="text-lg font-bold text-cyan-500">0</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default FacialRecognitionLive;
