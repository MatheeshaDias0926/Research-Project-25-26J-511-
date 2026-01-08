const classify = ({ reconstruction_error, max_acceleration }) => {
  
  if (reconstruction_error >= 0.5 || max_acceleration >= 80) {
    return 'critical';
  }


  if (reconstruction_error >= 0.3 || max_acceleration >= 50) {
    return 'high';
  }


  if (reconstruction_error >= 0.15 || max_acceleration >= 25) {
    return 'medium';
  }

 
  return 'low';
};

module.exports = { classify };
