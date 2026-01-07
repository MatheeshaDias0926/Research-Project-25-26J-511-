import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { UserPlus, Search, User, CheckCircle, AlertTriangle, Camera, FileText, Phone, Edit, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import ReuploadPhoto from "./ReuploadPhoto";

const DriverManagement = () => {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Register/Edit Form State
    const [formData, setFormData] = useState({
        name: "",
        licenseNumber: "",
        contactNumber: "",
        photo: null
    });
    const [photoPreview, setPhotoPreview] = useState(null);
    const [editingDriverId, setEditingDriverId] = useState(null);

    // Reupload State
    const [reuploadDriverId, setReuploadDriverId] = useState(null);

    useEffect(() => {
        fetchDrivers();
    }, []);

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get("http://localhost:3000/api/driver", config);
            setDrivers(res.data);
        } catch (error) {
            console.error("Error fetching drivers:", error);
            toast.error("Failed to load drivers");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, photo: file });
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleEditClick = (driver) => {
        setEditingDriverId(driver._id);
        setFormData({
            name: driver.name,
            licenseNumber: driver.licenseNumber,
            contactNumber: driver.contactNumber,
            photo: null
        });
        setPhotoPreview(driver.photoUrl);
    };

    const handleCancelEdit = () => {
        setEditingDriverId(null);
        setFormData({ name: "", licenseNumber: "", contactNumber: "", photo: null });
        setPhotoPreview(null);
    };

    const handleDeleteClick = async (id) => {
        if (window.confirm("Are you sure you want to remove this driver? This action cannot be undone.")) {
            try {
                const token = localStorage.getItem("token");
                await axios.delete(`http://localhost:3000/api/driver/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success("Driver removed successfully");
                fetchDrivers();
            } catch (error) {
                console.error("Delete failed", error);
                toast.error("Failed to delete driver");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const data = new FormData();
            data.append("name", formData.name);
            data.append("licenseNumber", formData.licenseNumber);
            data.append("contactNumber", formData.contactNumber);
            if (formData.photo) {
                data.append("photo", formData.photo);
            }

            const token = localStorage.getItem("token");
            const config = {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}`,
                },
            };

            if (editingDriverId) {
                await axios.put(`http://localhost:3000/api/driver/${editingDriverId}`, data, config);
                toast.success("Driver updated successfully!");
                handleCancelEdit();
            } else {
                await axios.post("http://localhost:3000/api/driver/register", data, config);
                toast.success("Driver registered successfully!");
                setFormData({ name: "", licenseNumber: "", contactNumber: "", photo: null });
                setPhotoPreview(null);
            }

            fetchDrivers();
        } catch (error) {
            console.error("Operation failed", error);
            if (error.response && error.response.data) {
                console.error("Server Error Response:", error.response.data);
                toast.error(error.response.data.message || "Operation failed on server");
            } else {
                toast.error(error.message || "Operation failed");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const filteredDrivers = drivers.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 40 }}>
            {/* Header Section */}
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 32, fontWeight: 700, color: "#1e293b" }}>
                    Manage Drivers
                </h1>
                <p style={{ color: "#64748b", marginTop: 4 }}>
                    Register new drivers, manage fleet personnel, and verified Face ID status.
                </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>

                {/* Left Column: Register/Edit Form */}
                <div>
                    <Card style={{ position: "sticky", top: 20 }}>
                        <CardHeader style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
                            <CardTitle style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 18 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ background: editingDriverId ? "#fef3c7" : "#eff6ff", padding: 8, borderRadius: 8, color: editingDriverId ? "#d97706" : "#2563eb" }}>
                                        {editingDriverId ? <Edit size={20} /> : <UserPlus size={20} />}
                                    </div>
                                    {editingDriverId ? "Edit Driver Details" : "Register New Driver"}
                                </div>
                                {editingDriverId && (
                                    <button onClick={handleCancelEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                                        <X size={20} />
                                    </button>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent style={{ paddingTop: 24 }}>
                            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>
                                <div>
                                    <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 14, color: "#334155" }}>
                                        Full Name
                                    </label>
                                    <Input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Enter driver's name"
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 14, color: "#334155" }}>
                                        License Number
                                    </label>
                                    <Input
                                        type="text"
                                        name="licenseNumber"
                                        value={formData.licenseNumber}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Driver's License ID"
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 14, color: "#334155" }}>
                                        Contact Number
                                    </label>
                                    <Input
                                        type="text"
                                        name="contactNumber"
                                        value={formData.contactNumber}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Primary phone number"
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 14, color: "#334155" }}>
                                        Driver Photo {editingDriverId && "(Leave empty to keep current)"}
                                    </label>
                                    <div style={{ border: "2px dashed #e2e8f0", borderRadius: 8, padding: 20, textAlign: "center", cursor: "pointer", position: "relative" }}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
                                            required={!editingDriverId && !formData.photo}
                                        />
                                        {photoPreview ? (
                                            <img src={photoPreview} alt="Preview" style={{ maxHeight: 150, margin: "0 auto", borderRadius: 8 }} />
                                        ) : (
                                            <div style={{ color: "#64748b" }}>
                                                <Camera style={{ margin: "0 auto", marginBottom: 8, opacity: 0.5 }} />
                                                <span style={{ fontSize: 14 }}>Click to upload photo</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    style={{ marginTop: 8 }}
                                >
                                    {submitting ? "Processing..." : (editingDriverId ? "Update Driver" : "Register Driver")}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Driver List */}
                <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                            <User size={20} />
                            Driver Fleet
                            <span style={{ fontSize: 14, background: "#e2e8f0", padding: "2px 8px", borderRadius: 12, color: "#475569" }}>
                                {drivers.length}
                            </span>
                        </h2>
                    </div>

                    <Card style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        <div style={{ padding: 16, borderBottom: "1px solid #f1f5f9" }}>
                            <div style={{ position: "relative" }}>
                                <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                                <Input
                                    placeholder="Search by name or license..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ paddingLeft: 36 }}
                                />
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#f8fafc" }}>
                            {loading ? (
                                <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading fleet...</div>
                            ) : filteredDrivers.length === 0 ? (
                                <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
                                    {searchTerm ? "No matching drivers found." : "No drivers registered yet."}
                                </div>
                            ) : (
                                <div style={{ display: "grid", gap: 12 }}>
                                    {filteredDrivers.map((driver) => (
                                        <div
                                            key={driver._id}
                                            style={{
                                                background: "white",
                                                padding: 16,
                                                borderRadius: 8,
                                                border: "1px solid #e2e8f0",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                                <div style={{
                                                    width: 48,
                                                    height: 48,
                                                    borderRadius: "50%",
                                                    overflow: "hidden",
                                                    border: "2px solid #f1f5f9",
                                                    flexShrink: 0
                                                }}>
                                                    <img
                                                        src={driver.photoUrl}
                                                        alt={driver.name}
                                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                    />
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
                                                        {driver.name}
                                                    </p>
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 13, color: "#64748b", marginTop: 2 }}>
                                                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                            <FileText size={12} /> {driver.licenseNumber}
                                                        </span>
                                                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                            <Phone size={12} /> {driver.contactNumber}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, paddingRight: 16, borderRight: "1px solid #f1f5f9" }}>
                                                    {driver.faceEncoding && driver.faceEncoding.length > 0 ? (
                                                        <div style={{
                                                            fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 20,
                                                            background: "#f0fdf4", color: "#166534", display: "flex", alignItems: "center", gap: 4
                                                        }}>
                                                            <CheckCircle size={12} /> Active
                                                        </div>
                                                    ) : (
                                                        <div style={{
                                                            fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 20,
                                                            background: "#fefce8", color: "#854d0e", display: "flex", alignItems: "center", gap: 4
                                                        }}>
                                                            <AlertTriangle size={12} /> Fail
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={() => setReuploadDriverId(driver._id)}
                                                        style={{
                                                            fontSize: 12, color: "#4f46e5", background: "none", border: "none",
                                                            cursor: "pointer", textDecoration: "underline", display: "flex", alignItems: "center", gap: 4
                                                        }}
                                                    >
                                                        <Camera size={12} /> Re-upload Photo
                                                    </button>
                                                </div>

                                                <div style={{ display: "flex", gap: 4 }}>
                                                    <button
                                                        onClick={() => handleEditClick(driver)}
                                                        style={{ padding: 8, borderRadius: 6, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", color: "#64748b" }}
                                                        title="Edit Driver"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(driver._id)}
                                                        style={{ padding: 8, borderRadius: 6, border: "1px solid #fee2e2", background: "#fef2f2", cursor: "pointer", color: "#ef4444" }}
                                                        title="Delete Driver"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {reuploadDriverId && (
                <ReuploadPhoto
                    driverId={reuploadDriverId}
                    onSuccess={() => {
                        setReuploadDriverId(null);
                        fetchDrivers();
                    }}
                    onCancel={() => setReuploadDriverId(null)}
                />
            )}
        </div>
    );
};

export default DriverManagement;
