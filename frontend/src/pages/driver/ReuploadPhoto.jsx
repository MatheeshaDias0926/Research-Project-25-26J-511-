import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const ReuploadPhoto = ({ driverId, onSuccess, onCancel }) => {
    const [photo, setPhoto] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        setPhoto(file);
        if (file) {
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
            const config = {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}`,
                },
            };
            // We need a route for this. Assuming we use a new route or patch existing.
            // Let's assume we'll create /api/driver/reupload-photo
            await axios.post("http://localhost:3000/api/driver/reupload-photo", data, config);
            toast.success("Photo re-uploaded successfully!");
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error("Failed to re-upload photo");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
                <h3 className="text-lg font-bold mb-4">Re-upload Face ID Photo</h3>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="w-full"
                        />
                    </div>
                    {preview && (
                        <div className="mb-4 flex justify-center">
                            <img src={preview} alt="Preview" className="h-32 w-32 object-cover rounded-full" />
                        </div>
                    )}
                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !photo}
                            className={`px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 ${(loading || !photo) ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                        >
                            {loading ? "Uploading..." : "Upload"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReuploadPhoto;
