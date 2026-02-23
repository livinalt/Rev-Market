import { useState } from "react";
import { ConnectButton } from "thirdweb/react";
import { sepolia } from "thirdweb/chains";
import { client } from "../App";
import { MARKET_ADDRESS } from "../lib/contracts";
import HowItWorksModal from "./HowItWorks";

const CONTRACTS = [
  { name: "PredictionMarket.sol", addr: MARKET_ADDRESS },
];

const ghostBtn = {
  fontFamily: "var(--mono)", fontSize: 12,
  padding: "6px 10px", borderRadius: 6,
  border: "none", background: "transparent",
  color: "var(--muted)", cursor: "pointer",
  userSelect: "none", transition: "color 0.15s",
  display: "flex", alignItems: "center", gap: 5,
};

export default function Header({ onRefresh, loading, onCreateMarket }) {
  const [showContracts,  setShowContracts]  = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  return (
    <>
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(5,5,8,0.9)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
        padding: "0 32px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "linear-gradient(135deg, #7c6af7, #a78bfa)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: "white", flexShrink: 0,
          }}>◈</div>
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.5 }}>Rev</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>
            / Markets
          </span>
        </div>

        {/* Nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>

          {/* Chain indicator */}
          <div style={{ ...ghostBtn, gap: 6, cursor: "default", marginRight: 6 }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#22d3a5", boxShadow: "0 0 5px #22d3a5",
              display: "inline-block", flexShrink: 0,
            }} />
            <span style={{ fontSize: 11 }}>Ethereum Sepolia</span>
          </div>

          {/* How it works */}
          <div
            onClick={() => setShowHowItWorks(true)}
            style={ghostBtn}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
          >
            How it works
          </div>

          {/* Contracts dropdown */}
          <div style={{ position: "relative" }}>
            <div
              onClick={() => setShowContracts(v => !v)}
              style={{ ...ghostBtn, color: showContracts ? "var(--text)" : "var(--muted)" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--text)"}
              onMouseLeave={e => { if (!showContracts) e.currentTarget.style.color = "var(--muted)"; }}
            >
              Contracts
              <span style={{
                fontSize: 8, display: "inline-block",
                transform: showContracts ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}>▼</span>
            </div>

            {showContracts && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 99 }}
                  onClick={() => setShowContracts(false)} />
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0,
                  background: "var(--surface)", border: "1px solid var(--border2)",
                  borderRadius: 10, padding: 8, zIndex: 100,
                  minWidth: 280, boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
                }}>
                  <div style={{
                    fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)",
                    textTransform: "uppercase", letterSpacing: 1.2,
                    padding: "4px 8px 8px",
                  }}>
                    Live Contracts · Ethereum Sepolia
                  </div>
                  {CONTRACTS.map(c => (
                    <a key={c.addr}
                      href={`https://sepolia.etherscan.io/address/${c.addr}`}
                      target="_blank" rel="noreferrer"
                      onClick={() => setShowContracts(false)}
                      style={{
                        display: "flex", flexDirection: "column", gap: 2,
                        padding: "9px 10px", borderRadius: 7,
                        textDecoration: "none", transition: "background 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, color: "var(--text)" }}>
                        {c.name}
                      </span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--accent)" }}>
                        {c.addr.slice(0, 10)}...{c.addr.slice(-6)} ↗
                      </span>
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Refresh */}
          <div
            onClick={!loading ? onRefresh : undefined}
            style={{ ...ghostBtn, opacity: loading ? 0.4 : 1, marginRight: 6 }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
          >
            {loading ? "..." : "⟳"}
          </div>

          {/* Create Market */}
          <div onClick={onCreateMarket} style={{
            padding: "7px 14px", borderRadius: 8, cursor: "pointer",
            background: "linear-gradient(135deg, #7c6af7, #22d3a5)",
            color: "#000", fontWeight: 700, fontSize: 12,
            userSelect: "none", transition: "opacity 0.2s", marginRight: 8,
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            + Create Market
          </div>

          <ConnectButton
            client={client}
            chain={sepolia}
            theme="dark"
            connectButton={{
              style: {
                background: "transparent", border: "none",
                color: "var(--muted)", fontFamily: "var(--mono)",
                fontSize: 12, padding: "6px 10px", borderRadius: 6,
              }
            }}
            detailsButton={{
              style: {
                background: "transparent", border: "none",
                color: "var(--muted)", fontFamily: "var(--mono)",
                fontSize: 12, padding: "6px 10px",
              }
            }}
          />
        </div>
      </header>

      {showHowItWorks && <HowItWorksModal onClose={() => setShowHowItWorks(false)} />}
    </>
  );
}