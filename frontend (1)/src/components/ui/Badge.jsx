const badgeVariantStyles = {
  default: {
    background: "#dbeafe",
    color: "#1e40af",
    border: "1px solid #93c5fd",
  },
  success: {
    background: "#bbf7d0",
    color: "#166534",
    border: "1px solid #86efac",
  },
  warning: {
    background: "#fef9c3",
    color: "#a16207",
    border: "1px solid #fde68a",
  },
  danger: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
  },
  secondary: {
    background: "#f1f5f9",
    color: "#334155",
    border: "1px solid #cbd5e1",
  },
};

const Badge = ({ style, variant = "default", ...props }) => {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 9999,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 600,
        transition: "background 0.2s, color 0.2s",
        outline: "none",
        ...badgeVariantStyles[variant],
        ...style,
      }}
      tabIndex={0}
      {...props}
    />
  );
};

export default Badge;
