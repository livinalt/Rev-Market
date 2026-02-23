import { useState, useEffect } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { client } from "../App";
import { PM_ADDRESS, EM_ADDRESS, PM_ABI, EM_ABI } from "../lib/contracts";
import { fmtEth, fmtPrice, calcProb, fmtCountdown } from "../lib/utils";

const TAKE_POSITION_ABI = {
  name: "takePosition",
  type: "function",
  stateMutability: "payable",
  inputs: [
    { name: "marketId", type: "uint256" },
    { name: "side",     type: "uint8"   },
  ],
  outputs: [],
};

export default function MarketCard({ market, type, userPosition, onRefresh, onToast }) {
  const account = useActiveAccount();
  const { mutate: sendTx, isPending } = useSendTransaction();
  const [countdown, setCountdown] = useState("");

  // Safe toast — never crashes if parent forgets to pass it
  const toast = (msg, kind = "info") => onToast?.(msg, kind) ?? console.log(msg);

  const isPrice = type === "price";
  const isOpen  = Number(market[5]) === 0;
  const expiry  = Number(isPrice ? market[1] : market[2]);

  useEffect(() => {
    const t = setInterval(() => setCountdown(fmtCountdown(expiry)), 1000);
    setCountdown(fmtCountdown(expiry));
    return () => clearInterval(t);
  }, [expiry]);

  function placeBet(side) {
    if (!account) { toast("Connect wallet first", "error"); return; }

    const contract = getContract({
      client,
      chain: baseSepolia,
      address: isPrice ? PM_ADDRESS : EM_ADDRESS,
      abi: [TAKE_POSITION_ABI],
    });

    let tx;
    try {
      tx = prepareContractCall({
        contract,
        method: TAKE_POSITION_ABI,
        params: [BigInt(market.id), side],
        value: BigInt(1000000000000000),
      });
    } catch (e) {
      toast("Failed to prepare tx: " + e.message.slice(0, 40), "error");
      return;
    }

    toast("Confirm in wallet…", "info");
    sendTx(tx, {
      onSuccess: () => { toast("Position placed ✓", "success"); setTimeout(onRefresh, 2000); },
      onError:   e  => toast(e.message.slice(0, 60), "error"),
    });
  }

  const strike    = isPrice ? fmtPrice(market[0]) : null;
  const above     = isPrice ? Number(market[2]) : 0;
  const below     = isPrice ? Number(market[3]) : 0;
  const totalYes  = !isPrice ? Number(market[3]) : 0;
  const totalNo   = !isPrice ? Number(market[4]) : 0;
  const outcome   = Number(market[5]);
  const prob      = isPrice ? calcProb(above, below) : calcProb(totalYes, totalNo);
  const totalPool = isPrice ? (above + below) / 1e18 : (totalYes + totalNo) / 1e18;
  const hasPosition = !!userPosition;

  function resolvedLabel() {
    if (isPrice && outcome === 1) return Number(market[4]) >= Number(market[0]) ? "ABOVE" : "BELOW";
    if (!isPrice) {
      if (outcome === 1) return "YES";
      if (outcome === 2) return "NO";
      if (outcome === 3) return "INVALID";
    }
    return "—";
  }

  function resolvedColor() {
    if (isPrice && outcome === 1) return Number(market[4]) >= Number(market[0]) ? "#22c55e" : "#ef4444";
    if (!isPrice && outcome === 1) return "#22c55e";
    if (!isPrice && outcome === 2) return "#ef4444";
    if (!isPrice && outcome === 3) return "#fbbf24";
    return "var(--muted)";
  }

  return (
    <div style={{
      background: "var(--surface)",
      border: `1px solid ${hasPosition ? "rgba(124,106,247,0.3)" : "var(--border)"}`,
      borderRadius: 12, overflow: "hidden",
      transition: "transform 0.15s, box-shadow 0.15s",
      position: "relative",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Position strip */}
      {hasPosition && (
        <div style={{ padding: "4px 14px", background: "rgba(124,106,247,0.07)", borderBottom: "1px solid rgba(124,106,247,0.12)", fontFamily: "var(--mono)", fontSize: 10, color: "#a78bfa" }}>
          {isPrice
            ? `▲ ${fmtEth(userPosition.above || 0)} · ▼ ${fmtEth(userPosition.below || 0)} ETH`
            : `✅ ${fmtEth(userPosition.yes || 0)} · ❌ ${fmtEth(userPosition.no || 0)} ETH`}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "14px 14px 10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: 0.8, textTransform: "uppercase", color: isPrice ? "#a78bfa" : "#22c55e" }}>
            {isPrice ? "Price" : "Event"} #{market.id}
          </span>
          {isOpen ? (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--mono)", fontSize: 9, color: "#22c55e" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 4px #22c55e", display: "inline-block" }} />
              LIVE
            </span>
          ) : (
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: resolvedColor(), fontWeight: 700 }}>
              {resolvedLabel()}
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35, letterSpacing: -0.2 }}>
          {isPrice ? `Will ETH close above ${strike}?` : market[1]}
        </div>
      </div>

      {/* Prob bar */}
      <div style={{ padding: "0 14px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#22c55e" }}>{isPrice ? "▲" : "YES"} {prob}%</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#ef4444" }}>{100 - prob}% {isPrice ? "▼" : "NO"}</span>
        </div>
        <div style={{ height: 3, borderRadius: 99, background: "var(--border2)", overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${prob}%`, background: "#22c55e", transition: "width 0.5s" }} />
          <div style={{ width: `${100 - prob}%`, background: "#ef4444" }} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, borderTop: "1px solid var(--border)", borderBottom: isOpen ? "1px solid var(--border)" : "none" }}>
        {[
          { label: "Pool",                       value: totalPool.toFixed(3) + " ETH",               color: "var(--text)"              },
          { label: isPrice ? "Strike" : "YES",   value: isPrice ? strike : fmtEth(totalYes) + " ETH", color: "var(--text)"             },
          { label: isOpen ? "Closes" : "Result", value: isOpen ? countdown : resolvedLabel(),          color: isOpen ? "#fbbf24" : resolvedColor() },
        ].map((s, i) => (
          <div key={i}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      {isOpen && (
        <div style={{ padding: "10px 14px", display: "flex", gap: 8 }}>
          {[
            { label: isPrice ? "▲ Above" : "✅ Yes", side: 0, color: "#22c55e", bg: "rgba(34,197,94,0.07)",  hover: "rgba(34,197,94,0.15)"  },
            { label: isPrice ? "▼ Below" : "❌ No",  side: 1, color: "#ef4444", bg: "rgba(239,68,68,0.07)",  hover: "rgba(239,68,68,0.15)"  },
          ].map(btn => (
            <button
              key={btn.side}
              onClick={() => placeBet(btn.side)}
              disabled={isPending}
              style={{
                flex: 1, padding: "8px 0", borderRadius: 7,
                border: `1px solid ${btn.color}25`,
                background: btn.bg, color: btn.color,
                fontSize: 11, fontWeight: 700,
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.5 : 1,
                transition: "background 0.15s",
                fontFamily: "var(--sans)",
                pointerEvents: isPending ? "none" : "auto",
              }}
              onMouseEnter={e => e.currentTarget.style.background = btn.hover}
              onMouseLeave={e => e.currentTarget.style.background = btn.bg}
            >
              {isPending ? "…" : `${btn.label} · 0.001`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
