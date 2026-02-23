import MarketCard from "./MarketCard";

function SectionHeader({ title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, marginTop: 8 }}>
      <span style={{ display: "block", width: 3, height: 16, background: "var(--accent)", borderRadius: 2 }} />
      <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5, textTransform: "uppercase" }}>{title}</span>
    </div>
  );
}

export default function MarketGrid({ markets, positions, onRefresh, showEmpty, onToast }) {
  return (
    <div>
      <SectionHeader title="Prediction Markets" />
      {markets.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 20, marginBottom: 40 }}>
          {markets.map(m => (
            <MarketCard
              key={m.id}
              market={m}
              userPosition={positions[m.id]}
              onRefresh={onRefresh}
              onToast={onToast}
            />
          ))}
        </div>
      ) : showEmpty && (
        <div style={{ padding: 40, textAlign: "center", border: "1px dashed var(--border2)", borderRadius: 14, color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 13, marginBottom: 40 }}>
          No markets yet — create the first one!
        </div>
      )}
    </div>
  );
}