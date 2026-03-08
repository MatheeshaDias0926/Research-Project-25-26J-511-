import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

const RegisterDriver = ({ onSuccess }) => {
    const [formData, setFormData] = useState({
        name: "",
        licenseNumber: "",
        contactNumber: "",
    });
    const [photo, setPhoto] = useState(null);
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        setPhoto(file);
        if (file) {
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!photo) {
            toast.error("Please upload a photo of the driver");
            return;
        }

        setLoading(true);
        const data = new FormData();
        data.append("name", formData.name);
        data.append("licenseNumber", formData.licenseNumber);
        data.append("contactNumber", formData.contactNumber);
        data.append("photo", photo);

        try {
            const token = localStorage.getItem("token");
            const config = {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}`,
                },
            };

            await axios.post("http://localhost:3000/api/driver/register", data, config);
            toast.success("Driver registered successfully!");
            setFormData({ name: "", licenseNumber: "", contactNumber: "" });
            setPhoto(null);
            setPreview(null);
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 640, margin: "0 auto", padding: 24 }}>
            <Card>
                <CardHeader>
                    <CardTitle style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                        <div style={{
                            padding: 8, borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "center",
                            background: "linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600))",
                        }}>
                            <UserPlus size={20} color="#fff" />
                        </div>
                        Register New Driver
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <label style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)" }}>Driver Name</label>
                            <Input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Enter driver name" />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <label style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)" }}>License Number</label>
                            <Input type="text" name="licenseNumber" value={formData.licenseNumber} onChange={handleChange} required placeholder="Enter license number" />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <label style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)" }}>Contact Number</label>
                            <Input type="text" name="contactNumber" value={formData.contactNumber} onChange={handleChange} required placeholder="Enter contact number" />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <label style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)" }}>Driver Photo (Face ID)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoChange}
                                style={{
                                    fontSize: "var(--text-sm)", color: "var(--text-muted)",
                                    padding: 8, border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)",
                                }}
                            />
                            {preview && (
                                <div style={{ marginTop: 16, textAlign: "center" }}>
                                    <img src={preview} alt="Driver Preview" style={{ height: 160, width: 160, objectFit: "cover", borderRadius: "var(--radius-full)", margin: "0 auto", border: "3px solid var(--border-light)" }} />
                                </div>
                            )}
                        </div>

                        <Button type="submit" disabled={loading} style={{ width: "100%", marginTop: 8 }}>
                            {loading ? "Registering..." : "Register Driver"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default RegisterDriver;
