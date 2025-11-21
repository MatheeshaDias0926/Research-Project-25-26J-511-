import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Users } from "lucide-react";
import "./Charts.css";

export default function OccupancyPatternsChart({ data }) {
  // Transform data if needed
  const chartData =
    data && data.length > 0 ? data : [{ hour: "No Data", occupancy: 0 }];

  return (
    <div className="chart-container">
      <div className="chart-header">
        <Users className="chart-icon" />
        <h3 className="chart-title">Occupancy Patterns by Hour</h3>
      </div>
      <div className="chart-content">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#667eea" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#667eea" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="hour"
              stroke="#6b7280"
              style={{ fontSize: "0.75rem" }}
            />
            <YAxis stroke="#6b7280" style={{ fontSize: "0.75rem" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "0.5rem",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Area
              type="monotone"
              dataKey="occupancy"
              stroke="#667eea"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorOccupancy)"
              name="Average Occupancy"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
