import { useState } from "react";

const Tabs = ({ tabs, defaultTab = 0 }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {/* Tab Navigation */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border-light)",
          gap: "0px",
          overflowX: "auto",
        }}
      >
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            style={{
              padding: "12px 20px",
              background: activeTab === idx ? "transparent" : "transparent",
              border: "none",
              borderBottom: activeTab === idx ? "2px solid var(--color-primary-500)" : "2px solid transparent",
              cursor: "pointer",
              fontSize: "var(--text-sm)",
              fontWeight: activeTab === idx ? 600 : 500,
              color: activeTab === idx ? "var(--color-primary-500)" : "var(--text-muted)",
              transition: "all var(--transition-base)",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== idx) {
                e.currentTarget.style.color = "var(--text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== idx) {
                e.currentTarget.style.color = "var(--text-muted)";
              }
            }}
          >
            {tab.icon && <span style={{ marginRight: "6px" }}>{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ marginTop: "var(--space-6)" }}>
        {tabs[activeTab]?.content}
      </div>
    </div>
  );
};

export default Tabs;
