import React from 'react';
import './EmergencyIndicator.css';

const EmergencyIndicator = () => {
  return (
    <div className="emergency-indicator">
      <div className="pulsing-red-bar"></div>
      <p className="emergency-text">⚠️ ACTIVE EMERGENCY - IMMEDIATE ACTION REQUIRED</p>
    </div>
  );
};

export default EmergencyIndicator;
