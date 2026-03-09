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
  },

  sendPhoneGPS: async (
    busId: string,
    gps: { lat: number; lon: number },
    speed: number,
    gpsAccuracy: number,
  ) => {
    const response = await client.post("/iot/phone-gps", {
      busId,
      gps,
      speed,
      gpsAccuracy,
    });
    return response.data;
  },

  /**
   * Send GPS directly to ESP32 on local WiFi.
   * ESP32 runs ML model and returns risk data instantly.
   * @param esp32Ip - ESP32's local IP (e.g. "192.168.1.50")
   */
  sendGPSToESP32: async (
    esp32Ip: string,
    lat: number,
    lon: number,
    speed: number,
    accuracy: number,
  ) => {
    const response = await fetch(`http://${esp32Ip}:8080/gps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lon, speed, accuracy }),
    });
    return response.json();
  },

  /** Get ESP32 current status (passenger count, risk, etc.) */
  getESP32Status: async (esp32Ip: string) => {
    const response = await fetch(`http://${esp32Ip}:8080/status`);
    return response.json();
  },
};
