import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import { getActiveCrashes } from '../services/crashService';

export const EmergencyContext = createContext();

export const EmergencyProvider = ({ children }) => {
  const [activeEmergencies, setActiveEmergencies] = useState([]);
  const [newCrashIds, setNewCrashIds] = useState(new Set());
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const prevIdsRef = useRef(new Set());

  useEffect(() => {
    const fetchEmergencies = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const crashes = await getActiveCrashes();
        setActiveEmergencies(crashes);

        // Detect newly appeared crash IDs
        const currentIds = new Set(crashes.map(c => c._id));
        const brandNew = new Set();
        currentIds.forEach(id => {
          if (!prevIdsRef.current.has(id)) {
            brandNew.add(id);
          }
        });

        if (brandNew.size > 0) {
          setNewCrashIds(prev => {
            const merged = new Set(prev);
            brandNew.forEach(id => merged.add(id));
            return merged;
          });
          // Auto-remove "new" highlight after 30 seconds
          setTimeout(() => {
            setNewCrashIds(prev => {
              const updated = new Set(prev);
              brandNew.forEach(id => updated.delete(id));
              return updated;
            });
          }, 30000);
        }

        // Clean up dismissed IDs that are no longer active
        setDismissedIds(prev => {
          const cleaned = new Set();
          prev.forEach(id => {
            if (currentIds.has(id)) cleaned.add(id);
          });
          return cleaned;
        });

        prevIdsRef.current = currentIds;
      } catch (error) {
        if (error.response?.status !== 401) {
          console.error('Failed to fetch emergencies:', error);
        }
      }
    };

    fetchEmergencies();
    const interval = setInterval(fetchEmergencies, 5000);
    return () => clearInterval(interval);
  }, []);

  const dismissCrash = useCallback((id) => {
    setDismissedIds(prev => new Set(prev).add(id));
  }, []);

  // Visible alerts = active emergencies that haven't been dismissed
  const visibleAlerts = activeEmergencies.filter(c => !dismissedIds.has(c._id));

  return (
    <EmergencyContext.Provider value={{
      activeEmergencies,
      setActiveEmergencies,
      visibleAlerts,
      newCrashIds,
      dismissCrash,
    }}>
      {children}
    </EmergencyContext.Provider>
  );
};
