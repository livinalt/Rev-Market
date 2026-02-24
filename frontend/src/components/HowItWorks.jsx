import { useState, useEffect } from "react";

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);
  return width;
}

const steps = [
  "User clicks ⚡ Request AI Settlement on any open market",
  "requestSettlement() emits SettlementRequested event on-chain",
  "Chainlink CRE Log Trigger detects the event on Ethereum Sepolia",
  "CRE reads market state: question, pools, settled status",
  "Google Gemini AI returns YES or NO with confidence score",
  "CRE writes signed settlement report back via onReport()",
  "Winners claim proportional ETH payout from the pool",
];

const techItems = [
  { label: "PredictionMarket.sol", desc: "Single contract — markets, predictions, payouts", color: "rgb(136, 102, 255)", bg: "rgba(136, 102, 255, 0.06)", border: "rgba(136, 102, 255, 0.18)" },
  { label: "Chainlink CRE",        desc: "EVM Log Trigger → TypeScript workflow → EVM Write", color: "#fbbf24", bg: "rgba(251,191,36,0.06)", border: "rgba(251,191,36,0.18)" },
  { label: "Google Gemini AI",     desc: "Queries question → YES / NO + confidence %", color: "#22d3a5", bg: "rgba(34,211,165,0.05)", border: "rgba(34,211,165,0.14)" },
  { label: "Thirdweb + React",     desc: "Frontend wallet connection + contract calls", color: "#a78bfa", bg: "rgba(167,139,250,0.06)", border: "rgba(167,139,250,0.18)" },
];

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "flow",     label: "Settlement Flow" },
  { id: "tech",     label: "Tech Stack" },
];

