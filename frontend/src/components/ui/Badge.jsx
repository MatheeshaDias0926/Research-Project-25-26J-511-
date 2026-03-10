const badgeVariantStyles = {
  default: {
<<<<<<< HEAD
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
=======
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
>>>>>>> main
  },
};

const Badge = ({ style, variant = "default", ...props }) => {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
<<<<<<< HEAD
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
=======
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
>>>>>>> main
      {...props}
    />
  );
};

export default Badge;
