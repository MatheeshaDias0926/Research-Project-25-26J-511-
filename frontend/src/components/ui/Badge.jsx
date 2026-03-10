const badgeVariantStyles = {
  default: {
    background: "var(--color-primary-100)",
    color: "var(--color-primary-800)",
    border: "1px solid var(--color-primary-200)",
  },
  success: {
    background: "var(--color-success-100)",
    color: "var(--color-success-700)",
    border: "1px solid #bbf7d0",
  },
  warning: {
    background: "var(--color-warning-100)",
    color: "var(--color-warning-700)",
    border: "1px solid #fde68a",
  },
  danger: {
    background: "var(--color-danger-100)",
    color: "var(--color-danger-700)",
    border: "1px solid #fecaca",
  },
  error: {
    background: "var(--color-danger-100)",
    color: "var(--color-danger-700)",
    border: "1px solid #fecaca",
  },
  secondary: {
    background: "var(--color-slate-100)",
    color: "var(--color-slate-700)",
    border: "1px solid var(--color-slate-300)",
  },
};

const Badge = ({ style, variant = "default", ...props }) => {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "var(--radius-full)",
        padding: "2px 10px",
        fontSize: "var(--text-xs)",
        fontWeight: 600,
        letterSpacing: "0.01em",
        transition: "all var(--transition-fast)",
        outline: "none",
        whiteSpace: "nowrap",
        ...badgeVariantStyles[variant],
        ...style,
      }}
      {...props}
    />
  );
};

export default Badge;
