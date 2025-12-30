import React, { useEffect, useState } from 'react';
import { getAnalytics } from '../services/analyticsService';
import LoadingSpinner from '../components/common/LoadingSpinner';

const MinistryDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [timeRange, setTimeRange] = useState('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await getAnalytics(timeRange);
        setAnalytics(data);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="ministry-dashboard">
      <h1>Transport Ministry Analytics</h1>
      <div className="time-range-selector">
        <button
          onClick={() => setTimeRange('monthly')}
          className={timeRange === 'monthly' ? 'active' : ''}
        >
          Monthly
        </button>
        <button
          onClick={() => setTimeRange('yearly')}
          className={timeRange === 'yearly' ? 'active' : ''}
        >
          Yearly
        </button>
      </div>

      <div className="analytics-overview">
        <div className="analytics-card">
          <h3>Total Crashes</h3>
          <p className="big-number">{analytics?.total || 0}</p>
        </div>
        <div className="analytics-card">
          <h3>Critical</h3>
          <p className="big-number">{analytics?.severity?.critical || 0}</p>
        </div>
        <div className="analytics-card">
          <h3>High</h3>
          <p className="big-number">{analytics?.severity?.high || 0}</p>
        </div>
        <div className="analytics-card">
          <h3>Medium</h3>
          <p className="big-number">{analytics?.severity?.medium || 0}</p>
        </div>
      </div>
    </div>
  );
};

export default MinistryDashboard;
