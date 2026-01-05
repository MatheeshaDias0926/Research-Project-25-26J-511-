import client from "./client";

export const getAllBuses = async () => {
  const response = await client.get("/bus");
  return response.data;
};

export const getBusStatus = async (busId) => {
  const response = await client.get(`/bus/${busId}/status`);
  return response.data;
};

// Call the backend physics model endpoint
export const getPhysicsModel = async (payload) => {
  const response = await client.post("/bus/physics", payload);
  return response.data;
};
