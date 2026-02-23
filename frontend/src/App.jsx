import { useState, useEffect } from "react";
import { createThirdwebClient, getContract, readContract } from "thirdweb";
import { sepolia } from "thirdweb/chains";
import { useActiveAccount } from "thirdweb/react";
import Header from "./components/Header";
import StatsBar from "./components/StatsBar";
import MarketGrid from "./components/MarketGrid";
import CreateMarketModal from "./components/CreateMarketModal";
import Toast from "./components/Toast";
import { CLIENT_ID, MARKET_ADDRESS, MARKET_ABI } from "./lib/contracts";

export const client = createThirdwebClient({ clientId: CLIENT_ID });

const CATEGORIES = [
  { id: "all", label: "All", icon: "◈" },
  { id: "crypto", label: "Crypto", icon: "₿" },
  { id: "tech", label: "Tech & AI", icon: "⚡" },
  { id: "finance", label: "Finance", icon: "📈" },
  { id: "sports", label: "Sports", icon: "⚽" },
  { id: "geo", label: "Geopolitics", icon: "🌍" },
  { id: "mine", label: "My Markets", icon: "👤" },
  { id: "positions", label: "Positions", icon: "🎯" },
];


function categorizeMarket(question) {
  const q = question.toLowerCase();
  if (/btc|bitcoin|eth|ethereum|solana|sol|crypto|defi|chainlink|link|token|blockchain|nft|web3|dex|tvl|gas|gwei/.test(q)) return "crypto";
  if (/openai|gpt|ai|apple|google|meta|tesla|self.driving|autonomous|siri|gemini|llm|model/.test(q)) return "tech";
  if (/s&p|nasdaq|stock|fed|inflation|interest rate|dollar|gold|market cap|gdp|recession|bond/.test(q)) return "finance";
  if (/football|soccer|nba|nfl|nhl|mlb|champions|league|cup|playoff|win|score|season/.test(q)) return "sports";
  if (/war|election|president|government|policy|trade deal|nato|eu|uk|china|russia|deal|sanction/.test(q)) return "geo";
  return "crypto";
}

