import React, { useEffect, useState, useRef } from 'react';
import { getCrashes, updateCrashStatus } from '../../services/crashService';
import { Card, CardContent } from '../../components/ui/Card';
import { AlertTriangle, Clock, CheckCircle, MapPin, Activity, ChevronDown, Flame, Loader, Check, Ban, Search, Filter, XCircle } from 'lucide-react';

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

const filterConfig = {
  all: { label: "All Crashes", icon: Filter, color: "#6366f1" },
  active: { label: "Active", icon: Flame, color: "#dc2626" },
  in_progress: { label: "In Progress", icon: Loader, color: "#ea580c" },
  resolved: { label: "Resolved", icon: Check, color: "#16a34a" },
  false_positive: { label: "False Positive", icon: Ban, color: "#64748b" },
};

const CrashesPage = () => {
  const [crashes, setCrashes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCrashes();
  }, [filter]);

  const fetchCrashes = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const data = await getCrashes(params);
      setCrashes(data.crashes || []);
    } catch (error) {
      console.error('Failed to fetch crashes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (crashId, newStatus) => {
    try {
      await updateCrashStatus(crashId, { status: newStatus });
      await fetchCrashes();
    } catch (error) {
      console.error('Failed to update crash status:', error);
      alert('Failed to update crash status');
    }
  };

  const filtered = crashes.filter(c =>
    (c.bus_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.location?.address || '').toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = crashes.filter(c => c.status === 'active').length;
  const inProgressCount = crashes.filter(c => c.status === 'in_progress').length;
  const resolvedCount = crashes.filter(c => c.status === 'resolved').length;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid var(--border-primary)", borderTopColor: "#dc2626", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>Loading crash data...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <style>{`@keyframes dropdownFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ padding: 10, background: "linear-gradient(135deg, #dc2626, #ef4444)", borderRadius: 12 }}>
            <AlertTriangle style={{ height: 24, width: 24, color: "#fff" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Crash Management</h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0, marginTop: 2 }}>Monitor and manage crash incidents</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
        {[
          { label: "Total Crashes", value: crashes.length, color: "#6366f1", bgGrad: "linear-gradient(135deg, #eef2ff, #e0e7ff)", borderColor: "#c7d2fe", icon: AlertTriangle, iconBg: "#6366f1" },
          { label: "Active", value: activeCount, color: "#dc2626", bgGrad: "linear-gradient(135deg, #fef2f2, #fee2e2)", borderColor: "#fecaca", icon: Flame, iconBg: "#dc2626" },
          { label: "In Progress", value: inProgressCount, color: "#ea580c", bgGrad: "linear-gradient(135deg, #fff7ed, #ffedd5)", borderColor: "#fed7aa", icon: Clock, iconBg: "#ea580c" },
          { label: "Resolved", value: resolvedCount, color: "#16a34a", bgGrad: "linear-gradient(135deg, #f0fdf4, #dcfce7)", borderColor: "#bbf7d0", icon: CheckCircle, iconBg: "#16a34a" },
        ].map((s, i) => {
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

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {Object.entries(filterConfig).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const isActive = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 10,
                border: isActive ? `1.5px solid ${cfg.color}` : "1.5px solid var(--border-primary)",
                background: isActive ? `${cfg.color}12` : "var(--bg-card)",
                color: isActive ? cfg.color : "var(--text-secondary)",
                fontSize: 13, fontWeight: isActive ? 700 : 500,
                cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = cfg.color; e.currentTarget.style.color = cfg.color; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = "var(--border-primary)"; e.currentTarget.style.color = "var(--text-secondary)"; } }}
            >
              <Icon style={{ height: 14, width: 14 }} />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Search + Table */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            {filter === 'all' ? 'All Crashes' : filterConfig[filter]?.label || 'Crashes'}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{filtered.length} records</span>
            <div style={{ position: "relative" }}>
              <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", height: 16, width: 16, color: "var(--text-muted)" }} />
              <input
                type="text" placeholder="Search by bus ID..." value={search} onChange={e => setSearch(e.target.value)}
                style={{
                  width: 240, padding: "10px 14px", paddingLeft: 36, borderRadius: 10,
                  border: "1.5px solid var(--border-primary)", fontSize: 14,
                  color: "var(--text-primary)", outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
                  background: "var(--bg-card)", boxSizing: "border-box",
                }}
                onFocus={e => { e.target.style.borderColor = "#dc2626"; e.target.style.boxShadow = "0 0 0 3px rgba(220,38,38,0.1)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--border-primary)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
          </div>
        </div>
        <div className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {["Bus ID", "Timestamp", "Location", "Severity", "Status", "Acceleration", "Actions"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((crash) => {
                  const sev = severityConfig[crash.severity] || severityConfig.medium;
                  const stat = statusConfig[crash.status] || statusConfig.active;
                  const isActive = crash.status === "active";
                  return (
                    <tr key={crash._id} data-active={isActive ? "true" : undefined}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: isActive ? "linear-gradient(135deg, #fef2f2, #fee2e2)" : "linear-gradient(135deg, #f1f5f9, #e2e8f0)",
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                          }}>
                            <AlertTriangle style={{ height: 16, width: 16, color: isActive ? "#dc2626" : "#64748b" }} />
                          </div>
                          <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{crash.bus_id || crash.busId || '—'}</span>
                        </div>
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
                          {crash.location?.address || `${(crash.location?.lat ?? crash.location?.latitude)?.toFixed(4) || '0'}, ${(crash.location?.lon ?? crash.location?.longitude)?.toFixed(4) || '0'}`}
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
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 48, textAlign: "center" }}>
                      <AlertTriangle style={{ height: 40, width: 40, color: "var(--border-primary)", margin: "0 auto 12px", display: "block" }} />
                      <p style={{ color: "var(--text-muted)", fontSize: 15, fontWeight: 500 }}>{search ? 'No crashes match your search' : 'No crashes found'}</p>
                      <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Crashes will appear here when detected by the system</p>
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

export default CrashesPage;
