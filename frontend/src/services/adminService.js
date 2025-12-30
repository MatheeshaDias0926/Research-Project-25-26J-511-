import api from './api';

// User Management (Bus Owners, Police, Hospital, Ministry)
export const getUsers = async (role) => {
  const params = role ? { role } : {};
  const response = await api.get('/users', { params });
  return response.data;
};

export const getUserById = async (id) => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};

export const createUser = async (userData) => {
  const response = await api.post('/users', userData);
  return response.data;
};

export const updateUser = async (id, userData) => {
  const response = await api.put(`/users/${id}`, userData);
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};

// Driver Management
export const getDrivers = async () => {
  const response = await api.get('/drivers');
  return response.data;
};

export const getDriverById = async (id) => {
  const response = await api.get(`/drivers/${id}`);
  return response.data;
};

export const createDriver = async (driverData) => {
  const response = await api.post('/drivers', driverData);
  return response.data;
};

export const updateDriver = async (id, driverData) => {
  const response = await api.put(`/drivers/${id}`, driverData);
  return response.data;
};

export const deleteDriver = async (id) => {
  const response = await api.delete(`/drivers/${id}`);
  return response.data;
};

// Conductor Management
export const getConductors = async () => {
  const response = await api.get('/conductors');
  return response.data;
};

export const getConductorById = async (id) => {
  const response = await api.get(`/conductors/${id}`);
  return response.data;
};

export const createConductor = async (conductorData) => {
  const response = await api.post('/conductors', conductorData);
  return response.data;
};

export const updateConductor = async (id, conductorData) => {
  const response = await api.put(`/conductors/${id}`, conductorData);
  return response.data;
};

export const deleteConductor = async (id) => {
  const response = await api.delete(`/conductors/${id}`);
  return response.data;
};

// Police Station Management
export const getPoliceStations = async () => {
  const response = await api.get('/police-stations');
  return response.data;
};

export const getPoliceStationById = async (id) => {
  const response = await api.get(`/police-stations/${id}`);
  return response.data;
};

export const createPoliceStation = async (stationData) => {
  const response = await api.post('/police-stations', stationData);
  return response.data;
};

export const updatePoliceStation = async (id, stationData) => {
  const response = await api.put(`/police-stations/${id}`, stationData);
  return response.data;
};

export const deletePoliceStation = async (id) => {
  const response = await api.delete(`/police-stations/${id}`);
  return response.data;
};

// Hospital Management
export const getHospitals = async () => {
  const response = await api.get('/hospitals');
  return response.data;
};

export const getHospitalById = async (id) => {
  const response = await api.get(`/hospitals/${id}`);
  return response.data;
};

export const createHospital = async (hospitalData) => {
  const response = await api.post('/hospitals', hospitalData);
  return response.data;
};

export const updateHospital = async (id, hospitalData) => {
  const response = await api.put(`/hospitals/${id}`, hospitalData);
  return response.data;
};

export const deleteHospital = async (id) => {
  const response = await api.delete(`/hospitals/${id}`);
  return response.data;
};
