import { useState, useEffect } from "react";
import api from "../../api/axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { Bus, AlertTriangle, CheckCircle, Wrench, UserPlus } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis
} from 'recharts';

const AuthorityDashboard = () => {
  const [stats, setStats] = useState({
    activeBuses: 0,
    conductors: 0,
    totalViolations: 0,
    pendingMaintenance: 0,
    systemStatus: "Healthy",
    violationsByBus: [],
    violationTrends: [],
    fleetOccupancy: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app we'd have a specific analytics endpoint.
    // Here we'll just fetch list of buses to count them and mock the rest or fetch maintenance.
    const fetchData = async () => {
      try {
        const busesRes = await api.get("/bus");
        const statsRes = await api.get("/auth/stats");
        const analyticsRes = await api.get("/bus/analytics/violations");
        const trendsRes = await api.get("/bus/analytics/trends");
        const occupancyRes = await api.get("/bus/analytics/occupancy");

        setStats({
          activeBuses: busesRes.data.length,
          conductors: statsRes.data.conductors,
          totalViolations: statsRes.data.totalViolations,
          pendingMaintenance: statsRes.data.pendingMaintenance,
          systemStatus: "Healthy",
          violationsByBus: analyticsRes.data || [],
          violationTrends: trendsRes.data || [],
          fleetOccupancy: occupancyRes.data || [],
        });
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <h1 style={{ fontSize: 30, fontWeight: 700, color: "#1e293b" }}>
        System Overview
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 24,
        }}
      >
        <Card>
          <CardContent
            style={{
              padding: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#64748b" }}>
                Active Buses
              </p>
              <p style={{ fontSize: 30, fontWeight: 700, color: "#0f172a" }}>
                {stats.activeBuses}
              </p>
            </div>
            <div
              style={{
                padding: 12,
                background: "#dbeafe",
                borderRadius: 9999,
                color: "#2563eb",
              }}
            >
              <Bus style={{ height: 24, width: 24 }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent
            style={{
              padding: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#64748b" }}>
                Total Conductors
              </p>
              <p style={{ fontSize: 30, fontWeight: 700, color: "#0f172a" }}>
                {stats.conductors}
              </p>
            </div>
            <div
              style={{
                padding: 12,
                background: "#f0f9ff",
                borderRadius: 9999,
                color: "#0284c7",
              }}
            >
              <UserPlus style={{ height: 24, width: 24 }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent
            style={{
              padding: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#64748b" }}>
                Violations (24h)
              </p>
              <p style={{ fontSize: 30, fontWeight: 700, color: "#0f172a" }}>
                {stats.totalViolations}
              </p>
            </div>
            <div
              style={{
                padding: 12,
                background: "#fee2e2",
                borderRadius: 9999,
                color: "#dc2626",
              }}
            >
              <AlertTriangle style={{ height: 24, width: 24 }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent
            style={{
              padding: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#64748b" }}>
                Maintenance
              </p>
              <p style={{ fontSize: 30, fontWeight: 700, color: "#0f172a" }}>
                {stats.pendingMaintenance}
              </p>
            </div>
            <div
              style={{
                padding: 12,
                background: "#ffedd5",
                borderRadius: 9999,
                color: "#ea580c",
              }}
            >
              <Wrench style={{ height: 24, width: 24 }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent
            style={{
              padding: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#64748b" }}>
                System Status
              </p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#22c55e" }}>
                {stats.systemStatus}
              </p>
            </div>
            <div
              style={{
                padding: 12,
                background: "#bbf7d0",
                borderRadius: 9999,
                color: "#22c55e",
              }}
            >
              <CheckCircle style={{ height: 24, width: 24 }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1e293b", marginBottom: 20 }}>
          Quick Actions
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
          <a href="/authority/conductors" style={{ textDecoration: "none" }}>
            <Card style={{ cursor: "pointer", transition: "transform 0.2s" }} className="hover:scale-105">
              <CardContent
                style={{
                  padding: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
                    Manage Conductors
                  </p>
                  <p style={{ fontSize: 13, color: "#64748b" }}>
                    Register & Assign Buses
                  </p>
                </div>
                <div
                  style={{
                    padding: 12,
                    background: "#f1f5f9",
                    borderRadius: 9999,
                    color: "#475569",
                  }}
                >
                  <UserPlus style={{ height: 24, width: 24 }} />
                </div>
              </CardContent>
            </Card>
          </a>
          <a href="/authority/register-driver" style={{ textDecoration: "none" }}>
            <Card style={{ cursor: "pointer", transition: "transform 0.2s" }} className="hover:scale-105">
              <CardContent
                style={{
                  padding: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
                    Register Driver
                  </p>
                  <p style={{ fontSize: 13, color: "#64748b" }}>
                    Add New Driver & Face ID
                  </p>
                </div>
                <div
                  style={{
                    padding: 12,
                    background: "#f1f5f9",
                    borderRadius: 9999,
                    color: "#475569",
                  }}
                >
                  <UserPlus style={{ height: 24, width: 24 }} />
                </div>
              </CardContent>
            </Card>
          </a>
          <a href="/authority/safety" style={{ textDecoration: "none" }}>
            <Card style={{ cursor: "pointer", transition: "transform 0.2s" }} className="hover:scale-105">
              <CardContent
                style={{
                  padding: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
                    Safety Check
                  </p>
                  <p style={{ fontSize: 13, color: "#64748b" }}>
                    Run Physics Simulation
                  </p>
                </div>
                <div
                  style={{
                    padding: 12,
                    background: "#f1f5f9",
                    borderRadius: 9999,
                    color: "#475569",
                  }}
                >
                  <AlertTriangle style={{ height: 24, width: 24 }} />
                </div>
              </CardContent>
            </Card>
          </a>
        </div>
      </div>

      {/* Violation Analytics Chart */}
      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1e293b", marginBottom: 20 }}>
          Violation Analytics (Top Offenders)
        </h2>
        <Card>
          <CardContent style={{ padding: 24, height: 400 }}>
            {stats.violationsByBus && stats.violationsByBus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.violationsByBus}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="licensePlate" stroke="#64748b" fontSize={12} tick={{ fill: '#64748b' }} />
                  <YAxis stroke="#64748b" fontSize={12} tick={{ fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Legend />
                  <Bar dataKey="footboard" name="Footboard" stackId="a" fill="#ef4444" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="overcrowding" name="Overcrowding" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                No significant violation data found for diagrams.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 24 }}>
        {/* Violation Trends Chart (Stacked for Detail) */}
        <Card>
          <CardHeader>
            <CardTitle>Safety Trends (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent style={{ padding: 24, height: 350 }}>
            {stats.violationTrends && stats.violationTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats.violationTrends}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tick={{ fill: '#64748b' }} />
                  <YAxis stroke="#64748b" fontSize={12} tick={{ fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="footboard" stackId="1" stroke="#ef4444" fill="#fee2e2" name="Footboard" />
                  <Area type="monotone" dataKey="overcrowding" stackId="1" stroke="#f97316" fill="#ffedd5" name="Overcrowding" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                No trend data available.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fleet Occupancy Chart (Scatter Plot by Bus) */}
        <Card>
          <CardHeader>
            <CardTitle>Real-time Fleet Capacity (Per Bus)</CardTitle>
          </CardHeader>
          <CardContent style={{ padding: 24, height: 350 }}>
            {stats.fleetOccupancy && stats.fleetOccupancy.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="category" dataKey="routeId" name="Route" stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis type="number" dataKey="occupancyPct" name="Occupancy" unit="%" stroke="#64748b" domain={[0, 'auto']} />
                  <ZAxis type="number" range={[100, 300]} /> {/* Size of bubbles */}
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div style={{ background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                            <p style={{ fontWeight: 600, color: '#1e293b' }}>{data.licensePlate}</p>
                            <p style={{ color: '#64748b', fontSize: '13px' }}>Route: {data.routeId}</p>
                            <p style={{ color: data.occupancyPct > 100 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                              {data.occupancyPct}% ({data.currentLoad}/{data.capacity})
                            </p>
                            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>{data.status}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Scatter name="Buses" data={stats.fleetOccupancy} fill="#3b82f6">
                    {stats.fleetOccupancy.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={
                        entry.occupancyPct > 120 ? '#ef4444' :  // Overloaded (Red)
                          entry.occupancyPct > 100 ? '#f59e0b' :  // Standing (Orange)
                            entry.occupancyPct === 0 ? '#10b981' :  // Empty (Green)
                              '#3b82f6'                               // Seated (Blue)
                      } />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                No active buses found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div >
  );
};

export default AuthorityDashboard;
