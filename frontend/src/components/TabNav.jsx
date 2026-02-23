export default function TabNav({ active, onChange, counts }) {
  const tabs = [
    { key: "all",      label: "All Markets",  count: counts.all      },
    { key: "mine",     label: "My Markets",   count: counts.mine     },
    { key: "positions",label: "My Positions", count: counts.positions },
  ];

  return (
    <div style={{
      display: "flex", gap: 4, marginBottom: 28,
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 10, padding: 4, width: "fit-content"
    }}>
      {tabs.map(t => (
        <div key={t.key} onClick={() => onChange(t.key)}
          style={{
            padding: "8px 18px", borderRadius: 8, cursor: "pointer",
            fontFamily: "var(--mono)", fontSize: 12, fontWeight: active === t.key ? 700 : 400,
            background: active === t.key ? "var(--surface2)" : "transparent",
            color: active === t.key ? "var(--text)" : "var(--muted)",
            border: active === t.key ? "1px solid var(--border2)" : "1px solid transparent",
            transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8,
            userSelect: "none"
          }}
        >
          {t.label}
          {t.count > 0 && (
            <span style={{
              background: active === t.key ? "var(--accent)" : "var(--border2)",
              color: active === t.key ? "white" : "var(--muted)",
              borderRadius: 99, padding: "1px 7px", fontSize: 10, fontWeight: 700
            }}>{t.count}</span>
          )}
        </div>
      ))}
    </div>
  );
}
