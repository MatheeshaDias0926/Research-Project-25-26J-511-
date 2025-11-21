import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Activity } from "lucide-react";
import "./Charts.css";

export default function BusUtilizationChart({ data }) {
  // Transform data if needed
  const chartData =
    data && data.length > 0 ? data : [{ bus: "No Data", utilization: 0 }];

  return (
    <div className="chart-container">
      <div className="chart-header">
        <Activity className="chart-icon" />
        <h3 className="chart-title">Bus Utilization Metrics</h3>
      </div>
      <div className="chart-content">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="bus"
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
            <Bar
              dataKey="utilization"
              fill="#667eea"
              radius={[8, 8, 0, 0]}
              name="Utilization %"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
