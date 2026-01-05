import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { UserPlus, Users, Camera, CheckCircle, AlertCircle } from "lucide-react";
import RegisterDriver from "./RegisterDriver";
import ReuploadPhoto from "./ReuploadPhoto";

const DriverManagement = () => {
    const [activeTab, setActiveTab] = useState("list");
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [reuploadDriverId, setReuploadDriverId] = useState(null);

    useEffect(() => {
        if (activeTab === "list") {
            fetchDrivers();
        }
    }, [activeTab]);

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const res = await axios.get("http://localhost:3000/api/driver", config);
            setDrivers(res.data);
        } catch (error) {
            console.error("Error fetching drivers:", error);
            toast.error("Failed to load drivers");
        } finally {
            setLoading(false);
        }
    };

    const handleRegistrationSuccess = () => {
        setActiveTab("list");
        fetchDrivers();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Driver Management</h1>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setActiveTab("list")}
                        className={`px-4 py-2 rounded-md flex items-center space-x-2 ${activeTab === "list"
                            ? "bg-indigo-600 text-white"
                            : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                            }`}
                    >
                        <Users className="h-5 w-5" />
                        <span>Driver List</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("register")}
                        className={`px-4 py-2 rounded-md flex items-center space-x-2 ${activeTab === "register"
                            ? "bg-indigo-600 text-white"
                            : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                            }`}
                    >
                        <UserPlus className="h-5 w-5" />
                        <span>Register New</span>
                    </button>
                </div>
            </div>

            {activeTab === "list" ? (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">Registered Drivers</h2>
                    </div>

                    {loading ? (
                        <div className="p-6 text-center text-gray-500">Loading drivers...</div>
                    ) : drivers.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">No drivers registered yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Driver
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            License
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Contact
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Face ID Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {drivers.map((driver) => (
                                        <tr key={driver._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <img
                                                            className="h-10 w-10 rounded-full object-cover"
                                                            src={driver.photoUrl || "https://via.placeholder.com/40"}
                                                            alt=""
                                                        />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{driver.name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {driver.licenseNumber}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {driver.contactNumber}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {driver.faceEncoding && driver.faceEncoding.length > 0 ? (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 items-center">
                                                        <CheckCircle className="h-3 w-3 mr-1" /> Active
                                                    </span>
                                                ) : (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 items-center">
                                                        <AlertCircle className="h-3 w-3 mr-1" /> Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${driver.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {driver.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                {(!driver.faceEncoding || driver.faceEncoding.length === 0) && (
                                                    <button
                                                        onClick={() => setReuploadDriverId(driver._id)}
                                                        className="text-indigo-600 hover:text-indigo-900 flex items-center"
                                                    >
                                                        <Camera className="h-4 w-4 mr-1" /> Re-upload
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">New Driver Registration</h2>
                    <RegisterDriver onSuccess={handleRegistrationSuccess} />
                </div>
            )}
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
