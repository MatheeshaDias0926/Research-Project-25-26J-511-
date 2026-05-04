import { Card, CardContent } from "./Card";

const Stat = ({ label, value, icon, trend, color = "primary", size = "md" }) => {
  const sizMap = {
    sm: { valueFontSize: "var(--text-xl)", labelFontSize: "var(--text-xs)" },
    md: { valueFontSize: "var(--text-2xl)", labelFontSize: "var(--text-sm)" },
    lg: { valueFontSize: "var(--text-3xl)", labelFontSize: "var(--text-base)" },
  };

  const colorMap = {
    primary: { bg: "var(--color-primary-100)", color: "var(--color-primary-500)" },
    success: { bg: "var(--color-success-100)", color: "var(--color-success-500)" },
    danger: { bg: "var(--color-danger-100)", color: "var(--color-danger-500)" },
    warning: { bg: "var(--color-warning-100)", color: "var(--color-warning-600)" },
    info: { bg: "var(--color-info-50)", color: "var(--color-info-500)" },
  };

  const { valueFontSize, labelFontSize } = sizMap[size];
  const { bg, color: iconColor } = colorMap[color];

  return (
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
          <p style={{ fontSize: labelFontSize, fontWeight: 500, color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>
            {label}
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
            <p style={{ fontSize: valueFontSize, fontWeight: 700, color: "var(--text-primary)" }}>
              {value}
            </p>
            {trend && (
              <p style={{ fontSize: "var(--text-sm)", color: trend.positive ? "var(--color-success-500)" : "var(--color-danger-500)", marginBottom: "2px" }}>
                {trend.positive ? "↑" : "↓"} {trend.value}
              </p>
            )}
          </div>
        </div>
        {icon && (
          <div
            style={{
              padding: 12,
              background: bg,
              borderRadius: "var(--radius-full)",
              color: iconColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Stat;
