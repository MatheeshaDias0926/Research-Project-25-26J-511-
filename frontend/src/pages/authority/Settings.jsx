import React, { useState, useEffect } from "react";
import { Sliders, Save, Info, Cpu, Eye } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { toast } from "react-toastify";
import axios from "axios";

const Settings = () => {
    // Face Mesh Settings
    const [settings, setSettings] = useState({
        max_faces: 2,
        min_detection_confidence: 0.5,
        min_tracking_confidence: 0.5,
        match_threshold: 5.0,
        draw_face_mesh: true,
        dot_radius: 2,
        dot_thickness: -1
    });

    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Load settings from local storage or API if available
        const stored = localStorage.getItem("faceMeshSettings");
        if (stored) {
            setSettings(JSON.parse(stored));
        }
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked :
                type === 'number' || type === 'range' ? Number(value) : value
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Save to LocalStorage
            localStorage.setItem("faceMeshSettings", JSON.stringify(settings));

            // Sync with ML Service
            // We assume there's a proxy or direct call. 
            // In dev environment, calling ML service directly or via backend proxy.
            // Let's call ML service directly for now (CORS enabled in ml_service.py)
            await axios.post("http://localhost:5001/api/face/settings", settings);

            toast.success("Settings saved and synced with Face ID System!");
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error(error);
            toast.error("Saved locally, but failed to sync with ML Service.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
                <Sliders size={24} />
                Face ID System Settings
            </h1>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Cpu size={20} />
                        Detection Parameters
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Max Faces */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Faces to Detect: {settings.max_faces}</label>
                        <input
                            type="range"
                            name="max_faces"
                            min="1"
                            max="10"
                            value={settings.max_faces}
                            onChange={handleChange}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Confidence Thresholds */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Min Detection Confidence: {settings.min_detection_confidence}
                            </label>
                            <input
                                type="range"
                                name="min_detection_confidence"
                                min="0.1"
                                max="1.0"
                                step="0.05"
                                value={settings.min_detection_confidence}
                                onChange={handleChange}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Min Tracking Confidence: {settings.min_tracking_confidence}
                            </label>
                            <input
                                type="range"
                                name="min_tracking_confidence"
                                min="0.1"
                                max="1.0"
                                step="0.05"
                                value={settings.min_tracking_confidence}
                                onChange={handleChange}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Match Threshold */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Matching Distance Threshold: {settings.match_threshold}
                        </label>
                        <input
                            type="range"
                            name="match_threshold"
                            min="1.0"
                            max="15.0"
                            step="0.1"
                            value={settings.match_threshold || 5.0}
                            onChange={handleChange}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="text-xs text-gray-500 mt-1">Lower is stricter (harder access), Higher is looser (easier access).</p>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-md flex gap-3 text-blue-800 text-sm">
                        <Info size={16} className="mt-1 flex-shrink-0" />
                        <p>Higher confidence values reduce false positives but may miss faces in poor lighting.</p>
                    </div>
                </CardContent>
            </Card>

            <div className="mt-6"></div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Eye size={20} />
                        Visual Settings
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            name="draw_face_mesh"
                            checked={settings.draw_face_mesh}
                            onChange={handleChange}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label className="text-sm font-medium text-gray-700">Draw Face Mesh Overlay</label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dot Radius: {settings.dot_radius}px</label>
                            <input
                                type="number"
                                name="dot_radius"
                                min="1"
                                max="10"
                                value={settings.dot_radius}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dot Thickness: {settings.dot_thickness}px</label>
                            <input
                                type="number"
                                name="dot_thickness"
                                min="-1"
                                max="10"
                                value={settings.dot_thickness}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md"
                            />
                            <p className="text-xs text-gray-500 mt-1">-1 fills the circle</p>
                        </div>
                    </div>

                    {/* Live Preview Removed as per request */}
                    <div className="pt-4 border-t border-gray-100">
                        <p className="text-xs text-center text-gray-500">
                            Go to <b>Face ID Live</b> to view the camera feed and verification status.
                        </p>
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2"
                    >
                        <Save size={18} />
                        {loading ? "Syncing..." : saved ? "Settings Saved!" : "Save Configuration"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default Settings;
