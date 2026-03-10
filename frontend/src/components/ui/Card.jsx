const cardBaseStyle = {
<<<<<<< HEAD
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  boxShadow: "0 1px 2px 0 rgba(0,0,0,0.04)",
};

const Card = ({ style, children, ...props }) => {
  return (
    <div style={{ ...cardBaseStyle, ...style }} {...props}>
=======
  borderRadius: "var(--radius-xl)",
  border: "1px solid var(--border-light)",
  background: "var(--bg-surface)",
  color: "var(--text-primary)",
  boxShadow: "var(--shadow-sm)",
  transition: "box-shadow var(--transition-base), border-color var(--transition-base)",
};

const Card = ({ style, hover, children, ...props }) => {
  const hoverHandlers = hover
    ? {
        onMouseEnter: (e) => {
          e.currentTarget.style.boxShadow = "var(--shadow-md)";
          e.currentTarget.style.borderColor = "var(--border-medium)";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.boxShadow = "var(--shadow-sm)";
          e.currentTarget.style.borderColor = "var(--border-light)";
        },
      }
    : {};
  return (
    <div style={{ ...cardBaseStyle, ...style }} {...hoverHandlers} {...props}>
>>>>>>> main
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
<<<<<<< HEAD
      padding: 24,
=======
      padding: "var(--space-6)",
>>>>>>> main
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
<<<<<<< HEAD
      letterSpacing: "-0.01em",
=======
      letterSpacing: "-0.02em",
      color: "var(--text-primary)",
>>>>>>> main
      ...style,
    }}
    {...props}
  >
    {children}
  </h3>
);

const CardContent = ({ style, children, ...props }) => (
<<<<<<< HEAD
  <div style={{ padding: 24, paddingTop: 0, ...style }} {...props}>
=======
  <div style={{ padding: "var(--space-6)", paddingTop: 0, ...style }} {...props}>
>>>>>>> main
    {children}
  </div>
);

export { Card, CardHeader, CardTitle, CardContent };
