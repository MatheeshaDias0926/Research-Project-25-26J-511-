const classify = ({ reconstruction_error, max_acceleration }) => {
  // Critical: Very high impact
  if (reconstruction_error >= 0.5 || max_acceleration >= 80) {
    return 'critical';
  }

  // High: Significant impact
  if (reconstruction_error >= 0.3 || max_acceleration >= 50) {
    return 'high';
  }

  // Medium: Moderate impact
  if (reconstruction_error >= 0.15 || max_acceleration >= 25) {
    return 'medium';
  }

  // Low: Minor impact
  return 'low';
};

module.exports = { classify };
