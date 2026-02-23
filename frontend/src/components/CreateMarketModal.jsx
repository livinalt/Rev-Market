import { useState } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { client } from "../App";
import { PM_ADDRESS, EM_ADDRESS, PM_ABI, EM_ABI } from "../lib/contracts";

export default function CreateMarketModal({ onClose, onCreated }) {
  const account = useActiveAccount();
  const { mutate: sendTx, isPending } = useSendTransaction();
  const [tab, setTab]           = useState("price");
  const [strike, setStrike]     = useState("");
  const [question, setQuestion] = useState("");
  const [expiry, setExpiry]     = useState("");
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  function validate() {
    if (!account) { setError("Connect your wallet first"); return false; }
    if (!expiry)  { setError("Expiry date is required"); return false; }
    if (new Date(expiry).getTime() <= Date.now()) { setError("Expiry must be in the future"); return false; }
    if (tab === "price" && (!strike || isNaN(strike) || Number(strike) <= 0)) {
      setError("Enter a valid strike price"); return false;
    }
    if (tab === "event" && !question.trim()) {
      setError("Enter a question"); return false;
    }
    return true;
  }

  function handleCreate() {
    setError("");
    setSuccess("");
    if (!validate()) return;

    const expiryTs = Math.floor(new Date(expiry).getTime() / 1000);

    if (tab === "price") {
      const strikeRaw = BigInt(Math.floor(Number(strike) * 1e8));
      const contract = getContract({ client, chain: baseSepolia, address: PM_ADDRESS, abi: PM_ABI });
      const tx = prepareContractCall({
        contract, method: "createMarket",
        params: [strikeRaw, BigInt(expiryTs)]
      });
      sendTx(tx, {
        onSuccess: () => { setSuccess("Price market created! âœ“"); setTimeout(() => { onCreated(); onClose(); }, 2000); },
        onError: e => setError(e.message.slice(0, 80))
      });
    } else {
      const contract = getContract({ client, chain: baseSepolia, address: EM_ADDRESS, abi: EM_ABI });
      const tx = prepareContractCall({
        contract, method: "createMarket",
        params: [question.trim(), BigInt(expiryTs)]
      });
      sendTx(tx, {
        onSuccess: () => { setSuccess("Event market created! âœ“"); setTimeout(() => { onCreated(); onClose(); }, 2000); },
        onError: e => setError(e.message.slice(0, 80))
      });
    }
  }

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid var(--border2)", background: "var(--bg)",
    color: "var(--text)", fontFamily: "var(--mono)", fontSize: 13,
    outline: "none", transition: "border-color 0.2s"
  };

  const labelStyle = {
    display: "block", fontFamily: "var(--mono)", fontSize: 10,
    color: "var(--muted)", textTransform: "uppercase",
    letterSpacing: 1, marginBottom: 6
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border2)",
        borderRadius: 16, padding: 28, width: "100%", maxWidth: 460,
        boxShadow: "0 24px 64px rgba(0,0,0,0.6)"
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
            color: "var(--muted)", fontSize: 14
          }}>âœ•</div>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 4, background: "var(--bg)", borderRadius: 10,
          padding: 4, marginBottom: 24
        }}>
          {["price", "event"].map(t => (
            <div key={t} onClick={() => { setTab(t); setError(""); }}
              style={{
                padding: "8px 0", textAlign: "center", borderRadius: 8,
                cursor: "pointer", fontFamily: "var(--mono)", fontSize: 12,
                fontWeight: tab === t ? 700 : 400, letterSpacing: 0.5,
                background: tab === t ? "var(--surface2)" : "transparent",
                color: tab === t ? "var(--text)" : "var(--muted)",
                border: tab === t ? "1px solid var(--border2)" : "1px solid transparent",
                transition: "all 0.2s", textTransform: "uppercase"
              }}>
              {t === "price" ? "í³ˆ Price Market" : "í¾¯ Event Market"}
            </div>
          ))}
        </div>

        {/* Form fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {tab === "price" ? (
            <div>
              <label style={labelStyle}>Strike Price (USD)</label>
              <input
                type="number" placeholder="e.g. 3000"
                value={strike} onChange={e => setStrike(e.target.value)}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--border2)"}
              />
              <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)", marginTop: 5 }}>
                Users predict if ETH will be ABOVE or BELOW this price at expiry
              </div>
            </div>
          ) : (
            <div>
              <label style={labelStyle}>Question</label>
              <textarea
                placeholder="e.g. Will Arsenal beat Chelsea on March 15 2026?"
                value={question} onChange={e => setQuestion(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--border2)"}
              />
              <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)", marginTop: 5 }}>
                Users predict YES or NO. CRE settles automatically at expiry.
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>Expiry Date & Time</label>
            <input
              type="datetime-local"
              value={expiry} onChange={e => setExpiry(e.target.value)}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
              style={{ ...inputStyle, colorScheme: "dark" }}
              onFocus={e => e.target.style.borderColor = "var(--accent)"}
              onBlur={e => e.target.style.borderColor = "var(--border2)"}
            />
          </div>
        </div>

        {/* Error / Success */}
        {error && (
          <div style={{
            marginTop: 14, padding: "8px 12px", borderRadius: 8,
            background: "var(--red-dim)", border: "1px solid rgba(248,113,113,0.3)",
            color: "var(--red)", fontFamily: "var(--mono)", fontSize: 12
          }}>{error}</div>
        )}
        {success && (
          <div style={{
            marginTop: 14, padding: "8px 12px", borderRadius: 8,
            background: "var(--green-dim)", border: "1px solid rgba(34,211,165,0.3)",
            color: "var(--green)", fontFamily: "var(--mono)", fontSize: 12
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
            userSelect: "none"
          }}
        >
          {isPending ? "Confirm in wallet..." : `Create ${tab === "price" ? "Price" : "Event"} Market`}
        </div>

        <div style={{
          marginTop: 12, textAlign: "center",
          fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)"
        }}>
          Transaction will be sent to Base Sepolia Â· No creation fee
        </div>
      </div>
    </div>
  );
}
