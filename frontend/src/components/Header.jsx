import { useState, useEffect } from "react";
import { ConnectButton } from "thirdweb/react";
import { sepolia } from "thirdweb/chains";
import { client } from "../App";
import { MARKET_ADDRESS } from "../lib/contracts";
import HowItWorksModal from "./HowItWorks";

const CONTRACTS = [
  { name: "PredictionMarket.sol", addr: MARKET_ADDRESS },
];

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);
  return width;
}

const ghostBtn = {
  fontFamily: "var(--mono)", fontSize: 12,
  padding: "6px 10px", borderRadius: 6,
  border: "none", background: "transparent",
  color: "var(--muted)", cursor: "pointer",
  userSelect: "none", transition: "color 0.15s",
  display: "flex", alignItems: "center", gap: 5,
};

export default function Header({ onRefresh, loading, onCreateMarket }) {
  const width    = useWindowWidth();
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;

  const [showContracts,  setShowContracts]  = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <>
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(5,5,8,0.9)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
        padding: isMobile ? "0 14px" : "0 32px",
        height: isMobile ? 54 : 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: "linear-gradient(135deg, #7c6af7, #a78bfa)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800, color: "white", flexShrink: 0,
          }}>◈</div>
          <span style={{ fontSize: isMobile ? 15 : 17, fontWeight: 800, letterSpacing: -0.5 }}>Rev</span>
          {!isMobile && (
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>/ Markets</span>
          )}
        </div>

        {/* ── Desktop nav ── */}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>

            {/* Chain indicator */}
            <div style={{ ...ghostBtn, gap: 6, cursor: "default", marginRight: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22d3a5", boxShadow: "0 0 5px #22d3a5", display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: isTablet ? 10 : 11 }}>
                {isTablet ? "Sepolia" : "Ethereum Sepolia"}
              </span>
            </div>

            {/* How it works — hidden on tablet to save space */}
            {!isTablet && (
              <div
                onClick={() => setShowHowItWorks(true)}
                style={ghostBtn}
                onMouseEnter={e => e.currentTarget.style.color = "var(--text)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
              >
                How it works
              </div>
            )}

            {/* Contracts dropdown */}
            <div style={{ position: "relative" }}>
              <div
                onClick={() => setShowContracts(v => !v)}
                style={{ ...ghostBtn, color: showContracts ? "var(--text)" : "var(--muted)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--text)"}
                onMouseLeave={e => { if (!showContracts) e.currentTarget.style.color = "var(--muted)"; }}
              >
                Contracts
                <span style={{ fontSize: 8, display: "inline-block", transform: showContracts ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
              </div>
              {showContracts && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setShowContracts(false)} />
                  <div style={{
                    position: "absolute", top: "calc(100% + 8px)", right: 0,
                    background: "var(--surface)", border: "1px solid var(--border2)",
                    borderRadius: 10, padding: 8, zIndex: 100,
                    minWidth: 280, boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
                  }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1.2, padding: "4px 8px 8px" }}>
                      Live Contracts · Ethereum Sepolia
                    </div>
                    {CONTRACTS.map(c => (
                      <a key={c.addr}
                        href={`https://sepolia.etherscan.io/address/${c.addr}`}
                        target="_blank" rel="noreferrer"
                        onClick={() => setShowContracts(false)}
                        style={{ display: "flex", flexDirection: "column", gap: 2, padding: "9px 10px", borderRadius: 7, textDecoration: "none", transition: "background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{c.name}</span>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--accent)" }}>{c.addr.slice(0, 10)}...{c.addr.slice(-6)} ↗</span>
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Refresh */}
            <div
              onClick={!loading ? onRefresh : undefined}
              style={{ ...ghostBtn, opacity: loading ? 0.4 : 1, marginRight: 4 }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
            >
              {loading ? "..." : "⟳"}
            </div>

            {/* Create Market — shorter label on tablet */}
            <div onClick={onCreateMarket} style={{
              padding: isTablet ? "6px 10px" : "7px 14px",
              borderRadius: 8, cursor: "pointer",
              background: "linear-gradient(135deg, #7c6af7, #22d3a5)",
              color: "#000", fontWeight: 700,
              fontSize: isTablet ? 11 : 12,
              userSelect: "none", transition: "opacity 0.2s", marginRight: 8,
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              {isTablet ? "+ Create" : "+ Create Market"}
            </div>

            <ConnectButton
              client={client}
              chain={sepolia}
              theme="dark"
              connectButton={{ style: { background: "transparent", border: "none", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 12, padding: "6px 10px", borderRadius: 6 } }}
              detailsButton={{ style: { background: "transparent", border: "none", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 12, padding: "6px 10px" } }}
            />
          </div>
        )}

        {/* ── Mobile nav ── */}
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* Wallet connect — compact */}
            <ConnectButton
              client={client}
              chain={sepolia}
              theme="dark"
              connectButton={{ style: { background: "rgba(124,106,247,0.15)", border: "1px solid rgba(124,106,247,0.3)", color: "var(--text)", fontFamily: "var(--mono)", fontSize: 11, padding: "5px 10px", borderRadius: 6 } }}
              detailsButton={{ style: { background: "transparent", border: "none", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 11, padding: "5px 8px" } }}
            />

            {/* Hamburger */}
            <div
              onClick={() => setShowMobileMenu(v => !v)}
              style={{ ...ghostBtn, padding: "6px 8px", fontSize: 18, color: "var(--muted)" }}
            >
              {showMobileMenu ? "✕" : "☰"}
            </div>
          </div>
        )}
      </header>

      {/* ── Mobile dropdown menu ── */}
      {isMobile && showMobileMenu && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 98 }} onClick={() => setShowMobileMenu(false)} />
          <div style={{
            position: "fixed", top: 54, left: 0, right: 0, zIndex: 99,
            background: "rgba(5,5,8,0.97)", backdropFilter: "blur(20px)",
            borderBottom: "1px solid var(--border)",
            padding: "12px 14px 16px",
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            {/* Chain */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22d3a5", boxShadow: "0 0 5px #22d3a5", display: "inline-block" }} />
              Ethereum Sepolia
            </div>

            {/* How it works */}
            <div onClick={() => { setShowHowItWorks(true); setShowMobileMenu(false); }}
              style={{ padding: "10px 10px", borderRadius: 8, cursor: "pointer", fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted)"; }}
            >
              How it works
            </div>

            {/* Contracts */}
            {CONTRACTS.map(c => (
              <a key={c.addr}
                href={`https://sepolia.etherscan.io/address/${c.addr}`}
                target="_blank" rel="noreferrer"
                onClick={() => setShowMobileMenu(false)}
                style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px", borderRadius: 8, textDecoration: "none", transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{c.name}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--accent)" }}>{c.addr.slice(0, 14)}...{c.addr.slice(-6)} ↗</span>
              </a>
            ))}

            <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />

            {/* Create market */}
            <div onClick={() => { onCreateMarket(); setShowMobileMenu(false); }}
              style={{
                padding: "11px 10px", borderRadius: 8, cursor: "pointer",
                background: "linear-gradient(135deg, #7c6af7, #22d3a5)",
                color: "#000", fontWeight: 700, fontSize: 13,
                textAlign: "center", transition: "opacity 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              + Create Market
            </div>

            {/* Refresh */}
            <div onClick={() => { if (!loading) { onRefresh(); setShowMobileMenu(false); } }}
              style={{ padding: "10px 10px", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer", fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)", opacity: loading ? 0.4 : 1, transition: "all 0.15s", textAlign: "center" }}
            >
              {loading ? "Refreshing..." : "⟳ Refresh markets"}
            </div>
          </div>
        </>
      )}

      {showHowItWorks && <HowItWorksModal onClose={() => setShowHowItWorks(false)} />}
    </>
  );
}