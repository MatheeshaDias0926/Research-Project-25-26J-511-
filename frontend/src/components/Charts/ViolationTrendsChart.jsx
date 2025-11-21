import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import "./Charts.css";

export default function ViolationTrendsChart({ data }) {
  // Transform data if needed
  const chartData =
    data && data.length > 0 ? data : [{ date: "No Data", violations: 0 }];

  return (
    <div className="chart-container">
      <div className="chart-header">
        <TrendingUp className="chart-icon" />
        <h3 className="chart-title">Violation Trends</h3>
      </div>
      <div className="chart-content">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
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
            <Legend wrapperStyle={{ fontSize: "0.875rem" }} />
            <Line
              type="monotone"
              dataKey="violations"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: "#ef4444", r: 4 }}
              activeDot={{ r: 6 }}
              name="Violations"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
