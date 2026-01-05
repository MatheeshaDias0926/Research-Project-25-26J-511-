import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import { Camera, RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const FacialRecognitionLive = () => {
    const webcamRef = useRef(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [autoMode, setAutoMode] = useState(false);

    const captureAndVerify = async () => {
        if (!webcamRef.current) return;
        setLoading(true);
        const imageSrc = webcamRef.current.getScreenshot();

        if (!imageSrc) {
            setLoading(false);
            return;
        }

        try {
            // Convert base64 to blob
            const res = await fetch(imageSrc);
            const blob = await res.blob();
            const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

            const formData = new FormData();
            formData.append("image", file);

            const token = localStorage.getItem("token");
            const config = {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}`,
                },
            };

            // Use the verify endpoint to check against known drivers
            // OR create a specific debug endpoint. Using verify for now as it's "Live Work" demo.
            const response = await axios.post("http://localhost:3000/api/driver/verify", formData, config);

            setResult(response.data);
        } catch (error) {
            console.error(error);
            setResult({ verified: false, message: "Error processing image" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let interval;
        if (autoMode) {
            interval = setInterval(captureAndVerify, 3000); // Check every 3 seconds
        }
        return () => clearInterval(interval);
    }, [autoMode]);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Camera className="h-8 w-8 text-indigo-600" />
                Facial Recognition Live
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <div className="bg-black rounded-xl overflow-hidden shadow-2xl relative aspect-video">
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            className="w-full h-full object-cover"
                            videoConstraints={{ facingMode: "user" }}
                        />
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
                            <button
                                onClick={captureAndVerify}
                                disabled={loading || autoMode}
                                className={`px-6 py-2 rounded-full font-semibold shadow-lg transition-all ${loading
                                        ? "bg-gray-500 cursor-not-allowed"
                                        : "bg-white text-gray-900 hover:bg-gray-100"
                                    }`}
                            >
                                {loading ? "Scanning..." : "Scan Face"}
                            </button>
                            <button
                                onClick={() => setAutoMode(!autoMode)}
                                className={`px-6 py-2 rounded-full font-semibold shadow-lg transition-all border-2 ${autoMode
                                        ? "bg-red-500 border-red-500 text-white"
                                        : "bg-transparent border-white text-white hover:bg-white/20"
                                    }`}
                            >
                                {autoMode ? "Stop Live" : "Start Live Mode"}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-white rounded-xl shadow p-6 h-full border border-gray-100">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Recognition Result</h2>

                        {!result ? (
                            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                                <Camera className="h-12 w-12 mb-2 opacity-20" />
                                <p>Scan a face to see results</p>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <div className={`flex items-center gap-3 p-4 rounded-lg ${result.verified
                                        ? "bg-green-50 border border-green-200 text-green-800"
                                        : "bg-red-50 border border-red-200 text-red-800"
                                    }`}>
                                    {result.verified ? (
                                        <CheckCircle className="h-6 w-6 shrink-0" />
                                    ) : (
                                        <XCircle className="h-6 w-6 shrink-0" />
                                    )}
                                    <div>
                                        <p className="font-bold text-lg">
                                            {result.verified ? "Verified Driver" : "Not Recognized"}
                                        </p>
                                        <p className="text-sm opacity-80">{result.message}</p>
                                    </div>
                                </div>

                                {result.verified && (
                                    <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                                        <p className="text-sm text-indigo-600 font-medium uppercase tracking-wide">Driver Details</p>
                                        <p className="text-2xl font-bold text-gray-900 mt-1">{result.driverName}</p>
                                        <p className="text-sm text-gray-600 mt-1">Confidence: {(result.confidence * 100).toFixed(1)}%</p>
                                    </div>
                                )}

                                <div className="text-xs text-gray-400 mt-4">
                                    Last scan: {new Date().toLocaleTimeString()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FacialRecognitionLive;
