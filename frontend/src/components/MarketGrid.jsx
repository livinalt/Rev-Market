import MarketCard from "./MarketCard";

export default function MarketGrid({ markets, positions, onRefresh, showEmpty, onToast, isMobile, isTablet }) {

  // Responsive columns:
  const cols = isMobile ? 1 : isTablet ? 2 : 3;

  if (!markets.length && showEmpty) {
    return (
      <div style={{ padding: 40, textAlign: "center", border: "1px dashed var(--border2)", borderRadius: 14, color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 13 }}>
        No markets yet — create the first one!
      </div>
    );
  }

  if (!markets.length) return null;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: isMobile ? 8 : 10,
    }}>
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
  );
}