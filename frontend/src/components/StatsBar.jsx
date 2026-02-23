export default function StatsBar({ total, open, volume }) {
  const stats = [
    { label: "Markets", value: total ?? "—" },
    { label: "Open", value: open ?? "—" },
    {
      label: "Volume",
      value: volume
        ? (volume / 1e18).toFixed(2) + " ETH"
        : "—",
    },
    { label: "Settlement", value: "CRE" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        overflow: "hidden",
        marginBottom: 24,
        background: "var(--surface)",
      }}
    >
      {stats.map((s, i) => (
        <div
          key={i}
          style={{
            padding: "12px 16px",
            borderRight:
              i !== stats.length - 1
                ? "1px solid var(--border)"
                : "none",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "var(--muted)",
              fontFamily: "var(--mono)",
              letterSpacing: 0.8,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            {s.label}
          </span>

          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: -0.3,
              color: "var(--text)",
            }}
          >
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}