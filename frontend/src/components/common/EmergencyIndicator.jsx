import React, { useContext } from 'react';
import { EmergencyContext } from '../../context/EmergencyContext';
import './EmergencyIndicator.css';

const EmergencyIndicator = () => {
  const { visibleAlerts } = useContext(EmergencyContext);
  
  if (visibleAlerts.length === 0) return null;

  return (
    <div className="emergency-indicator">
      <p className="emergency-text">
        ⚠️ {visibleAlerts.length} ACTIVE EMERGENCY{visibleAlerts.length > 1 ? 'IES' : ''} - IMMEDIATE ACTION REQUIRED
      </p>
    </div>
  );
};

export default EmergencyIndicator;
