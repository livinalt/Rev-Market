import { useState } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { sepolia } from "thirdweb/chains";
import { IDKitWidget, VerificationLevel } from "@worldcoin/idkit";
import { client } from "../App";
import { MARKET_ADDRESS, MARKET_ABI } from "../lib/contracts";
import { fmtEth, calcProb } from "../lib/utils";

const WORLD_APP_ID = "app_52bcb1ea37b432cf6a3e85f97160fc9e";

export default function MarketCard({ market, userPosition, onRefresh, onToast, worldIdVerified, onWorldIdVerified }) {
  const account = useActiveAccount();
  const { mutate: sendTx, isPending } = useSendTransaction();
  const [settling, setSettling]   = useState(false);
  const [claiming, setClaiming]   = useState(false);
  const [pendingSide, setPendingSide] = useState(null);

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

  function placeBet(side) {
    if (!account) { toast("Connect wallet first", "error"); return; }
    if (hasPos)   { toast("Already predicted", "error"); return; }
    let tx;
    try {
      tx = prepareContractCall({
        contract, method: "predict",
        params: [BigInt(market.id), side],
        value: BigInt(1_000_000_000_000_000),
      });
    } catch (e) { toast("Failed to prepare tx", "error"); return; }
    toast("Confirm in wallet…", "info");
    sendTx(tx, {
      onSuccess: () => { toast("Prediction placed ✓", "success"); setTimeout(onRefresh, 2000); },
      onError:   e  => toast(e.message.slice(0, 60), "error"),
    });
  }

  function requestSettlement() {
    if (!account) { toast("Connect wallet first", "error"); return; }
    setSettling(true);
    let tx;
    try {
      tx = prepareContractCall({
        contract, method: "requestSettlement",
        params: [BigInt(market.id)],
      });
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
      tx = prepareContractCall({
        contract, method: "claim",
        params: [BigInt(market.id)],
      });
    } catch (e) { toast("Failed to prepare tx", "error"); setClaiming(false); return; }
    toast("Claiming winnings…", "info");
    sendTx(tx, {
      onSuccess: () => { toast("Winnings claimed ✓", "success"); setTimeout(onRefresh, 2000); setClaiming(false); },
      onError:   e  => { toast(e.message.slice(0, 60), "error"); setClaiming(false); },
    });
  }

  const btnStyle = (color, bg) => ({
    flex: 1, padding: "5px 0", borderRadius: 6,
    border: `1px solid ${color}25`,
    background: bg, color,
    fontSize: 10, fontWeight: 700,
    cursor: isPending ? "not-allowed" : "pointer",
    opacity: isPending ? 0.5 : 1,
    transition: "background 0.15s",
    fontFamily: "var(--sans)",
  });

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
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.3)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Position strip */}
      {hasPos && (
        <div style={{ padding: "3px 10px", background: "rgba(124,106,247,0.07)", borderBottom: "1px solid rgba(124,106,247,0.12)", fontFamily: "var(--mono)", fontSize: 9, color: "#a78bfa" }}>
          {Number(userPosition.prediction) === 0 ? "YES" : "NO"} · {fmtEth(userPosition.amount)} ETH
          {userPosition.claimed && " · claimed"}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "10px 10px 6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 8, letterSpacing: 0.8, textTransform: "uppercase", color: "#a78bfa" }}>
            #{market.id}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {/* World ID badge — shows lock if not verified, checkmark if verified */}
            <span style={{
              fontFamily: "var(--mono)", fontSize: 7,
              color: worldIdVerified ? "#22d3a5" : "#a78bfa",
              background: worldIdVerified ? "rgba(34,211,165,0.08)" : "rgba(124,106,247,0.08)",
              border: `1px solid ${worldIdVerified ? "rgba(34,211,165,0.2)" : "rgba(124,106,247,0.2)"}`,
              padding: "1px 5px", borderRadius: 99,
            }}>
              {worldIdVerified ? "✓ Human" : "Verify"}
            </span>
            {isOpen ? (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontFamily: "var(--mono)", fontSize: 8, color: "#22c55e" }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 4px #22c55e", display: "inline-block" }} />
                LIVE
              </span>
            ) : (
              <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: market.outcome === 0 ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                SETTLED · {market.outcome === 0 ? "YES" : "NO"} · {market.confidence}%
              </span>
            )}
          </div>
        </div>
        <div style={{
          fontSize: 12, fontWeight: 700, lineHeight: 1.4, letterSpacing: -0.2,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
          minHeight: "2.8em",
        }}>
          {market.question}
        </div>
      </div>

      {/* Prob bar */}
      <div style={{ padding: "0 10px 8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#22c55e" }}>YES {prob}%</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#ef4444" }}>{100 - prob}% NO</span>
        </div>
        <div style={{ height: 2, borderRadius: 99, background: "var(--border2)", overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${prob}%`, background: "#22c55e", transition: "width 0.5s" }} />
          <div style={{ width: `${100 - prob}%`, background: "#ef4444" }} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: "6px 10px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        {[
          { label: "Pool", value: totalPool.toFixed(3) + "Ξ", color: "var(--text)" },
          { label: "YES",  value: (yesPool / 1e18).toFixed(3) + "Ξ", color: "#22c55e" },
          { label: "NO",   value: (noPool  / 1e18).toFixed(3) + "Ξ", color: "#ef4444" },
        ].map((s, i) => (
          <div key={i}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 1 }}>{s.label}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ padding: "7px 10px", display: "flex", flexDirection: "column", gap: 5, marginTop: "auto" }}>

        {/* Bet buttons */}
        {isOpen && !hasPos && (
          worldIdVerified ? (
            // Already verified — plain buttons
            <div style={{ display: "flex", gap: 5 }}>
              {BTNS.map(btn => (
                <button key={btn.side} onClick={() => placeBet(btn.side)} disabled={isPending}
                  style={btnStyle(btn.color, btn.bg)}
                  onMouseEnter={e => e.currentTarget.style.background = btn.hover}
                  onMouseLeave={e => e.currentTarget.style.background = btn.bg}
                >
                  {isPending ? "…" : btn.label}
                </button>
              ))}
            </div>
          ) : (
            // Not verified — trigger World ID on click
            <IDKitWidget
              app_id={WORLD_APP_ID}
              action="predict"
              verification_level={VerificationLevel.Device}
              onSuccess={() => {
                onWorldIdVerified();
                toast("Human verified ✓ Placing prediction…", "success");
                if (pendingSide !== null) placeBet(pendingSide);
              }}
              onError={() => toast("World ID verification failed", "error")}
            >
              {({ open }) => (
                <div style={{ display: "flex", gap: 5 }}>
                  {BTNS.map(btn => (
                    <button key={btn.side}
                      onClick={() => {
                        if (!account) { toast("Connect wallet first", "error"); return; }
                        setPendingSide(btn.side);
                        open();
                      }}
                      disabled={isPending}
                      style={btnStyle(btn.color, btn.bg)}
                      onMouseEnter={e => e.currentTarget.style.background = btn.hover}
                      onMouseLeave={e => e.currentTarget.style.background = btn.bg}
                    >
                      {isPending ? "…" : `${btn.label} `}
                    </button>
                  ))}
                </div>
              )}
            </IDKitWidget>
          )
        )}

        {/* Request settlement */}
        {isOpen && (
          <button onClick={requestSettlement} disabled={settling || isPending}
            style={{ width: "100%", padding: "5px 0", borderRadius: 6, border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.07)", color: "#fbbf24", fontSize: 10, fontWeight: 700, cursor: settling ? "not-allowed" : "pointer", opacity: settling ? 0.5 : 1, fontFamily: "var(--sans)" }}
          >
            {settling ? "Requesting…" : "⚡ Request AI Settlement"}
          </button>
        )}

        {/* Claim winnings */}
        {userWon && (
          <button onClick={claimWinnings} disabled={claiming}
            style={{ width: "100%", padding: "5px 0", borderRadius: 6, border: "1px solid rgba(34,197,94,0.4)", background: "rgba(34,197,94,0.12)", color: "#22c55e", fontSize: 10, fontWeight: 700, cursor: claiming ? "not-allowed" : "pointer", opacity: claiming ? 0.5 : 1, fontFamily: "var(--sans)" }}
          >
            {claiming ? "Claiming…" : "🏆 Claim Winnings"}
          </button>
        )}

        {hasPos && market.settled && userPosition.claimed && (
          <div style={{ textAlign: "center", fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)" }}>Winnings claimed ✓</div>
        )}
        {hasPos && market.settled && Number(userPosition.prediction) !== Number(market.outcome) && (
          <div style={{ textAlign: "center", fontFamily: "var(--mono)", fontSize: 9, color: "#ef4444" }}>Better luck next time</div>
        )}
      </div>
    </div>
  );
}