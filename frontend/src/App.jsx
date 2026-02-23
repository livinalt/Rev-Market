
import { useState, useEffect } from "react";
import { createThirdwebClient, getContract, readContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { useActiveAccount } from "thirdweb/react";
import Header from "./components/Header";
import StatsBar from "./components/StatsBar";
import MarketGrid from "./components/MarketGrid";
import TabNav from "./components/TabNav";
import CreateMarketModal from "./components/CreateMarketModal";
import Toast from "./components/Toast";
import { CLIENT_ID, PM_ADDRESS, EM_ADDRESS, PM_ABI, EM_ABI } from "./lib/contracts";

export const client = createThirdwebClient({ clientId: CLIENT_ID });

export default function App() {
  const account = useActiveAccount();
  const [pmMarkets, setPmMarkets]   = useState([]);
  const [emMarkets, setEmMarkets]   = useState([]);
  const [pmPositions, setPmPos]     = useState({});
  const [emPositions, setEmPos]     = useState({});
  const [loading, setLoading]       = useState(false);
  const [activeTab, setActiveTab]   = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast]           = useState(null);

  function showToast(msg, kind = "info") {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3500);
  }

  async function loadMarkets() {
    setLoading(true);
    try {
      const pmContract = getContract({ client, chain: baseSepolia, address: PM_ADDRESS, abi: PM_ABI });
      const emContract = getContract({ client, chain: baseSepolia, address: EM_ADDRESS, abi: EM_ABI });

      const [pmTotal, emTotal] = await Promise.all([
        readContract({ contract: pmContract, method: "nextMarketId" }),
        readContract({ contract: emContract, method: "nextMarketId" }),
      ]);

      const pmData = await Promise.all(
        Array.from({ length: Number(pmTotal) }, (_, i) =>
          readContract({ contract: pmContract, method: "markets", params: [BigInt(i)] })
            .then(m => ({ ...m, id: i }))
        )
      );

      const emData = await Promise.all(
        Array.from({ length: Number(emTotal) }, (_, i) =>
          readContract({ contract: emContract, method: "markets", params: [BigInt(i)] })
            .then(m => ({ ...m, id: i }))
        )
      );

      setPmMarkets(pmData);
      setEmMarkets(emData);

      if (account?.address) {
        await loadPositions(pmData, emData, pmContract, emContract, account.address);
      }
    } catch (e) {
      console.error("Load failed:", e);
      showToast("Failed to load markets", "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadPositions(pmData, emData, pmContract, emContract, addr) {
    const pmPos = {};
    await Promise.all(pmData.map(async m => {
      const [above, below] = await Promise.all([
        readContract({ contract: pmContract, method: "positions", params: [BigInt(m.id), addr, 0] }),
        readContract({ contract: pmContract, method: "positions", params: [BigInt(m.id), addr, 1] }),
      ]);
      if (Number(above) > 0 || Number(below) > 0)
        pmPos[m.id] = { above: Number(above), below: Number(below) };
    }));
    setPmPos(pmPos);

    const emPos = {};
    await Promise.all(emData.map(async m => {
      const [yes, no] = await Promise.all([
        readContract({ contract: emContract, method: "positions", params: [BigInt(m.id), addr, 0] }),
        readContract({ contract: emContract, method: "positions", params: [BigInt(m.id), addr, 1] }),
      ]);
      if (Number(yes) > 0 || Number(no) > 0)
        emPos[m.id] = { yes: Number(yes), no: Number(no) };
    }));
    setEmPos(emPos);
  }

  useEffect(() => { loadMarkets(); }, [account?.address]);

  const addr = account?.address?.toLowerCase();

  function getCreatedMarkets() {
    if (!addr) return { pm: [], em: [] };
    const created = JSON.parse(localStorage.getItem(`created_${addr}`) || "[]");
    return {
      pm: pmMarkets.filter(m => created.includes(`pm_${m.id}`)),
      em: emMarkets.filter(m => created.includes(`em_${m.id}`)),
    };
  }

  function getPositionMarkets() {
    return {
      pm: pmMarkets.filter(m => pmPositions[m.id]),
      em: emMarkets.filter(m => emPositions[m.id]),
    };
  }

  const created   = getCreatedMarkets();
  const positions = getPositionMarkets();

  const counts = {
    all:       pmMarkets.length + emMarkets.length,
    mine:      created.pm.length + created.em.length,
    positions: positions.pm.length + positions.em.length,
  };

  function getDisplay() {
    if (activeTab === "mine")      return created;
    if (activeTab === "positions") return positions;
    return { pm: pmMarkets, em: emMarkets };
  }

  function handleMarketCreated(type, id) {
    if (!addr) return;
    const key = `created_${addr}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    if (!existing.includes(`${type}_${id}`)) existing.push(`${type}_${id}`);
    localStorage.setItem(key, JSON.stringify(existing));
  }

  const display   = getDisplay();
  const totalVol  = [...pmMarkets, ...emMarkets].reduce((acc, m) => acc + Number(m[2]||0) + Number(m[3]||0), 0);
  const openCount = [...pmMarkets, ...emMarkets].filter(m => Number(m[5]) === 0).length;

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      {/* Orbs */}
      <div style={{ position: "fixed", width: 500, height: 500, borderRadius: "50%", background: "rgba(124,106,247,0.07)", filter: "blur(80px)", top: -200, left: -100, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", width: 400, height: 400, borderRadius: "50%", background: "rgba(34,211,165,0.05)", filter: "blur(80px)", bottom: -100, right: -100, pointerEvents: "none", zIndex: 0 }} />

      <Header onRefresh={loadMarkets} loading={loading} onCreateMarket={() => setShowCreate(true)} />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 32px", position: "relative", zIndex: 1 }}>
        {/* Hero */}
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

        <StatsBar total={counts.all} open={openCount} volume={totalVol} />

        {/* Tabs */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
          <TabNav active={activeTab} onChange={setActiveTab} counts={counts} />
          {!account && activeTab !== "all" && (
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
              Connect wallet to see personalised views
            </span>
          )}
        </div>

        {/* Empty states */}
        {activeTab === "mine" && counts.mine === 0 && account && (
          <div style={{ padding: 40, textAlign: "center", border: "1px dashed var(--border2)", borderRadius: 14, color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 13, marginBottom: 32 }}>
            No markets created yet.{" "}
            <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => setShowCreate(true)}>Create one →</span>
          </div>
        )}
        {activeTab === "positions" && counts.positions === 0 && account && (
          <div style={{ padding: 40, textAlign: "center", border: "1px dashed var(--border2)", borderRadius: 14, color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 13, marginBottom: 32 }}>
            No positions yet. Go to All Markets and place a bet.
          </div>
        )}

        <MarketGrid
          pmMarkets={display.pm}
          emMarkets={display.em}
          pmPositions={pmPositions}
          emPositions={emPositions}
          onRefresh={loadMarkets}
          showEmpty={activeTab === "all"}
          onToast={showToast}
        />
      </main>

      <footer style={{ borderTop: "1px solid var(--border)", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
          Foresight · CRE Prediction Market · Chainlink Convergence 2025
        </span>
        <div style={{ display: "flex", gap: 20 }}>
          {[["GitHub","https://github.com/YOUR_USERNAME/cre-prediction-market"],["Basescan","https://sepolia.basescan.org"],["Tenderly","https://dashboard.tenderly.co"]].map(([l,u]) => (
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
          onCreated={(type, id) => { handleMarketCreated(type, id); loadMarkets(); }}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
