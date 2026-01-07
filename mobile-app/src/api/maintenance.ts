import client from "./client";

export const maintenanceApi = {
  getAll: async () => {
    const response = await client.get("/maintenance");
    return response.data;
  },

  create: async (data: any) => {
    const response = await client.post("/maintenance", data);
    return response.data;
  }
};
