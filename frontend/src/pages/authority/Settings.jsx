import React, { useState, useEffect } from "react";
import { Sliders, Save, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { toast } from "react-toastify";

const Settings = () => {
    const [threshold, setThreshold] = useState(50);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("faceIdThreshold");
        if (stored) {
            setThreshold(parseInt(stored));
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem("faceIdThreshold", threshold);
        toast.success("Settings saved successfully!");
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
                <Sliders size={24} />
                System Settings
            </h1>

            <Card>
                <CardHeader>
                    <CardTitle>Face ID Sensitivity</CardTitle>
                </CardHeader>
                <CardContent>
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: "block", marginBottom: 12, fontWeight: 600, color: "#475569" }}>
                            Confidence Threshold: {threshold}%
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={threshold}
                            onChange={(e) => setThreshold(e.target.value)}
                            style={{ width: "100%", height: 8, borderRadius: 4, background: "#e2e8f0", cursor: "pointer" }}
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
                            <span>0% (Insecure)</span>
                            <span>50% (Balanced)</span>
                            <span>100% (Strict)</span>
                        </div>
                    </div>

                    <div style={{ background: "#f0f9ff", padding: 16, borderRadius: 8, display: "flex", gap: 12, marginBottom: 24 }}>
                        <Info size={20} color="#0284c7" style={{ flexShrink: 0 }} />
                        <p style={{ fontSize: 14, color: "#0c4a6e", lineHeight: 1.5 }}>
                            <strong>How this works:</strong> Setting this higher ensures only high-quality matches are accepted but may reject valid drivers in poor lighting. Lowering it improves acceptance rate but increases the risk of false positives.
                            <br /><br />
                            Recommended: <strong>50% - 60%</strong>
                        </p>
                    </div>

                    <Button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Save size={18} />
                        {saved ? "Saved!" : "Save Configuration"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default Settings;
