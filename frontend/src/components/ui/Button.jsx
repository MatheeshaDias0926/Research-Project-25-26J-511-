const buttonVariantStyles = {
  primary: {
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
  },
};

const buttonSizeStyles = {
  sm: { padding: "6px 14px", fontSize: "var(--text-sm)", gap: 6 },
  md: { padding: "8px 18px", fontSize: "var(--text-base)", gap: 8 },
  lg: { padding: "12px 24px", fontSize: "var(--text-md)", gap: 8 },
};

const Button = ({ style, variant = "primary", size = "md", ...props }) => {
  return (
    <button
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--radius-md)",
        fontWeight: 600,
        letterSpacing: "0.01em",
        transition: "all var(--transition-base)",
        outline: "none",
        cursor: props.disabled ? "not-allowed" : "pointer",
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
