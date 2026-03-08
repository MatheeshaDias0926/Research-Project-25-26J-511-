import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Camera, X } from "lucide-react";
import Button from "../../components/ui/Button";

const ReuploadPhoto = ({ driverId, onSuccess, onCancel }) => {
    const [photo, setPhoto] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhoto(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!photo) return;

        setLoading(true);
        const data = new FormData();
        data.append("photo", photo);
        data.append("driverId", driverId);

        try {
            const token = localStorage.getItem("token");
            await axios.post(
                "http://localhost:3000/api/driver/reupload-photo",
                data,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            toast.success("Face ID photo updated successfully!");
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update photo");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                {/* Header */}
                <div style={headerStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={iconWrapperStyle}>
                            <Camera size={18} />
                        </div>
                        <h3 style={{ fontSize: 18, fontWeight: 600 }}>
                            Re-upload Face ID Photo
                        </h3>
                    </div>
                    <button onClick={onCancel} style={closeBtnStyle}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} style={{ padding: 24 }}>
                    <div style={uploadBoxStyle}>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            style={fileInputStyle}
                        />

                        {preview ? (
                            <img
                                src={preview}
                                alt="Preview"
                                style={previewImgStyle}
                            />
                        ) : (
                            <div style={{ color: "var(--text-muted)", textAlign: "center" }}>
                                <Camera size={28} style={{ marginBottom: 8, opacity: 0.5 }} />
                                <p style={{ fontSize: 14 }}>
                                    Click to upload new face photo
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div style={footerStyle}>
                        <button
                            type="button"
                            onClick={onCancel}
                            style={cancelBtnStyle}
                        >
                            Cancel
                        </button>

                        <Button
                            type="submit"
                            disabled={loading || !photo}
                        >
                            {loading ? "Uploading..." : "Update Photo"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReuploadPhoto;

/* ================== STYLES ================== */

const overlayStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
};

const modalStyle = {
    background: "white",
    width: 420,
    borderRadius: "var(--radius-lg)",
    boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
    overflow: "hidden",
};

const headerStyle = {
    padding: "16px 20px",
    borderBottom: "1px solid #f1f5f9",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
};

const iconWrapperStyle = {
    background: "linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600))",
    color: "#fff",
    padding: 8,
    borderRadius: "var(--radius-md)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
};

const closeBtnStyle = {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text-muted)",
};

const uploadBoxStyle = {
    border: "2px dashed #e2e8f0",
    borderRadius: 10,
    padding: 24,
    textAlign: "center",
    cursor: "pointer",
    position: "relative",
    marginBottom: 24,
};

const fileInputStyle = {
    position: "absolute",
    inset: 0,
    opacity: 0,
    cursor: "pointer",
};

const previewImgStyle = {
    width: 140,
    height: 140,
    objectFit: "cover",
    borderRadius: "50%",
    border: "3px solid #e2e8f0",
};

const footerStyle = {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
};

const cancelBtnStyle = {
    padding: "10px 16px",
    borderRadius: 8,
    border: "1px solid var(--border-light)",
    background: "var(--bg-muted)",
    cursor: "pointer",
    color: "var(--text-secondary)",
    fontWeight: 500,
};
