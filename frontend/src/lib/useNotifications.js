// src/lib/useNotifications.js
import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY   = "foresight_notifications";
const MAX_NOTIFS    = 50;
const STALE_MS      = 5 * 60 * 1000; // 5 minutes → stale

function loadFromStorage(addr) {
  try {
    const key = addr ? `${STORAGE_KEY}_${addr.toLowerCase()}` : STORAGE_KEY;
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch { return []; }
}

function saveToStorage(notifications, addr) {
  try {
    const key = addr ? `${STORAGE_KEY}_${addr.toLowerCase()}` : STORAGE_KEY;
    localStorage.setItem(key, JSON.stringify(notifications.slice(0, MAX_NOTIFS)));
  } catch {}
}

export function useNotifications(addr) {
  const [notifications, setNotifications] = useState(() => loadFromStorage(addr));

  // Tick every 30s to move pending → stale automatically
  useEffect(() => {
    const tick = setInterval(() => {
      setNotifications(prev => {
        const now     = Date.now();
        let changed   = false;
        const updated = prev.map(n => {
          if (n.status === "pending" && now - n.timestamp > STALE_MS) {
            changed = true;
            return { ...n, status: "stale" };
          }
          return n;
        });
        if (changed) {
          saveToStorage(updated, addr);
          return updated;
        }
        return prev;
      });
    }, 30_000);
    return () => clearInterval(tick);
  }, [addr]);

  const addNotification = useCallback((notification) => {
    const n = {
      id:        Date.now() + Math.random(),
      timestamp: Date.now(),
      read:      false,
      status:    "default", // default | pending | stale | resolved | dismissed
      ...notification,
    };
    setNotifications(prev => {
      const updated = [n, ...prev].slice(0, MAX_NOTIFS);
      saveToStorage(updated, addr);
      return updated;
    });
    return n.id;
  }, [addr]);

  // Update an existing notification by id
  const updateNotification = useCallback((id, patch) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, ...patch } : n);
      saveToStorage(updated, addr);
      return updated;
    });
  }, [addr]);

  // Dismiss a pending/stale settlement notification → clears pending state
  const dismissSettlement = useCallback((notifId, marketId) => {
    // Clear localStorage pending flag for this market
    localStorage.removeItem(`pending_settlement_${marketId}`);
    // Mark notification as dismissed
    setNotifications(prev => {
      const updated = prev.map(n =>
        n.id === notifId
          ? { ...n, status: "dismissed", read: true, detail: "Dismissed — you can retry from the market card" }
          : n
      );
      saveToStorage(updated, addr);
      return updated;
    });
  }, [addr]);

  // Called when CRE successfully settles — update the pending notification
  const resolveSettlement = useCallback((marketId, outcome) => {
    localStorage.removeItem(`pending_settlement_${marketId}`);
    setNotifications(prev => {
      const updated = prev.map(n =>
        n.status === "pending" && n.marketId === marketId
          ? { ...n, status: "resolved", read: false, title: `Market #${marketId} settled — ${outcome}`, detail: "CRE responded successfully", icon: "⚡", color: "#22d3a5" }
          : n
      );
      saveToStorage(updated, addr);
      return updated;
    });
  }, [addr]);

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveToStorage(updated, addr);
      return updated;
    });
  }, [addr]);

  const clearAll = useCallback(() => {
    // Also clear all pending settlement flags
    notifications.forEach(n => {
      if (n.marketId) localStorage.removeItem(`pending_settlement_${n.marketId}`);
    });
    setNotifications([]);
    saveToStorage([], addr);
  }, [addr, notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    addNotification,
    updateNotification,
    dismissSettlement,
    resolveSettlement,
    markAllRead,
    clearAll,
    unreadCount,
  };
}

// ── Notification factory helpers ──────────────────────────────────────
export const notify = {
  marketCreated: (id, question) => ({
    type:    "created",
    icon:    "✦",
    title:   `Market #${id} created`,
    detail:  question?.slice(0, 60) + (question?.length > 60 ? "…" : ""),
    color:   "#a78bfa",
  }),

  predicted: (id, side, amount) => ({
    type:    "predicted",
    icon:    "◎",
    title:   `Predicted ${side === 0 ? "YES" : "NO"} on Market #${id}`,
    detail:  `${(Number(amount) / 1e18).toFixed(4)} ETH staked`,
    color:   side === 0 ? "#22c55e" : "#ef4444",
  }),

  // Settlement requested — starts as pending, auto-updates to stale after 5min
  settlementRequested: (id, question) => ({
    type:     "settlement",
    status:   "pending",
    icon:     "⟳",
    title:    `Settlement requested on Market #${id}`,
    detail:   "Waiting for CRE to query Gemini AI…",
    color:    "#a78bfa",
    marketId: id,
    question: question?.slice(0, 60) + (question?.length > 60 ? "…" : ""),
  }),

  won: (id, question) => ({
    type:     "won",
    icon:     "🏆",
    title:    `You won on Market #${id}!`,
    detail:   question?.slice(0, 60) + (question?.length > 60 ? "…" : ""),
    color:    "#22d3a5",
    action:   "claim",
    marketId: id,
  }),

  lost: (id, question) => ({
    type:    "lost",
    icon:    "◌",
    title:   `Market #${id} resolved — you lost`,
    detail:  question?.slice(0, 60) + (question?.length > 60 ? "…" : ""),
    color:   "#6b7280",
  }),

  claimed: (id, amount) => ({
    type:   "claimed",
    icon:   "💰",
    title:  `Claimed ${(Number(amount) / 1e18).toFixed(4)} ETH`,
    detail: `From Market #${id}`,
    color:  "#fbbf24",
  }),

  settled: (id, question) => ({
    type:    "settled",
    icon:    "⚡",
    title:   `Settlement requested on Market #${id}`,
    detail:  question?.slice(0, 60) + (question?.length > 60 ? "…" : ""),
    color:   "#fbbf24",
  }),
};