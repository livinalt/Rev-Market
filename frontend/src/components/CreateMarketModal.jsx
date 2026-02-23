import { useState } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { sepolia } from "thirdweb/chains";
import { client } from "../App";
import { MARKET_ADDRESS, MARKET_ABI } from "../lib/contracts";

export default function CreateMarketModal({ onClose, onCreated }) {
  const account = useActiveAccount();
  const { mutate: sendTx, isPending } = useSendTransaction();
  const [question, setQuestion] = useState("");
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  function validate() {
    if (!account)          { setError("Connect your wallet first"); return false; }
    if (!question.trim())  { setError("Enter a question"); return false; }
    return true;
  }

  function handleCreate() {
    setError("");
    setSuccess("");
    if (!validate()) return;

    const contract = getContract({
      client,
      chain: sepolia,
      address: MARKET_ADDRESS,
      abi: MARKET_ABI,
    });

    const tx = prepareContractCall({
      contract,
      method: "createMarket",
      params: [question.trim()],
    });

    sendTx(tx, {
      onSuccess: () => {
        setSuccess("Market created! ✓");
        setTimeout(() => { onCreated(); onClose(); }, 2000);
      },
      onError: e => setError(e.message.slice(0, 80)),
    });
  }

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid var(--border2)", background: "var(--bg)",
    color: "var(--text)", fontFamily: "var(--mono)", fontSize: 13,
    outline: "none", transition: "border-color 0.2s",
  };

  const labelStyle = {
    display: "block", fontFamily: "var(--mono)", fontSize: 10,
    color: "var(--muted)", textTransform: "uppercase",
    letterSpacing: 1, marginBottom: 6,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border2)",
        borderRadius: 16, padding: 28, width: "100%", maxWidth: 460,
        boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>
            Create Market
          </h2>
          <div onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 6, cursor: "pointer",
            background: "var(--bg)", border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--muted)", fontSize: 14,
          }}>✕</div>
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Question</label>
            <textarea
              placeholder="e.g. Will ETH be above $3000 by June 2026?"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
              onFocus={e => e.target.style.borderColor = "var(--accent)"}
              onBlur={e => e.target.style.borderColor = "var(--border2)"}
            />
            <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)", marginTop: 5 }}>
              Ask any yes/no question. Chainlink CRE + Gemini AI will settle it automatically.
            </div>
          </div>
        </div>

        {/* Error / Success */}
        {error && (
          <div style={{
            marginTop: 14, padding: "8px 12px", borderRadius: 8,
            background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.3)",
            color: "#f87171", fontFamily: "var(--mono)", fontSize: 12,
          }}>{error}</div>
        )}
        {success && (
          <div style={{
            marginTop: 14, padding: "8px 12px", borderRadius: 8,
            background: "rgba(34,211,165,0.07)", border: "1px solid rgba(34,211,165,0.3)",
            color: "#22d3a5", fontFamily: "var(--mono)", fontSize: 12,
          }}>{success}</div>
        )}

        {/* Submit */}
        <div
          onClick={!isPending ? handleCreate : undefined}
          style={{
            marginTop: 20, padding: "12px 0", textAlign: "center",
            borderRadius: 10, cursor: isPending ? "default" : "pointer",
            background: isPending ? "var(--border2)" : "linear-gradient(135deg, var(--accent), #22d3a5)",
            color: isPending ? "var(--muted)" : "#000",
            fontWeight: 700, fontSize: 14, letterSpacing: 0.3,
            opacity: isPending ? 0.7 : 1, transition: "opacity 0.2s",
            userSelect: "none",
          }}
        >
          {isPending ? "Confirm in wallet..." : "Create Market"}
        </div>

        <div style={{
          marginTop: 12, textAlign: "center",
          fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)",
        }}>
          Ethereum Sepolia · No creation fee · Settled by Gemini AI
        </div>
      </div>
    </div>
  );
}