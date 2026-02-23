import MarketCard from "./MarketCard";

function SectionHeader({ title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, marginTop: 8 }}>
      <span style={{ display: "block", width: 3, height: 16, background: "var(--accent)", borderRadius: 2 }} />
      <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 1.5, textTransform: "uppercase" }}>{title}</span>
    </div>
  );
}

export default function MarketGrid({ pmMarkets, emMarkets, pmPositions, emPositions, onRefresh, showEmpty }) {
  return (
    <div>
      {(pmMarkets.length > 0 || showEmpty) && <SectionHeader title="Price Markets" />}
      {pmMarkets.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16, marginBottom: 40 }}>
          {pmMarkets.map(m => (
            <MarketCard key={m.id} market={m} type="price" userPosition={pmPositions[m.id]} onRefresh={onRefresh} />
          ))}
        </div>
      ) : showEmpty && (
        <div style={{ padding: 40, textAlign: "center", border: "1px dashed var(--border2)", borderRadius: 14, color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 13, marginBottom: 40 }}>
          No price markets yet
        </div>
      )}

      {(emMarkets.length > 0 || showEmpty) && <SectionHeader title="Event Markets" />}
      {emMarkets.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16, marginBottom: 40 }}>
          {emMarkets.map(m => (
            <MarketCard key={m.id} market={m} type="event" userPosition={emPositions[m.id]} onRefresh={onRefresh} />
          ))}
        </div>
      ) : showEmpty && (
        <div style={{ padding: 40, textAlign: "center", border: "1px dashed var(--border2)", borderRadius: 14, color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 13, marginBottom: 40 }}>
          No event markets yet
        </div>
      )}
    </div>
  );
}
