import { useState, useEffect } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { sepolia } from "thirdweb/chains";
import { client } from "../App";
import { MARKET_ADDRESS, MARKET_ABI } from "../lib/contracts";
import { fmtEth, calcProb } from "../lib/utils";
import { notify } from "../lib/useNotifications";

function timeAgo(ts) {
  if (!ts) return "—";
  const diff  = Date.now() - ts * 1000;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function MarketDetailModal({ market, userPosition, onClose, onRefresh, onToast, onNotify }) {
  const account = useActiveAccount();
  const { mutate: sendTx, isPending } = useSendTransaction();
  const [settling, setSettling]     = useState(false);
  const [claiming, setClaiming]     = useState(false);
  const [predicting, setPredicting] = useState(null);

  const description = localStorage.getItem(`market_desc_${market.id}`) || "";

  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const toast    = (msg, kind = "info") => onToast?.(msg, kind);
  const contract = getContract({ client, chain: sepolia, address: MARKET_ADDRESS, abi: MARKET_ABI });

  const isPendingSettlement = !!localStorage.getItem(`pending_settlement_${market.id}`);
  const isOpen    = !market.settled;
  const yesPool   = Number(market.totalYesPool);
  const noPool    = Number(market.totalNoPool);
  const totalPool = (yesPool + noPool) / 1e18;
  const prob      = calcProb(yesPool, noPool);
  const hasPos    = !!userPosition;
  const userWon   = hasPos && market.settled &&
    Number(userPosition.prediction) === Number(market.outcome) &&
    !userPosition.claimed;
  const isCreator = account?.address?.toLowerCase() === market.creator?.toLowerCase();
  const canSettle = isOpen && (isCreator || hasPos);
  const liveDotColor = isPendingSettlement ? "#fbbf24" : "#22c55e";

  function placeBet(side) {
    if (!account || hasPos || predicting !== null) return;
    setPredicting(side);
    let tx;
    try {
      tx = prepareContractCall({
        contract, method: "predict",
        params: [BigInt(market.id), side],
        value: BigInt(1_000_000_000_000_000),
      });
    } catch { toast("Failed to prepare tx", "error"); setPredicting(null); return; }
    toast("Confirm in wallet…", "info");
    sendTx(tx, {
      onSuccess: () => { toast("Prediction placed ✓", "success"); onNotify?.(notify.predicted(market.id, side, 1_000_000_000_000_000)); setTimeout(onRefresh, 2000); setPredicting(null); },
      onError:   e => { toast(e.message.slice(0, 60), "error"); setPredicting(null); },
    });
  }

  function requestSettlement() {
    if (!account) return;
    setSettling(true);
    let tx;
    try {
      tx = prepareContractCall({ contract, method: "requestSettlement", params: [BigInt(market.id)] });
    } catch { toast("Failed to prepare tx", "error"); setSettling(false); return; }
    toast("Requesting AI settlement…", "info");
    sendTx(tx, {
      onSuccess: () => { toast("Settlement requested ✓", "success"); localStorage.setItem(`pending_settlement_${market.id}`, Date.now().toString()); onNotify?.(notify.settlementRequested(market.id, market.question)); setTimeout(onRefresh, 3000); setSettling(false); },
      onError:   e => { toast(e.message.slice(0, 60), "error"); setSettling(false); },
    });
  }

  function claimWinnings() {
    if (!account) return;
    setClaiming(true);
    let tx;
    try {
      tx = prepareContractCall({ contract, method: "claim", params: [BigInt(market.id)] });
    } catch { toast("Failed to prepare tx", "error"); setClaiming(false); return; }
    toast("Claiming winnings…", "info");
    sendTx(tx, {
      onSuccess: () => { toast("Winnings claimed ✓", "success"); onNotify?.(notify.claimed(market.id, userPosition?.amount ?? 0)); setTimeout(onRefresh, 2000); setClaiming(false); },
      onError:   e => { toast(e.message.slice(0, 60), "error"); setClaiming(false); },
    });
  }

  const BTNS = [
    { label: "Yes", side: 0, color: "#22c55e", bg: "rgba(34,197,94,0.07)",  hover: "rgba(34,197,94,0.15)" },
    { label: "No",  side: 1, color: "#ef4444", bg: "rgba(239,68,68,0.07)",  hover: "rgba(239,68,68,0.15)" },
  ];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border2)",
        borderRadius: 14, width: "100%", maxWidth: 480,
        // Fixed max height — never overflows viewport
        maxHeight: "min(600px, 90vh)",
        display: "flex", flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        overflow: "hidden",
      }}>

        {/* ── Header — fixed, never scrolls ── */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Status row */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#a78bfa" }}>#{market.id}</span>
              {isOpen ? (
                <span style={{ display: "flex", alignItems: "center", gap: 3, fontFamily: "var(--mono)", fontSize: 9, color: liveDotColor }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: liveDotColor, boxShadow: `0 0 4px ${liveDotColor}`, display: "inline-block", animation: isPendingSettlement ? "pulseGlow 1.5s ease-in-out infinite" : "none" }} />
                  {isPendingSettlement ? "SETTLING" : "LIVE"}
                </span>
              ) : (
                <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: market.outcome === 0 ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                  SETTLED · {market.outcome === 0 ? "YES" : "NO"} · {market.confidence}%
                </span>
              )}
              {isCreator && <span style={{ fontSize: 8, color: "#a78bfa", background: "rgba(124,106,247,0.1)", border: "1px solid rgba(124,106,247,0.2)", padding: "1px 5px", borderRadius: 99, fontFamily: "var(--mono)" }}>yours</span>}
              {hasPos && <span style={{ fontSize: 8, color: Number(userPosition.prediction) === 0 ? "#22c55e" : "#ef4444", background: Number(userPosition.prediction) === 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${Number(userPosition.prediction) === 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`, padding: "1px 5px", borderRadius: 99, fontFamily: "var(--mono)" }}>{Number(userPosition.prediction) === 0 ? "YES" : "NO"} position</span>}
            </div>
            {/* Full question — no line clamp */}
            <p style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4, letterSpacing: -0.3, margin: 0 }}>
              {market.question}
            </p>
          </div>
          <div onClick={onClose} style={{ width: 26, height: 26, borderRadius: 6, cursor: "pointer", background: "var(--bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 12, flexShrink: 0, transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(248,81,73,0.1)"; e.currentTarget.style.color = "#f85149"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.color = "var(--muted)"; }}
          >✕</div>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Description */}
          {description && (
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--bg)", border: "1px solid var(--border)" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Description</div>
              <p style={{ fontSize: 12, lineHeight: 1.65, color: "var(--muted)", margin: 0, whiteSpace: "pre-wrap" }}>{description}</p>
            </div>
          )}

          {/* Prob bar */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#22c55e" }}>YES {prob}%</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#ef4444" }}>{100 - prob}% NO</span>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: "var(--border2)", overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${prob}%`, background: "#22c55e", transition: "width 0.5s" }} />
              <div style={{ width: `${100 - prob}%`, background: "#ef4444" }} />
            </div>
          </div>

          {/* Stats — compact single row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {[
              { label: "Pool",  value: totalPool.toFixed(3) + "Ξ",          color: "var(--text)" },
              { label: "YES",   value: (yesPool / 1e18).toFixed(3) + "Ξ",   color: "#22c55e"     },
              { label: "NO",    value: (noPool  / 1e18).toFixed(3) + "Ξ",   color: "#ef4444"     },
            ].map((s, i) => (
              <div key={i} style={{ padding: "8px 10px", borderRadius: 8, background: "var(--bg)", border: "1px solid var(--border)", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.8 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* User position — compact */}
          {hasPos && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(124,106,247,0.05)", border: "1px solid rgba(124,106,247,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 14 }}>
                <div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--muted)", marginBottom: 2 }}>PREDICTED</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, color: Number(userPosition.prediction) === 0 ? "#22c55e" : "#ef4444" }}>{Number(userPosition.prediction) === 0 ? "YES" : "NO"}</div>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--muted)", marginBottom: 2 }}>STAKED</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{fmtEth(userPosition.amount)} ETH</div>
                </div>
              </div>
              {userPosition.claimed && (
                <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#22d3a5", background: "rgba(34,211,165,0.08)", border: "1px solid rgba(34,211,165,0.2)", padding: "2px 7px", borderRadius: 99 }}>Claimed ✓</span>
              )}
            </div>
          )}

          {/* Meta — single compact row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)" }}>
              Created {timeAgo(market.createdAt)} · {market.creator?.slice(0, 6)}…{market.creator?.slice(-4)}
            </span>
            <a
              href={`https://sepolia.etherscan.io/address/${MARKET_ADDRESS}`}
              target="_blank" rel="noreferrer"
              style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--accent)", textDecoration: "none" }}
              onClick={e => e.stopPropagation()}
            >
              Etherscan ↗
            </a>
          </div>

          {/* Settled info */}
          {market.settled && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: market.outcome === 0 ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)", border: `1px solid ${market.outcome === 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: market.outcome === 0 ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                Resolved {market.outcome === 0 ? "YES" : "NO"} · {market.confidence}% confidence
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)", marginLeft: 8 }}>
                {timeAgo(market.settledAt)}
              </span>
            </div>
          )}
        </div>

        {/* ── Actions — fixed footer, never scrolls ── */}
        {(isOpen || userWon) && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>

            {isOpen && !hasPos && (
              <div style={{ display: "flex", gap: 6 }}>
                {BTNS.map(btn => {
                  const isThisSide  = predicting === btn.side;
                  const isOtherSide = predicting !== null && predicting !== btn.side;
                  const disabled    = predicting !== null || isPending;
                  return (
                    <button key={btn.side} onClick={() => placeBet(btn.side)} disabled={disabled}
                      style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: `1px solid ${isThisSide ? btn.color + "80" : btn.color + "25"}`, background: isThisSide ? btn.hover : isOtherSide ? "rgba(255,255,255,0.02)" : btn.bg, color: isOtherSide ? "var(--muted)" : btn.color, fontSize: 12, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: isOtherSide ? 0.25 : 1, transition: "all 0.2s", fontFamily: "var(--sans)" }}
                      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = btn.hover; }}
                      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = isThisSide ? btn.hover : btn.bg; }}
                    >
                      {isThisSide ? "Confirming…" : `${btn.label} · 0.001 ETH`}
                    </button>
                  );
                })}
              </div>
            )}

            {canSettle && (
              <button onClick={requestSettlement} disabled={settling || isPending}
                style={{ width: "100%", padding: "9px 0", borderRadius: 7, border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.07)", color: "#fbbf24", fontSize: 12, fontWeight: 700, cursor: settling ? "not-allowed" : "pointer", opacity: settling ? 0.5 : 1, fontFamily: "var(--sans)" }}
              >
                {settling ? "Requesting…" : "⚡ Request AI Settlement"}
              </button>
            )}

            {userWon && (
              <button onClick={claimWinnings} disabled={claiming}
                style={{ width: "100%", padding: "9px 0", borderRadius: 7, border: "1px solid rgba(34,197,94,0.4)", background: "rgba(34,197,94,0.12)", color: "#22c55e", fontSize: 12, fontWeight: 700, cursor: claiming ? "not-allowed" : "pointer", opacity: claiming ? 0.5 : 1, fontFamily: "var(--sans)" }}
              >
                {claiming ? "Claiming…" : "🏆 Claim Winnings"}
              </button>
            )}

            {hasPos && market.settled && userPosition.claimed && (
              <div style={{ textAlign: "center", fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", padding: "2px 0" }}>Winnings claimed ✓</div>
            )}
            {hasPos && market.settled && Number(userPosition.prediction) !== Number(market.outcome) && (
              <div style={{ textAlign: "center", fontFamily: "var(--mono)", fontSize: 10, color: "#ef4444", padding: "2px 0" }}>Better luck next time</div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}