const Crash = require('../models/Crash');

const getAnalytics = async (req, res) => {
  try {
    const { range } = req.query; // 'monthly' or 'yearly'

    const startDate = range === 'yearly'
      ? new Date(new Date().getFullYear(), 0, 1)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const crashes = await Crash.find({
      timestamp: { $gte: startDate }
    });

    const analytics = {
      total: crashes.length,
      severity: {
        critical: crashes.filter(c => c.severity === 'critical').length,
        high: crashes.filter(c => c.severity === 'high').length,
        medium: crashes.filter(c => c.severity === 'medium').length,
        low: crashes.filter(c => c.severity === 'low').length
      },
      heatmap: generateHeatmap(crashes),
      routes: generateHighRiskRoutes(crashes),
      timeline: generateTimeline(crashes)
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const generateHeatmap = (crashes) => {
  const heatmap = {};
  crashes.forEach(crash => {
    const key = `${crash.location.latitude.toFixed(2)},${crash.location.longitude.toFixed(2)}`;
    heatmap[key] = (heatmap[key] || 0) + 1;
  });
  return Object.entries(heatmap).map(([coords, count]) => ({
    coordinates: coords.split(',').map(Number),
    count
  }));
};

const generateHighRiskRoutes = (crashes) => {
  const routes = {};
  crashes.forEach(crash => {
    const route = crash.location.route || 'Unknown';
    if (!routes[route]) {
      routes[route] = { route, count: 0, severity: [] };
    }
    routes[route].count++;
    routes[route].severity.push(crash.severity);
  });

  return Object.values(routes)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
};

const generateTimeline = (crashes) => {
  const timeline = {};
  crashes.forEach(crash => {
    const date = crash.timestamp.toISOString().split('T')[0];
    timeline[date] = (timeline[date] || 0) + 1;
  });
  return timeline;
};

module.exports = { getAnalytics };
