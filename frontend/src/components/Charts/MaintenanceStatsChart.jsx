import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Wrench } from "lucide-react";
import "./Charts.css";

const COLORS = {
  pending: "#f59e0b",
  "in-progress": "#3b82f6",
  completed: "#10b981",
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      style={{ fontSize: "0.875rem", fontWeight: "bold" }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function MaintenanceStatsChart({ data }) {
  // Transform data if needed
  const chartData =
    data && data.length > 0 ? data : [{ status: "No Data", count: 1 }];

  return (
    <div className="chart-container">
      <div className="chart-header">
        <Wrench className="chart-icon" />
        <h3 className="chart-title">Maintenance Statistics</h3>
      </div>
      <div className="chart-content">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="count"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.status] || "#9ca3af"}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "0.5rem",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "0.875rem" }}
              formatter={(value) => {
                const str = String(value || "");
                if (!str) return "";
                return str.charAt(0).toUpperCase() + str.slice(1);
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
