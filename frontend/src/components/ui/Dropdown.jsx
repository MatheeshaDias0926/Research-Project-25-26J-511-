import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const Dropdown = ({ label, items, value, onChange, placeholder = "Select...", disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedItem = items.find((item) => item.value === value);

  return (
    <div style={{ position: "relative", width: "100%" }} ref={containerRef}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: "var(--space-2)",
          }}
        >
          {label}
        </label>
      )}

      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          width: "100%",
          padding: "10px 14px",
          border: `1px solid ${isOpen ? "var(--color-primary-500)" : "var(--border-light)"}`,
          borderRadius: "var(--radius-md)",
          background: disabled ? "var(--bg-subtle)" : "var(--bg-surface)",
          color: selectedItem ? "var(--text-primary)" : "var(--text-muted)",
          fontSize: "var(--text-sm)",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "all var(--transition-base)",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span>{selectedItem ? selectedItem.label : placeholder}</span>
        <ChevronDown
          size={18}
          style={{
            transition: "transform var(--transition-base)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "4px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-md)",
            zIndex: 999,
            animation: "slideDown 0.2s ease-out",
          }}
        >
          {items.map((item) => (
            <button
              key={item.value}
              onClick={() => {
                onChange(item.value);
                setIsOpen(false);
              }}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "none",
                background: value === item.value ? "var(--bg-subtle)" : "transparent",
                color: value === item.value ? "var(--color-primary-500)" : "var(--text-primary)",
                fontSize: "var(--text-sm)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all var(--transition-base)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-subtle)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = value === item.value ? "var(--bg-subtle)" : "transparent";
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
