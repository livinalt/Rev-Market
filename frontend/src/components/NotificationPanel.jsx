// src/components/NotificationPanel.jsx

function timeAgo(timestamp) {
  const diff  = Date.now() - timestamp;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function StatusDot({ status }) {
  const map = {
    pending:   { color: "#a78bfa", pulse: true  },
    stale:     { color: "#fbbf24", pulse: false },
    resolved:  { color: "#22d3a5", pulse: false },
    dismissed: { color: "#6b7280", pulse: false },
    default:   { color: null,      pulse: false },
  };
  const s = map[status] || map.default;
  if (!s.color) return null;
  return (
    <span style={{
      width: 6, height: 6, borderRadius: "50%",
      background: s.color,
      boxShadow: s.pulse ? `0 0 5px ${s.color}` : "none",
      display: "inline-block", flexShrink: 0, marginTop: 5,
      animation: s.pulse ? "pulseGlow 1.8s ease-in-out infinite" : "none",
    }} />
  );
}

function NotificationItem({ n, onDismissSettlement, onClaimClick }) {
  const isPending   = n.status === "pending";
  const isStale     = n.status === "stale";
  const isDismissed = n.status === "dismissed";
  const isResolved  = n.status === "resolved";

  // Border color based on status
  const borderColor = isPending  ? "rgba(167,139,250,0.25)"
    : isStale                    ? "rgba(251,191,36,0.3)"
    : isDismissed                ? "transparent"
    : "transparent";

  // Background based on status
  const bg = isPending  ? "rgba(124,106,247,0.04)"
    : isStale            ? "rgba(251,191,36,0.04)"
    : n.read             ? "transparent"
    : "rgba(124,106,247,0.03)";

  return (
    <div style={{
      padding: "12px 16px",
      borderBottom: "1px solid var(--border)",
      background: bg,
      borderLeft: `3px solid ${!n.read && !isDismissed ? (n.color || "#7c6af7") : borderColor || "transparent"}`,
      opacity: isDismissed ? 0.5 : 1,
      transition: "all 0.2s",
      cursor: n.action === "claim" ? "pointer" : "default",
    }}
      onClick={() => { if (n.action === "claim" && onClaimClick) onClaimClick(n.marketId); }}
      onMouseEnter={e => { if (n.action === "claim") e.currentTarget.style.background = "rgba(34,211,165,0.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = bg; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>

        {/* Icon */}
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: `${n.color || "#7c6af7"}15`,
          border: `1px solid ${n.color || "#7c6af7"}25`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: isPending ? 14 : 13,
          animation: isPending ? "spin 2s linear infinite" : "none",
        }}>
          {isPending ? "⟳" : n.icon}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: isDismissed ? "var(--muted)" : n.read ? "var(--muted)" : "var(--text)",
              lineHeight: 1.4,
            }}>
              {n.title}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
              <StatusDot status={n.status} />
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)", marginTop: 2 }}>
                {timeAgo(n.timestamp)}
              </span>
            </div>
          </div>

          {/* Detail */}
          {n.detail && (
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", marginTop: 3, lineHeight: 1.5, wordBreak: "break-word" }}>
              {n.detail}
            </div>
          )}

          {/* Pending — progress hint */}
          {isPending && (
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ flex: 1, height: 2, borderRadius: 99, background: "var(--border2)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: "60%", background: "#a78bfa", borderRadius: 99, animation: "progressSlide 1.8s ease-in-out infinite" }} />
              </div>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#a78bfa", flexShrink: 0 }}>
                CRE running…
              </span>
            </div>
          )}

          {/* Stale — warning + dismiss */}
          {isStale && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{
                padding: "6px 8px", borderRadius: 6,
                background: "rgba(251,191,36,0.07)",
                border: "1px solid rgba(251,191,36,0.2)",
                fontFamily: "var(--mono)", fontSize: 9, color: "#fbbf24", lineHeight: 1.5,
              }}>
                ⚠ CRE didn't respond in 5 min — Gemini quota may be exhausted.{" "}
                <a href="https://aistudio.google.com" target="_blank" rel="noreferrer"
                  style={{ color: "#fbbf24", textDecoration: "underline" }}
                  onClick={e => e.stopPropagation()}
                >
                  Check quota ↗
                </a>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div
                  onClick={e => { e.stopPropagation(); onDismissSettlement(n.id, n.marketId); }}
                  style={{
                    padding: "4px 12px", borderRadius: 6, cursor: "pointer",
                    border: "1px solid var(--border2)",
                    background: "transparent",
                    fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "var(--text)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted)"; }}
                >
                  Dismiss
                </div>
              </div>
            </div>
          )}

          {/* Resolved */}
          {isResolved && (
            <div style={{ marginTop: 4, fontFamily: "var(--mono)", fontSize: 9, color: "#22d3a5" }}>
              ✓ CRE responded successfully
            </div>
          )}

          {/* Claim action */}
          {n.action === "claim" && (
            <div style={{ marginTop: 6, fontFamily: "var(--mono)", fontSize: 10, color: "#22d3a5", fontWeight: 600 }}>
              Tap to claim winnings →
            </div>
          )}
        </div>

        {/* Unread dot */}
        {!n.read && !isDismissed && (
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: n.color || "#7c6af7", flexShrink: 0, marginTop: 4 }} />
        )}
      </div>
    </div>
  );
}

