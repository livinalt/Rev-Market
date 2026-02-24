import { useState } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { sepolia } from "thirdweb/chains";
import { client } from "../App";
import { MARKET_ADDRESS, MARKET_ABI } from "../lib/contracts";
import { fmtEth, calcProb } from "../lib/utils";

export default function MarketCard({ market, userPosition, onRefresh, onToast }) {
  const account = useActiveAccount();
  const { mutate: sendTx, isPending } = useSendTransaction();
  const [settling, setSettling]     = useState(false);
  const [claiming, setClaiming]     = useState(false);
  const [predicting, setPredicting] = useState(null);

  const toast = (msg, kind = "info") => onToast?.(msg, kind) ?? console.log(msg);
  const contract = getContract({ client, chain: sepolia, address: MARKET_ADDRESS, abi: MARKET_ABI });

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

  function placeBet(side) {
    if (!account)            { toast("Connect wallet first", "error"); return; }
    if (hasPos)              { toast("Already predicted", "error"); return; }
    if (predicting !== null) return;

    setPredicting(side);
    let tx;
    try {
      tx = prepareContractCall({
        contract, method: "predict",
        params: [BigInt(market.id), side],
        value: BigInt(1_000_000_000_000_000),
      });
    } catch (e) { toast("Failed to prepare tx", "error"); setPredicting(null); return; }

    toast("Confirm in wallet…", "info");
    sendTx(tx, {
      onSuccess: () => { toast("Prediction placed ✓", "success"); setTimeout(onRefresh, 2000); setPredicting(null); },
      onError:   e  => { toast(e.message.slice(0, 60), "error"); setPredicting(null); },
    });
  }

  function requestSettlement() {
    if (!account) { toast("Connect wallet first", "error"); return; }
    setSettling(true);
    let tx;
    try {
      tx = prepareContractCall({ contract, method: "requestSettlement", params: [BigInt(market.id)] });
    } catch (e) { toast("Failed to prepare tx", "error"); setSettling(false); return; }
    toast("Requesting AI settlement…", "info");
    sendTx(tx, {
      onSuccess: () => { toast("Settlement requested ✓", "success"); setTimeout(onRefresh, 3000); setSettling(false); },
      onError:   e  => { toast(e.message.slice(0, 60), "error"); setSettling(false); },
    });
  }

  function claimWinnings() {
    if (!account) { toast("Connect wallet first", "error"); return; }
    setClaiming(true);
    let tx;
    try {
      tx = prepareContractCall({ contract, method: "claim", params: [BigInt(market.id)] });
    } catch (e) { toast("Failed to prepare tx", "error"); setClaiming(false); return; }
    toast("Claiming winnings…", "info");
    sendTx(tx, {
      onSuccess: () => { toast("Winnings claimed ✓", "success"); setTimeout(onRefresh, 2000); setClaiming(false); },
      onError:   e  => { toast(e.message.slice(0, 60), "error"); setClaiming(false); },
    });
  }

  const BTNS = [
    { label: "Yes", side: 0, color: "#22c55e", bg: "rgba(34,197,94,0.07)",  hover: "rgba(34,197,94,0.15)"  },
    { label: "No",  side: 1, color: "#ef4444", bg: "rgba(239,68,68,0.07)",  hover: "rgba(239,68,68,0.15)"  },
  ];

  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${hasPos ? "rgba(124,106,247,0.3)" : "var(--border)"}`,
        borderRadius: 10, overflow: "hidden",
        transition: "transform 0.15s, box-shadow 0.15s",
        display: "flex", flexDirection: "column",
        // Full width on mobile, natural height — no fixed heights
        width: "100%", boxSizing: "border-box",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.3)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Position strip */}
      {hasPos && (
        <div style={{ padding: "3px 12px", background: "rgba(124,106,247,0.07)", borderBottom: "1px solid rgba(124,106,247,0.12)", fontFamily: "var(--mono)", fontSize: 9, color: "#a78bfa" }}>
          {Number(userPosition.prediction) === 0 ? "YES" : "NO"} · {fmtEth(userPosition.amount)} ETH
          {userPosition.claimed && " · claimed"}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "12px 12px 6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: 0.8, textTransform: "uppercase", color: "#a78bfa" }}>
            #{market.id}
          </span>
          {isOpen ? (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontFamily: "var(--mono)", fontSize: 9, color: "#22c55e" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 4px #22c55e", display: "inline-block" }} />
              LIVE
              {isCreator && (
                <span style={{ marginLeft: 4, fontSize: 8, color: "#a78bfa", background: "rgba(124,106,247,0.1)", border: "1px solid rgba(124,106,247,0.2)", padding: "0px 5px", borderRadius: 99 }}>
                  yours
                </span>
              )}
            </span>
          ) : (
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: market.outcome === 0 ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
              SETTLED · {market.outcome === 0 ? "YES" : "NO"} · {market.confidence}%
            </span>
          )}
        </div>

        {/* Question — 2 lines max, consistent height */}
        <div style={{
          fontSize: 13, fontWeight: 700, lineHeight: 1.45, letterSpacing: -0.2,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
          minHeight: "2.9em",
        }}>
          {market.question}
        </div>
      </div>

      {/* Prob bar */}
      <div style={{ padding: "0 12px 10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#22c55e" }}>YES {prob}%</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#ef4444" }}>{100 - prob}% NO</span>
        </div>
        <div style={{ height: 3, borderRadius: 99, background: "var(--border2)", overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${prob}%`, background: "#22c55e", transition: "width 0.5s" }} />
          <div style={{ width: `${100 - prob}%`, background: "#ef4444" }} />
        </div>
      </div>

      {/* Stats — responsive: wraps gracefully */}
      <div style={{
        padding: "8px 12px",
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6,
        borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
      }}>
        {[
          { label: "Pool", value: totalPool.toFixed(3) + "Ξ", color: "var(--text)" },
          { label: "YES",  value: (yesPool / 1e18).toFixed(3) + "Ξ", color: "#22c55e" },
          { label: "NO",   value: (noPool  / 1e18).toFixed(3) + "Ξ", color: "#ef4444" },
        ].map((s, i) => (
          <div key={i}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6, marginTop: "auto" }}>

        {/* Bet buttons */}
        {isOpen && !hasPos && (
          <div style={{ display: "flex", gap: 6 }}>
            {BTNS.map(btn => {
              const isThisSide  = predicting === btn.side;
              const isOtherSide = predicting !== null && predicting !== btn.side;
              const disabled    = predicting !== null || isPending;
              return (
                <button
                  key={btn.side}
                  onClick={() => placeBet(btn.side)}
                  disabled={disabled}
                  style={{
                    flex: 1,
                    // Taller tap target on touch devices
                    padding: "8px 0",
                    borderRadius: 7,
                    border: `1px solid ${isThisSide ? btn.color + "80" : btn.color + "25"}`,
                    background: isThisSide ? btn.hover : isOtherSide ? "rgba(255,255,255,0.02)" : btn.bg,
                    color: isOtherSide ? "var(--muted)" : btn.color,
                    fontSize: 12, fontWeight: 700,
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: isOtherSide ? 0.25 : 1,
                    transition: "all 0.2s",
                    fontFamily: "var(--sans)",
                    // Prevent text overflow on narrow cards
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}
                  onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = btn.hover; }}
                  onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = isThisSide ? btn.hover : btn.bg; }}
                >
                  {isThisSide ? "Confirming…" : btn.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Request AI Settlement — only creator or predictors see this */}
        {canSettle && (
          <button
            onClick={requestSettlement}
            disabled={settling || isPending}
            style={{
              width: "100%", padding: "8px 0", borderRadius: 7,
              border: "1px solid rgba(251,191,36,0.3)",
              background: "rgba(251,191,36,0.07)", color: "#fbbf24",
              fontSize: 12, fontWeight: 700,
              cursor: settling ? "not-allowed" : "pointer",
              opacity: settling ? 0.5 : 1, fontFamily: "var(--sans)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}
          >
            {settling ? "Requesting…" : "⚡ Request AI Settlement"}
          </button>
        )}

        {/* Claim Winnings */}
        {userWon && (
          <button
            onClick={claimWinnings}
            disabled={claiming}
            style={{
              width: "100%", padding: "8px 0", borderRadius: 7,
              border: "1px solid rgba(34,197,94,0.4)",
              background: "rgba(34,197,94,0.12)", color: "#22c55e",
              fontSize: 12, fontWeight: 700,
              cursor: claiming ? "not-allowed" : "pointer",
              opacity: claiming ? 0.5 : 1, fontFamily: "var(--sans)",
            }}
          >
            {claiming ? "Claiming…" : "🏆 Claim Winnings"}
          </button>
        )}

        {/* Status messages */}
        {hasPos && market.settled && userPosition.claimed && (
          <div style={{ textAlign: "center", fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>
            Winnings claimed ✓
          </div>
        )}
        {hasPos && market.settled && Number(userPosition.prediction) !== Number(market.outcome) && (
          <div style={{ textAlign: "center", fontFamily: "var(--mono)", fontSize: 10, color: "#ef4444" }}>
            Better luck next time
          </div>
        )}
      </div>
    </div>
  );
}