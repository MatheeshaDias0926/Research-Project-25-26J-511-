const Table = ({ columns, data, loading = false, empty, striped = true }) => {
  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
        Loading...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
        {empty || "No data available"}
      </div>
    );
  }

  return (
    <div
      style={{
        overflowX: "auto",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-light)",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "var(--text-sm)",
        }}
      >
        <thead>
          <tr
            style={{
              background: "var(--bg-subtle)",
              borderBottom: "1px solid var(--border-light)",
            }}
          >
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: "12px 16px",
                  textAlign: col.align || "left",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  minWidth: col.width || "auto",
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              style={{
                background: striped && idx % 2 === 1 ? "var(--bg-subtle)" : "transparent",
                borderBottom: "1px solid var(--border-light)",
                transition: "background var(--transition-base)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-subtle)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = striped && idx % 2 === 1 ? "var(--bg-subtle)" : "transparent";
              }}
            >
              {columns.map((col) => (
                <td
                  key={`${idx}-${col.key}`}
                  style={{
                    padding: "12px 16px",
                    textAlign: col.align || "left",
                    color: "var(--text-primary)",
                  }}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
