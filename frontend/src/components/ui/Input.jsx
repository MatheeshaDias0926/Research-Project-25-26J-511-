import { forwardRef } from "react";

const inputBaseStyle = {
  display: "flex",
  height: 42,
  width: "100%",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-light)",
  background: "var(--bg-surface)",
  padding: "8px 14px",
  fontSize: "var(--text-base)",
  color: "var(--text-primary)",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color var(--transition-base), box-shadow var(--transition-base)",
};

const Input = forwardRef(({ style, type, ...props }, ref) => {
  return (
    <input
      type={type}
      style={{ ...inputBaseStyle, ...style }}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";

export default Input;
