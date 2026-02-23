import MarketCard from "./MarketCard";

export default function MarketGrid({ markets, positions, onRefresh, showEmpty, onToast, worldIdVerified, onWorldIdVerified }) {
  return (
    <div>
      {markets.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {markets.map(m => (
            <MarketCard
              key={m.id}
              market={m}
              userPosition={positions[m.id]}
              onRefresh={onRefresh}
              onToast={onToast}
              worldIdVerified={worldIdVerified}
              onWorldIdVerified={onWorldIdVerified}
            />
          ))}
        </div>
      ) : showEmpty && (
        <div style={{ padding: 40, textAlign: "center", border: "1px dashed var(--border2)", borderRadius: 14, color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 13 }}>
          No markets yet — create the first one!
        </div>
      )}
    </div>
  );
}