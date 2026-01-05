import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { UserPlus, Users, Camera, CheckCircle, AlertCircle, Phone, FileText, AlertTriangle } from "lucide-react";
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
        <div className="space-y-6 container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-4 sm:mb-0">
                    Driver Management
                </h1>
                <div className="flex space-x-3">
                    <button
                        onClick={() => setActiveTab("list")}
                        className={`px-5 py-2.5 rounded-lg flex items-center space-x-2 font-medium transition-all duration-200 ${activeTab === "list"
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-600 ring-offset-2"
                            : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-sm"
                            }`}
                    >
                        <Users className="h-5 w-5" />
                        <span>Driver Fleet</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("register")}
                        className={`px-5 py-2.5 rounded-lg flex items-center space-x-2 font-medium transition-all duration-200 ${activeTab === "register"
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-600 ring-offset-2"
                            : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-sm"
                            }`}
                    >
                        <UserPlus className="h-5 w-5" />
                        <span>Add New</span>
                    </button>
                </div>
            </div>

            {activeTab === "list" ? (
                <div className="min-h-[400px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                            <p>Loading fleet data...</p>
                        </div>
                    ) : drivers.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center text-slate-500 shadow-sm border border-dashed border-slate-300">
                            <UserPlus className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                            <h3 className="text-lg font-medium text-slate-900">No drivers registered</h3>
                            <p className="mt-1">Get started by registering a new driver to the fleet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {drivers.map((driver) => (
                                <div key={driver._id} className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100 overflow-hidden group">
                                    <div className="relative h-32 bg-gradient-to-r from-indigo-500 to-purple-600">
                                        <div className="absolute top-4 right-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${driver.status === 'active'
                                                ? 'bg-emerald-400/20 text-white border-emerald-400/30'
                                                : 'bg-rose-400/20 text-white border-rose-400/30'
                                                }`}>
                                                {driver.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="relative px-6 pb-6 mt-[-3rem] flex flex-col items-center text-center">
                                        <div className="h-24 w-24 rounded-full border-4 border-white shadow-md bg-white overflow-hidden mb-3">
                                            <img
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                src={driver.photoUrl || "https://via.placeholder.com/150"}
                                                alt={driver.name}
                                            />
                                        </div>

                                        <h3 className="text-lg font-bold text-slate-900 mb-1">{driver.name}</h3>

                                        {driver.faceEncoding && driver.faceEncoding.length > 0 ? (
                                            <div className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full mb-4">
                                                <CheckCircle className="h-3 w-3 mr-1" /> Face ID Active
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full mb-4">
                                                <AlertTriangle className="h-3 w-3 mr-1" /> Face ID Pending
                                            </div>
                                        )}

                                        <div className="w-full space-y-3 mb-6">
                                            <div className="flex items-center text-sm text-slate-500 bg-slate-50 p-2 rounded-lg">
                                                <div className="p-1.5 bg-white rounded-md shadow-sm mr-3 text-indigo-500">
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                <div className="text-left overflow-hidden">
                                                    <p className="text-xs font-bold text-slate-400 uppercase">License</p>
                                                    <p className="font-mono text-slate-700 truncate">{driver.licenseNumber}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center text-sm text-slate-500 bg-slate-50 p-2 rounded-lg">
                                                <div className="p-1.5 bg-white rounded-md shadow-sm mr-3 text-indigo-500">
                                                    <Phone className="h-4 w-4" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-xs font-bold text-slate-400 uppercase">Contact</p>
                                                    <p className="font-mono text-slate-700">{driver.contactNumber}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {(!driver.faceEncoding || driver.faceEncoding.length === 0) && (
                                            <button
                                                onClick={() => setReuploadDriverId(driver._id)}
                                                className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg flex items-center justify-center transition-colors"
                                            >
                                                <Camera className="h-4 w-4 mr-2" /> Re-upload Face Logic
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800">New Driver Registration</h2>
                            <button onClick={() => setActiveTab("list")} className="text-sm text-indigo-600 hover:underline">
                                Cancel
                            </button>
                        </div>
                        <div className="p-6">
                            <RegisterDriver onSuccess={handleRegistrationSuccess} />
                        </div>
                    </div>
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
