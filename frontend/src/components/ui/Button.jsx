const buttonVariantStyles = {
  primary: {
<<<<<<< HEAD
    background: "#2563eb",
    color: "#fff",
    boxShadow: "0 1px 2px 0 rgba(0,0,0,0.04)",
    border: "none",
  },
  secondary: {
    background: "#fff",
    color: "#334155",
    border: "1px solid #d1d5db",
  },
  danger: {
    background: "#dc2626",
    color: "#fff",
    border: "none",
  },
  ghost: {
    background: "transparent",
    color: "#334155",
    border: "none",
  },
  outline: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #e2e8f0",
=======
    background: "linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700))",
    color: "#fff",
    boxShadow: "0 1px 3px rgba(37, 99, 235, 0.3), var(--shadow-xs)",
    border: "none",
  },
  secondary: {
    background: "var(--bg-surface)",
    color: "var(--color-slate-700)",
    border: "1px solid var(--border-light)",
    boxShadow: "var(--shadow-xs)",
  },
  danger: {
    background: "linear-gradient(135deg, var(--color-danger-600), var(--color-danger-700))",
    color: "#fff",
    border: "none",
    boxShadow: "0 1px 3px rgba(220, 38, 38, 0.3)",
  },
  ghost: {
    background: "transparent",
    color: "var(--color-slate-700)",
    border: "none",
  },
  outline: {
    background: "var(--bg-surface)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-light)",
>>>>>>> main
  },
};

const buttonSizeStyles = {
<<<<<<< HEAD
  sm: { padding: "6px 12px", fontSize: 14 },
  md: { padding: "8px 16px", fontSize: 16 },
  lg: { padding: "12px 24px", fontSize: 18 },
=======
  sm: { padding: "6px 14px", fontSize: "var(--text-sm)", gap: 6 },
  md: { padding: "8px 18px", fontSize: "var(--text-base)", gap: 8 },
  lg: { padding: "12px 24px", fontSize: "var(--text-md)", gap: 8 },
>>>>>>> main
};

const Button = ({ style, variant = "primary", size = "md", ...props }) => {
  return (
    <button
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
<<<<<<< HEAD
        borderRadius: 8,
        fontWeight: 500,
        transition: "background 0.2s, color 0.2s",
        outline: "none",
=======
        borderRadius: "var(--radius-md)",
        fontWeight: 600,
        letterSpacing: "0.01em",
        transition: "all var(--transition-base)",
        outline: "none",
        cursor: props.disabled ? "not-allowed" : "pointer",
>>>>>>> main
        opacity: props.disabled ? 0.5 : 1,
        pointerEvents: props.disabled ? "none" : "auto",
        ...buttonVariantStyles[variant],
        ...buttonSizeStyles[size],
        ...style,
      }}
      {...props}
    />
  );
};

export default Button;
