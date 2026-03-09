import React, { useEffect, useState, useRef } from 'react';
import { getCrashes, getSystemStats, updateCrashStatus } from '../services/crashService';
import { Card, CardContent } from '../components/ui/Card';
import { Shield, AlertTriangle, Clock, CheckCircle, Bus, MapPin, ChevronRight, Activity, ChevronDown, Flame, Loader, Check, Ban } from 'lucide-react';

const severityConfig = {
  critical: { bg: "#fee2e2", text: "#dc2626" },
  high: { bg: "#ffedd5", text: "#ea580c" },
  medium: { bg: "#fef9c3", text: "#ca8a04" },
  low: { bg: "#dbeafe", text: "#2563eb" },
};

const statusConfig = {
  active: { bg: "#fee2e2", text: "#dc2626", dot: "#dc2626", label: "Active", icon: Flame },
  in_progress: { bg: "#ffedd5", text: "#ea580c", dot: "#ea580c", label: "In Progress", icon: Loader },
  resolved: { bg: "#dcfce7", text: "#16a34a", dot: "#16a34a", label: "Resolved", icon: Check },
  false_positive: { bg: "#f1f5f9", text: "#64748b", dot: "#64748b", label: "False Positive", icon: Ban },
};

const StatusDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = statusConfig[value] || statusConfig.active;
  const CurrentIcon = current.icon;

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "7px 14px", borderRadius: 10,
          border: `1.5px solid ${open ? current.text : "var(--border-primary)"}`,
          background: current.bg, cursor: "pointer",
          fontSize: 13, fontWeight: 700, color: current.text,
          outline: "none", transition: "all 0.2s",
          boxShadow: open ? `0 0 0 3px ${current.text}18` : "none",
          minWidth: 150,
        }}
      >
        <CurrentIcon style={{ height: 14, width: 14 }} />
        <span style={{ flex: 1, textAlign: "left" }}>{current.label}</span>
        <ChevronDown style={{ height: 14, width: 14, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          background: "var(--bg-card)", borderRadius: 12,
          border: "1px solid var(--border-primary)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)",
          zIndex: 50, overflow: "hidden",
          animation: "dropdownFadeIn 0.15s ease-out",
          minWidth: 180,
        }}>
          {Object.entries(statusConfig).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const isSelected = key === value;
            return (
              <button
                key={key}
                onClick={() => { onChange(key); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "10px 14px", border: "none",
                  background: isSelected ? cfg.bg : "transparent",
                  cursor: "pointer", fontSize: 13, fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? cfg.text : "var(--text-body)",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--bg-muted)"; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: isSelected ? `${cfg.text}18` : "var(--bg-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: isSelected ? cfg.text : "var(--text-muted)",
                }}>
                  <Icon style={{ height: 14, width: 14 }} />
                </div>
                <span style={{ flex: 1, textAlign: "left" }}>{cfg.label}</span>
                {isSelected && (
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [crashes, setCrashes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsData, crashesData] = await Promise.all([
        getSystemStats(),
        getCrashes({ limit: 50, sort: '-createdAt' })
      ]);
      setStats(statsData);
      setCrashes(crashesData.crashes || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (crashId, newStatus) => {
    try {
      await updateCrashStatus(crashId, { status: newStatus });
      await fetchData();
    } catch (error) {
      console.error('Failed to update crash status:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 40, height: 40, border: "3px solid var(--border-secondary)", borderTopColor: "#7c3aed",
            borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
          }} />
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>Loading admin panel...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Active Crashes", value: stats?.activeCrashes || 0, color: "#dc2626", bgGrad: "linear-gradient(135deg, #fef2f2, #fee2e2)", borderColor: "#fecaca", icon: AlertTriangle, iconBg: "#dc2626" },
    { label: "Pending Responses", value: stats?.pendingResponses || 0, color: "#ea580c", bgGrad: "linear-gradient(135deg, #fff7ed, #ffedd5)", borderColor: "#fed7aa", icon: Clock, iconBg: "#ea580c" },
    { label: "Resolved Today", value: stats?.resolvedToday || 0, color: "#16a34a", bgGrad: "linear-gradient(135deg, #f0fdf4, #dcfce7)", borderColor: "#bbf7d0", icon: CheckCircle, iconBg: "#16a34a" },
    { label: "Total Buses", value: stats?.totalBuses || 0, color: "#2563eb", bgGrad: "linear-gradient(135deg, #eff6ff, #dbeafe)", borderColor: "#bfdbfe", icon: Bus, iconBg: "#2563eb" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <style>{`@keyframes dropdownFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{ padding: 10, background: "linear-gradient(135deg, #7c3aed, #8b5cf6)", borderRadius: 12 }}>
            <Shield style={{ height: 24, width: 24, color: "#fff" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
              Admin Dashboard
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0, marginTop: 2 }}>
              System-wide crash monitoring and management
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} style={{ background: s.bgGrad, border: `1px solid ${s.borderColor}`, transition: "transform 0.2s, box-shadow 0.2s", cursor: "default" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow-card-hover)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "var(--shadow-card)"; }}
            >
              <CardContent style={{ padding: 22, paddingTop: 22, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{s.label}</p>
                  <p style={{ fontSize: 36, fontWeight: 800, color: s.color, letterSpacing: "-0.03em", lineHeight: 1 }}>{s.value}</p>
                </div>
                <div style={{ padding: 14, background: s.iconBg, borderRadius: 14, color: "#fff", boxShadow: `0 4px 14px ${s.iconBg}40` }}>
                  <Icon style={{ height: 24, width: 24 }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Crash Table */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Recent Crashes</h2>
          <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{crashes.length} records</span>
        </div>
        <div className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {["Bus ID", "Timestamp", "Location", "Severity", "Status", "Acceleration", "Actions"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {crashes.map((crash, idx) => {
                  const sev = severityConfig[crash.severity] || severityConfig.medium;
                  const stat = statusConfig[crash.status] || statusConfig.active;
                  const isActive = crash.status === "active";
                  return (
                    <tr
                      key={crash._id}
                      data-active={isActive ? "true" : undefined}
                    >
                      <td>
                        {crash.bus_id}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
                          <Clock style={{ height: 14, width: 14, flexShrink: 0 }} />
                          {new Date(crash.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
                          <MapPin style={{ height: 14, width: 14, flexShrink: 0 }} />
                          {crash.location?.address || 'Unknown'}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                          background: sev.bg, color: sev.text, letterSpacing: "0.03em",
                        }}>
                          {crash.severity?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {isActive && (
                            <span style={{
                              width: 8, height: 8, borderRadius: "50%", background: stat.dot,
                              boxShadow: `0 0 0 3px ${stat.dot}30`,
                              animation: "pulse 1.5s ease-in-out infinite",
                            }} />
                          )}
                          <span style={{
                            padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                            background: stat.bg, color: stat.text, letterSpacing: "0.03em",
                          }}>
                            {crash.status?.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
                          <Activity style={{ height: 14, width: 14, flexShrink: 0 }} />
                          {crash.max_acceleration?.toFixed(2) || '—'} m/s²
                        </div>
                      </td>
                      <td>
                        <StatusDropdown
                          value={crash.status}
                          onChange={(newStatus) => handleStatusChange(crash._id, newStatus)}
                        />
                      </td>
                    </tr>
                  );
                })}
                {crashes.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 48, textAlign: "center" }}>
                      <Shield style={{ height: 40, width: 40, color: "var(--border-input)", margin: "0 auto 12px", display: "block" }} />
                      <p style={{ color: "var(--text-muted)", fontSize: 15, fontWeight: 500 }}>No crashes recorded</p>
                      <p style={{ color: "var(--text-faint)", fontSize: 13 }}>System is running normally</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
