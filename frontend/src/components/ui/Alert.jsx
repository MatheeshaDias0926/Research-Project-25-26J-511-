import { AlertTriangle, AlertCircle, CheckCircle, Info, X } from "lucide-react";

const alertStyles = {
  success: {
    bg: "var(--color-success-50)",
    border: "var(--color-success-200)",
    text: "var(--color-success-800)",
    icon: <CheckCircle size={20} />,
  },
  error: {
    bg: "var(--color-danger-50)",
    border: "var(--color-danger-200)",
    text: "var(--color-danger-800)",
    icon: <AlertTriangle size={20} />,
  },
  warning: {
    bg: "var(--color-warning-50)",
    border: "var(--color-warning-200)",
    text: "var(--color-warning-800)",
    icon: <AlertCircle size={20} />,
  },
  info: {
    bg: "var(--color-info-50)",
    border: "var(--color-info-200)",
    text: "var(--color-info-800)",
    icon: <Info size={20} />,
  },
};

const Alert = ({ type = "info", title, message, onClose, closable = true }) => {
  const style = alertStyles[type];

  return (
    <div
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: "var(--radius-md)",
        padding: "16px",
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        color: style.text,
        animation: "slideDown 0.3s ease-out",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginTop: "2px",
          flexShrink: 0,
        }}
      >
        {style.icon}
      </div>
      <div style={{ flex: 1 }}>
        {title && (
          <div
            style={{
              fontWeight: 600,
              fontSize: "var(--text-sm)",
              marginBottom: "4px",
            }}
          >
            {title}
          </div>
        )}
        {message && (
          <div style={{ fontSize: "var(--text-sm)" }}>{message}</div>
        )}
      </div>
      {closable && (
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "inherit",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};

export default Alert;
