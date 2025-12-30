import React from 'react';
import { SEVERITY_COLORS, STATUS_COLORS } from '../../utils/constants';
import { getSeverityLabel, getStatusLabel } from '../../utils/helpers';
import './StatusBadge.css';

const StatusBadge = ({ severity, status }) => {
  if (severity) {
    return (
      <span
        className="status-badge severity"
        style={{ backgroundColor: SEVERITY_COLORS[severity] }}
      >
        {getSeverityLabel(severity)}
      </span>
    );
  }

  if (status) {
    return (
      <span
        className="status-badge status"
        style={{ backgroundColor: STATUS_COLORS[status] }}
      >
        {getStatusLabel(status)}
      </span>
    );
  }

  return null;
};

export default StatusBadge;
