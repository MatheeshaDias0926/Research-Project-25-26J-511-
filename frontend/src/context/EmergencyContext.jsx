import React, { createContext, useState, useEffect } from 'react';
import { getActiveCrashes } from '../services/crashService';

export const EmergencyContext = createContext();

export const EmergencyProvider = ({ children }) => {
  const [activeEmergencies, setActiveEmergencies] = useState([]);

  useEffect(() => {
    const fetchEmergencies = async () => {
      // Only fetch if user is logged in (has token)
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      try {
        const crashes = await getActiveCrashes();
        setActiveEmergencies(crashes);
      } catch (error) {
        // Silently fail if unauthorized (user not logged in)
        if (error.response?.status !== 401) {
          console.error('Failed to fetch emergencies:', error);
        }
      }
    };

    fetchEmergencies();
    const interval = setInterval(fetchEmergencies, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <EmergencyContext.Provider value={{ activeEmergencies, setActiveEmergencies }}>
      {children}
    </EmergencyContext.Provider>
  );
};
