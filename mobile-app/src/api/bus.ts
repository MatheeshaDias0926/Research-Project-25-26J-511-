import client from "./client";

export const busApi = {
  getAll: async () => {
    const response = await client.get("/bus");
    return response.data;
  },

  getById: async (id: string) => {
    const response = await client.get(`/bus/${id}`);
    return response.data;
  },
  
  getStatus: async (id: string) => {
    const response = await client.get(`/bus/${id}/status`);
    return response.data;
  },

  getViolations: async (id: string, limit = 10) => {
    const response = await client.get(`/bus/${id}/violations?limit=${limit}`);
    return response.data;
  },

  getLogs: async (id: string, limit = 20) => {
    const response = await client.get(`/bus/${id}/logs?limit=${limit}`);
    return response.data;
  },

  getPrediction: async (routeId: string) => {
    const response = await client.get(`/bus/predict/${routeId}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await client.post("/bus", data);
    return response.data;
  },

  submitPhysicsCheck: async (payload: any) => {
    const response = await client.post("/bus/physics", payload);
    return response.data;
  }
};
