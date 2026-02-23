import { useEffect } from "react";

export default function Toast({ toast }) {
  if (!toast) return null;
  const colors = {
    success: { bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.25)",  color: "#22c55e" },
    error:   { bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.25)",  color: "#ef4444" },
    info:    { bg: "rgba(124,106,247,0.1)", border: "rgba(124,106,247,0.25)", color: "#a78bfa" },
  };
  const c = colors[toast.kind] || colors.info;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 999,
      padding: "10px 16px", borderRadius: 8,
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
      fontFamily: "var(--mono)", fontSize: 12,
      boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      animation: "slideUp 0.2s ease",
      maxWidth: 320,
    }}>
      {toast.msg}
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
