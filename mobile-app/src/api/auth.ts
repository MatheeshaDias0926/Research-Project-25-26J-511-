import client from "./client";

export const authApi = {
  login: async (username, password) => {
    const response = await client.post("/auth/login", { username, password });
    return response.data;
  },
  
  register: async (username, password, role = "passenger") => {
    const response = await client.post("/auth/register", { username, password, role });
    return response.data;
  },

  getStats: async () => {
    const response = await client.get("/auth/stats");
    return response.data;
  },

  getConductors: async () => {
    const response = await client.get("/auth/conductors");
    return response.data;
  }
};
