export function fmtEth(wei) {
  return (Number(wei) / 1e18).toFixed(4);
}

export function fmtPrice(raw) {
  return "$" + (Number(raw) / 1e8).toLocaleString("en-US", {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

export function calcProb(a, b) {
  const total = Number(a) + Number(b);
  if (total === 0) return 50;
  return Math.round((Number(a) / total) * 100);
}

export function fmtCountdown(expiry) {
  const diff = Number(expiry) - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0)  return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

export function shortenAddr(addr) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}
