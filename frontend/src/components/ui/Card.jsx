const cardBaseStyle = {
  borderRadius: 16,
  border: "1px solid var(--border-secondary)",
  background: "var(--bg-card)",
  color: "var(--text-primary)",
  boxShadow: "var(--shadow-card)",
  transition: "background 0.2s, border-color 0.2s, color 0.2s",
};

const Card = ({ style, children, ...props }) => {
  return (
    <div style={{ ...cardBaseStyle, ...style }} {...props}>
      {children}
    </div>
  );
};

const CardHeader = ({ style, children, ...props }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 6,
      padding: 24,
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
);

const CardTitle = ({ style, children, ...props }) => (
  <h3
    style={{
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: "-0.01em",
      ...style,
    }}
    {...props}
  >
    {children}
  </h3>
);

const CardContent = ({ style, children, ...props }) => (
  <div style={{ padding: 24, paddingTop: 0, ...style }} {...props}>
    {children}
  </div>
);

export { Card, CardHeader, CardTitle, CardContent };
