export const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

export const formatTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString();
};

export const getSeverityLabel = (severity) => {
  const labels = {
    critical: 'CRITICAL',
    high: 'HIGH',
    medium: 'MEDIUM',
    low: 'LOW'
  };
  return labels[severity] || severity.toUpperCase();
};

export const getStatusLabel = (status) => {
  const labels = {
    active: 'ACTIVE',
    in_progress: 'IN PROGRESS',
    resolved: 'RESOLVED',
    false_positive: 'FALSE POSITIVE',
    pending: 'PENDING',
    acknowledged: 'ACKNOWLEDGED'
  };
  return labels[status] || status.toUpperCase();
};
