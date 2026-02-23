const steps = [
  "CRE cron triggers every 5 min, checks market expiry on-chain",
  "Parallel HTTP fetch from 3 independent data sources",
  "Price: median aggregation · Event: majority vote (2/3)",
  "eth_tx task calls SettlementEngine.executeSettlement()",
  "Winners claim payout · INVALID outcome = full refund",
];

export default function HowItWorksModal({ onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border2)",
        borderRadius: 16, padding: 28, width: "100%", maxWidth: 520,
        boxShadow: "0 24px 64px rgba(0,0,0,0.6)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.5, marginBottom: 3 }}>
              How CRE Settlement Works
            </h2>
            <p style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>
              Chainlink CRE · Automated · Trustless
            </p>
          </div>
          <div onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 6, cursor: "pointer",
            background: "var(--bg)", border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--muted)", fontSize: 14, flexShrink: 0
          }}>✕</div>
        </div>

        {/* Description */}
        <p style={{
          fontSize: 13, color: "var(--muted)", lineHeight: 1.7,
          marginBottom: 20, padding: "12px 14px",
          background: "var(--bg)", borderRadius: 8,
          border: "1px solid var(--border)"
        }}>
          Chainlink CRE polls 3 independent data sources every 5 minutes.
          At expiry it aggregates results and submits a signed settlement
          transaction automatically — no admin keys in the settlement path.
        </p>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {steps.map((step, i) => (
            <div key={i} style={{
              display: "flex", gap: 12, alignItems: "flex-start",
              padding: "10px 12px", borderRadius: 8,
              background: "var(--bg)", border: "1px solid var(--border)",
              transition: "border-color 0.2s"
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(124,106,247,0.3)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
            >
              <span style={{
                width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                background: "rgba(124,106,247,0.15)", border: "1px solid rgba(124,106,247,0.25)",
                color: "var(--accent2)", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 9, marginTop: 1, fontWeight: 700
              }}>{i + 1}</span>
              <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)", lineHeight: 1.6 }}>
                {step}
              </span>
            </div>
          ))}
        </div>

        {/* Two market types */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Price Markets", desc: "Median of 3 price feeds", color: "var(--accent2)", bg: "rgba(124,106,247,0.08)", border: "rgba(124,106,247,0.2)" },
            { label: "Event Markets", desc: "Majority vote (2 of 3)", color: "var(--green)",   bg: "rgba(34,211,165,0.06)",  border: "rgba(34,211,165,0.15)" },
          ].map(t => (
            <div key={t.label} style={{
              padding: "12px 14px", borderRadius: 8,
              background: t.bg, border: `1px solid ${t.border}`
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.color, marginBottom: 4 }}>{t.label}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>{t.desc}</div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)",
          textAlign: "center", padding: "10px 0 0",
          borderTop: "1px solid var(--border)"
        }}>
          INVALID outcome triggers automatic full refunds to all participants
        </div>
      </div>
    </div>
  );
}
