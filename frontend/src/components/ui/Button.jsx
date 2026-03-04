const buttonVariantStyles = {
  primary: {
    background: "#2563eb",
    color: "#fff",
    boxShadow: "0 1px 2px 0 rgba(0,0,0,0.04)",
    border: "none",
  },
  secondary: {
    background: "var(--bg-card)",
    color: "var(--text-body)",
    border: "1px solid var(--border-input)",
  },
  danger: {
    background: "#dc2626",
    color: "#fff",
    border: "none",
  },
  ghost: {
    background: "transparent",
    color: "var(--text-body)",
    border: "none",
  },
  outline: {
    background: "var(--bg-card)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-primary)",
  },
};

const buttonSizeStyles = {
  sm: { padding: "6px 12px", fontSize: 14 },
  md: { padding: "8px 16px", fontSize: 16 },
  lg: { padding: "12px 24px", fontSize: 18 },
};

const Button = ({ style, variant = "primary", size = "md", ...props }) => {
  return (
    <button
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        fontWeight: 500,
        transition: "background 0.2s, color 0.2s",
        outline: "none",
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