export default function NotificationPanel({ notifications, unreadCount, onMarkAllRead, onClearAll, onClose, onClaimClick, onDismissSettlement }) {
  const pendingCount = notifications.filter(n => n.status === "pending").length;
  const staleCount   = notifications.filter(n => n.status === "stale").length;

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={onClose} />

      {/* Panel */}
      <div style={{
        position: "fixed",
        top: 0, right: 0, bottom: 0,
        width: "min(400px, 100vw)",
        zIndex: 200,
        background: "var(--surface, #0d1117)",
        borderLeft: "1px solid var(--border2, #30363d)",
        display: "flex", flexDirection: "column",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
        animation: "slideInRight 0.2s ease",
      }}>

        {/* Header */}
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>🔔</span>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.3 }}>Notifications</span>
            {unreadCount > 0 && (
              <span style={{ background: "#7c6af7", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99, fontFamily: "var(--mono)" }}>
                {unreadCount}
              </span>
            )}
            {/* Pending / stale indicators */}
            {pendingCount > 0 && (
              <span style={{ fontSize: 9, fontFamily: "var(--mono)", color: "#a78bfa", background: "rgba(124,106,247,0.1)", padding: "1px 6px", borderRadius: 99, border: "1px solid rgba(124,106,247,0.2)" }}>
                {pendingCount} pending
              </span>
            )}
            {staleCount > 0 && (
              <span style={{ fontSize: 9, fontFamily: "var(--mono)", color: "#fbbf24", background: "rgba(251,191,36,0.08)", padding: "1px 6px", borderRadius: 99, border: "1px solid rgba(251,191,36,0.2)" }}>
                {staleCount} stale
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {unreadCount > 0 && (
              <div onClick={onMarkAllRead}
                style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", cursor: "pointer", padding: "4px 8px", borderRadius: 6, transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "var(--text)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted)"; }}
              >
                Mark all read
              </div>
            )}
            {notifications.length > 0 && (
              <div onClick={onClearAll}
                style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", cursor: "pointer", padding: "4px 8px", borderRadius: 6, transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#ef4444"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted)"; }}
              >
                Clear all
              </div>
            )}
            <div onClick={onClose}
              style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted)", fontSize: 14, transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted)"; }}
            >✕</div>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {notifications.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: "var(--muted)" }}>
              <span style={{ fontSize: 32, opacity: 0.3 }}>🔔</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>No notifications yet</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, opacity: 0.6, textAlign: "center", maxWidth: 220, lineHeight: 1.6 }}>
                Activity from predictions, settlements and claims will appear here
              </span>
            </div>
          ) : (
            notifications.map(n => (
              <NotificationItem
                key={n.id}
                n={n}
                onDismissSettlement={onDismissSettlement}
                onClaimClick={onClaimClick}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)", textAlign: "center" }}>
            Notifications stored locally · Last 50 events
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes progressSlide {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </>
  );
}