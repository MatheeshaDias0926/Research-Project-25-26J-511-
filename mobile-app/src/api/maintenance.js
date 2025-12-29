import client from "./client";

export const createMaintenanceReport = async (data) => {
    const response = await client.post("/maintenance", data);
    return response.data;
};

export const getMaintenanceLogs = async (busId) => {
    const response = await client.get(`/maintenance/bus/${busId}`);
    return response.data;
};
