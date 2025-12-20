import client from "./client";

export const getAllBuses = async () => {
    const response = await client.get("/bus");
    return response.data;
};

export const getBusStatus = async (busId) => {
    const response = await client.get(`/bus/${busId}/status`);
    return response.data;
};