export default function HowItWorksModal({ onClose }) {
  const [activeTab, setActiveTab] = useState("overview");
  const width    = useWindowWidth();
  const isMobile = width < 640;

  // Close on Escape key
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : "1.5rem",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--surface, #0d1117)",
        border: "1px solid var(--border2, #30363d)",
        // Mobile: full-width bottom sheet, Desktop: centered modal
        borderRadius: isMobile ? "14px 14px 0 0" : 12,
        width: "100%",
        maxWidth: isMobile ? "100%" : 860,
        // Mobile: 90vh sheet, Desktop: constrained
        maxHeight: isMobile ? "90vh" : "88vh",
        overflowY: "auto",
        boxShadow: "0 20px 70px rgba(0,0,0,0.55)",
        color: "var(--fg, #c9d1d9)",
      }}>

        {/* Mobile drag handle */}
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: "var(--border2)" }} />
          </div>
        )}

        {/* Modal header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          padding: isMobile ? "12px 16px 0" : "1.25rem 1.5rem 0",
        }}>
          <div>
            <h2 style={{ fontSize: isMobile ? "1rem" : "1.25rem", fontWeight: 600, letterSpacing: -0.4, margin: 0, color: "#e6edf3" }}>
              How AI Settlement Works
            </h2>
            <p style={{ fontSize: isMobile ? "0.7rem" : "0.8125rem", color: "var(--muted, #8b949e)", marginTop: 4, fontFamily: "var(--mono)" }}>
              {isMobile ? "CRE · Gemini AI · Ethereum Sepolia" : "Chainlink CRE · Google Gemini AI · Trustless · Ethereum Sepolia"}
            </p>
          </div>
          <div
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid transparent", background: "transparent", color: "var(--muted)", fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s", flexShrink: 0, marginLeft: 12 }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(248,81,73,0.12)"; e.currentTarget.style.color = "#f85149"; e.currentTarget.style.borderColor = "rgba(248,81,73,0.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "transparent"; }}
          >✕</div>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", borderBottom: "1px solid var(--border2, #30363d)",
          marginTop: "0.75rem",
          padding: isMobile ? "0 16px" : "0 1.5rem",
          overflowX: "auto", scrollbarWidth: "none",
        }}>
          {tabs.map(tab => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: isMobile ? "0.6rem 0.75rem" : "0.75rem 1rem",
                background: "transparent", border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #58a6ff" : "2px solid transparent",
                color: activeTab === tab.id ? "#58a6ff" : "var(--muted, #8b949e)",
                fontSize: isMobile ? "0.8rem" : "0.875rem",
                fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: "pointer", transition: "all 0.12s",
                marginBottom: "-1px", whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.color = "#c9d1d9"; }}
              onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.color = "var(--muted, #8b949e)"; }}
            >
              {tab.label}
            </div>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: isMobile ? "1rem 16px 1.5rem" : "1.5rem" }}>

          {/* Overview */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <p style={{
                fontSize: isMobile ? "0.8125rem" : "0.875rem", lineHeight: 1.65, color: "#c9d1d9",
                padding: isMobile ? "0.875rem" : "1rem 1.125rem",
                background: "var(--bg, #161b22)", borderRadius: 8, border: "1px solid var(--border, #30363d)",
                margin: 0,
              }}>
                Anyone can trigger settlement by clicking ⚡ on any open market.
                Chainlink CRE detects the on-chain event, queries Google Gemini AI
                for the outcome, and writes the cryptographically signed result
                back on-chain — no admins, no manual intervention, no trusted third party.
              </p>

              <a
                href="https://sepolia.etherscan.io/address/0xf34c4C6eE65ddbD0C71D4313B774726b280590e9"
                target="_blank" rel="noreferrer"
                style={{
                  display: "flex", alignItems: isMobile ? "flex-start" : "center",
                  flexDirection: isMobile ? "column" : "row",
                  justifyContent: "center",
                  gap: isMobile ? 4 : 8,
                  padding: isMobile ? "0.75rem" : "0.875rem 1.125rem",
                  borderRadius: 8,
                  background: "var(--bg, #161b22)", border: "1px solid var(--border, #30363d)",
                  fontFamily: "var(--mono)", fontSize: isMobile ? "0.75rem" : "0.8125rem",
                  color: "rgb(88, 101, 242)", textDecoration: "none", transition: "all 0.13s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(88,101,242,0.08)"; e.currentTarget.style.borderColor = "rgba(88,101,242,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--bg, #161b22)"; e.currentTarget.style.borderColor = "var(--border, #30363d)"; }}
              >
                <span style={{ fontWeight: 500, color: "#e6edf3" }}>PredictionMarket.sol</span>
                {!isMobile && <span style={{ color: "var(--muted)" }}>·</span>}
                <span style={{ color: "var(--muted)", fontSize: isMobile ? "0.7rem" : "0.8125rem" }}>0xf34c4...0590e9</span>
                {!isMobile && <span style={{ color: "var(--muted)" }}>·</span>}
                <span>Ethereum Sepolia ↗</span>
              </a>
            </div>
          )}

          {/* Settlement Flow */}
          {activeTab === "flow" && (
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.6875rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: "1rem" }}>
                Settlement Flow
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {steps.map((step, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex", gap: isMobile ? 10 : 12, alignItems: "flex-start",
                      padding: isMobile ? "0.625rem 0.75rem" : "0.75rem 1rem",
                      borderRadius: 8,
                      background: "var(--bg, #161b22)", border: "1px solid var(--border, #30363d)",
                      transition: "all 0.13s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(136,102,255,0.4)"; e.currentTarget.style.background = "rgba(136,102,255,0.04)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border, #30363d)"; e.currentTarget.style.background = "var(--bg, #161b22)"; }}
                  >
                    <span style={{
                      minWidth: 20, height: 20, borderRadius: "50%",
                      background: "rgba(136,102,255,0.12)", border: "1px solid rgba(136,102,255,0.25)",
                      color: "rgb(136, 102, 255)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.6875rem", fontWeight: 700, flexShrink: 0, marginTop: 2,
                    }}>{i + 1}</span>
                    <span style={{
                      fontSize: isMobile ? "0.8rem" : "0.875rem",
                      lineHeight: 1.55, color: "var(--muted)",
                      fontFamily: "var(--mono)",
                    }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tech Stack */}
          {activeTab === "tech" && (
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.6875rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: "1rem" }}>
                Tech Stack
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: 10,
              }}>
                {techItems.map(t => (
                  <div
                    key={t.label}
                    style={{ padding: isMobile ? "0.75rem" : "0.875rem 1rem", borderRadius: 8, background: t.bg, border: `1px solid ${t.border}`, transition: "all 0.13s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = t.color + "55"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; }}
                  >
                    <div style={{ fontSize: isMobile ? "0.8125rem" : "0.875rem", fontWeight: 600, color: t.color }}>{t.label}</div>
                    <div style={{ fontSize: isMobile ? "0.7rem" : "0.75rem", color: "var(--muted)", fontFamily: "var(--mono)", marginTop: 3 }}>{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}