export default function App() {
  const account = useActiveAccount();
  const [markets, setMarkets] = useState([]);
  const [positions, setPositions] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState(null);
  const [worldIdVerified, setWorldIdVerified] = useState(false);

  function showToast(msg, kind = "info") {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3500);
  }

  async function loadMarkets() {
    setLoading(true);
    try {
      const contract = getContract({ client, chain: sepolia, address: MARKET_ADDRESS, abi: MARKET_ABI });
      const total = await readContract({ contract, method: "getNextMarketId" });

      const marketData = await Promise.all(
        Array.from({ length: Number(total) }, (_, i) =>
          readContract({ contract, method: "getMarket", params: [BigInt(i)] })
            .then(m => ({
              id: i,
              creator: m.creator,
              createdAt: Number(m.createdAt),
              settledAt: Number(m.settledAt),
              settled: m.settled,
              confidence: Number(m.confidence),
              outcome: Number(m.outcome),
              totalYesPool: m.totalYesPool,
              totalNoPool: m.totalNoPool,
              question: m.question,
              category: categorizeMarket(m.question),
            }))
        )
      );

      setMarkets(marketData);
      if (account?.address) await loadPositions(marketData, contract, account.address);
    } catch (e) {
      console.error("Load failed:", e);
      showToast("Failed to load markets", "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadPositions(marketData, contract, addr) {
    const pos = {};
    await Promise.all(marketData.map(async m => {
      const pred = await readContract({ contract, method: "getPrediction", params: [BigInt(m.id), addr] });
      if (Number(pred.amount) > 0) {
        pos[m.id] = { amount: Number(pred.amount), prediction: Number(pred.prediction), claimed: pred.claimed };
      }
    }));
    setPositions(pos);
  }

  useEffect(() => { loadMarkets(); }, [account?.address]);

  const addr = account?.address?.toLowerCase();

  function getCreatedMarkets() {
    if (!addr) return [];
    const created = JSON.parse(localStorage.getItem(`created_${addr}`) || "[]");
    return markets.filter(m => created.includes(`m_${m.id}`));
  }

  function handleMarketCreated(id) {
    if (!addr) return;
    const key = `created_${addr}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    if (!existing.includes(`m_${id}`)) existing.push(`m_${id}`);
    localStorage.setItem(key, JSON.stringify(existing));
  }

  const created = getCreatedMarkets();
  const positionMkts = markets.filter(m => positions[m.id]);

  function getDisplay() {
    if (activeTab === "mine") return created;
    if (activeTab === "positions") return positionMkts;
    if (activeTab === "all") return markets;
    return markets.filter(m => m.category === activeTab);
  }

  const display = getDisplay();
  const totalVol = markets.reduce((acc, m) => acc + Number(m.totalYesPool || 0) + Number(m.totalNoPool || 0), 0);
  const openCount = markets.filter(m => !m.settled).length;

  const categoryCounts = {
    all: markets.length,
    crypto: markets.filter(m => m.category === "crypto").length,
    tech: markets.filter(m => m.category === "tech").length,
    finance: markets.filter(m => m.category === "finance").length,
    sports: markets.filter(m => m.category === "sports").length,
    geo: markets.filter(m => m.category === "geo").length,
    mine: created.length,
    positions: positionMkts.length,
  };

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      {/* Orbs */}
      <div style={{ position: "fixed", width: 500, height: 500, borderRadius: "50%", background: "rgba(124,106,247,0.07)", filter: "blur(80px)", top: -200, left: -100, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", width: 400, height: 400, borderRadius: "50%", background: "rgba(34,211,165,0.05)", filter: "blur(80px)", bottom: -100, right: -100, pointerEvents: "none", zIndex: 0 }} />

      <Header onRefresh={loadMarkets} loading={loading} onCreateMarket={() => setShowCreate(true)} />

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 32px 60px", position: "relative", zIndex: 1 }}>

        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "block", width: 24, height: 1, background: "var(--accent)" }} />
            Chainlink CRE · Automated Settlement
          </div>
          <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.1, marginBottom: 10 }}>
            Predict the Future,{" "}
            <br />
            <span style={{ background: "linear-gradient(135deg,#7c6af7,#22d3a5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Settle On-Chain
            </span>
          </h1>
          <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: 480, lineHeight: 1.7 }}>
            Markets on ETH prices and real-world events. All outcomes resolved automatically by Chainlink CRE — no admins, no delays.
          </p>
        </div>

        <StatsBar total={markets.length} open={openCount} volume={totalVol} />

        {/* ── Main row: category rail + market grid ── */}
        <div style={{ display: "flex", gap: 0, marginTop: 32, alignItems: "flex-start", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>

          {/* Category rail — fixed width, scrollable vertically */}
          <div style={{
            width: 180, flexShrink: 0,
            borderRight: "1px solid var(--border)",
            background: "var(--surface)",
            position: "sticky", top: 80,
            maxHeight: "calc(100vh - 120px)",
            overflowY: "auto",
            padding: "12px 8px",
            display: "flex", flexDirection: "column", gap: 2,
            alignSelf: "flex-start",
          }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1.5, padding: "4px 8px 10px" }}>
              Browse
            </div>

            {CATEGORIES.map(cat => {
              const isActive = activeTab === cat.id;
              const count = categoryCounts[cat.id] ?? 0;
              const isPersonal = cat.id === "mine" || cat.id === "positions";
              if (isPersonal && !account) return null;

              return (
                <div
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                    background: isActive ? "rgba(124,106,247,0.12)" : "transparent",
                    border: `1px solid ${isActive ? "rgba(124,106,247,0.25)" : "transparent"}`,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, lineHeight: 1 }}>{cat.icon}</span>
                    <span style={{
                      fontFamily: "var(--mono)", fontSize: 11,
                      color: isActive ? "var(--text)" : "var(--muted)",
                      fontWeight: isActive ? 700 : 400,
                    }}>{cat.label}</span>
                  </div>
                  {count > 0 && (
                    <span style={{
                      fontFamily: "var(--mono)", fontSize: 9,
                      color: isActive ? "#a78bfa" : "var(--muted)",
                      background: isActive ? "rgba(124,106,247,0.15)" : "rgba(255,255,255,0.05)",
                      padding: "1px 5px", borderRadius: 99,
                      border: `1px solid ${isActive ? "rgba(124,106,247,0.2)" : "var(--border)"}`,
                    }}>{count}</span>
                  )}
                </div>
              );
            })}

            {/* Divider + New Market */}
            <div style={{ borderTop: "1px solid var(--border)", margin: "8px 0" }} />
            <div
              onClick={() => setShowCreate(true)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                background: "rgba(34,211,165,0.06)",
                border: "1px solid rgba(34,211,165,0.15)",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(34,211,165,0.12)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(34,211,165,0.06)"}
            >
              <span style={{ fontSize: 14 }}>＋</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#22d3a5", fontWeight: 700 }}>New Market</span>
            </div>
          </div>

          {/* Market grid — takes remaining width, scrolls with page */}
          <div style={{ flex: 1, minWidth: 0, padding: "20px 20px", background: "var(--bg)" }}>

            {/* Category heading */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>
                  {CATEGORIES.find(c => c.id === activeTab)?.icon}
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>
                  {CATEGORIES.find(c => c.id === activeTab)?.label}
                </span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: 99 }}>
                  {display.length} market{display.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Empty states */}
            {activeTab === "mine" && created.length === 0 && account && (
              <div style={{ padding: 40, textAlign: "center", border: "1px dashed var(--border2)", borderRadius: 14, color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 13 }}>
                No markets created yet.{" "}
                <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => setShowCreate(true)}>Create one →</span>
              </div>
            )}
            {activeTab === "positions" && positionMkts.length === 0 && account && (
              <div style={{ padding: 40, textAlign: "center", border: "1px dashed var(--border2)", borderRadius: 14, color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 13 }}>
                No positions yet. Browse markets and place a prediction.
              </div>
            )}
            {display.length === 0 && activeTab !== "mine" && activeTab !== "positions" && (
              <div style={{ padding: 40, textAlign: "center", border: "1px dashed var(--border2)", borderRadius: 14, color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 13 }}>
                No {CATEGORIES.find(c => c.id === activeTab)?.label.toLowerCase()} markets yet.{" "}
                <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => setShowCreate(true)}>Create one →</span>
              </div>
            )}

            <MarketGrid
              markets={display}
              positions={positions}
              onRefresh={loadMarkets}
              showEmpty={false}
              onToast={showToast}
              worldIdVerified={worldIdVerified}
              onWorldIdVerified={() => setWorldIdVerified(true)}
            />

          </div>
        </div>
      </main>

      <footer style={{ borderTop: "1px solid var(--border)", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
          Foresight · CRE Prediction Market · Chainlink Convergence 2026
        </span>
        <div style={{ display: "flex", gap: 20 }}>
          {[
            ["GitHub", "https://github.com/livinalt/cre-prediction-market-2.git"],
            ["Etherscan", "https://sepolia.etherscan.io/address/0xf34c4C6eE65ddbD0C71D4313B774726b280590e9"],
            ["Tenderly", "https://dashboard.tenderly.co/Jerly/cx/testnet/6b716f89-d035-49ad-a3c2-a6f63fc442b0"],
          ].map(([l, u]) => (
            <a key={l} href={u} target="_blank" rel="noreferrer"
              style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", textDecoration: "none" }}
              onMouseEnter={e => e.target.style.color = "var(--accent2)"}
              onMouseLeave={e => e.target.style.color = "var(--muted)"}
            >{l} ↗</a>
          ))}
        </div>
      </footer>

      {showCreate && (
        <CreateMarketModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => { handleMarketCreated(id); loadMarkets(); }}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}