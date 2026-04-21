import { X } from "lucide-react";

const Modal = ({ isOpen, onClose, title, children, size = "md", footer }) => {
  if (!isOpen) return null;

  const sizeStyles = {
    sm: "max-width: 400px",
    md: "max-width: 600px",
    lg: "max-width: 900px",
    xl: "max-width: 1200px",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        animation: "fadeIn 0.3s ease-out",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-xl)",
          width: "90%",
          [sizeStyles[size]]: true,
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          overflow: "hidden",
          animation: "slideUp 0.3s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--space-6)",
            borderBottom: "1px solid var(--border-light)",
          }}
        >
          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--text-primary)" }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--radius-md)",
              color: "var(--text-muted)",
              transition: "all var(--transition-base)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-subtle)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "var(--space-6)",
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: "var(--space-6)",
              borderTop: "1px solid var(--border-light)",
              display: "flex",
              gap: "var(--space-3)",
              justifyContent: "flex-end",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
