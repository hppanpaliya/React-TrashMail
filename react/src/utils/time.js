// Relative/absolute time formatting for email timestamps.

export const formatAbsoluteTime = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString();
};

export const formatRelativeTime = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const diffSeconds = Math.round((Date.now() - d.getTime()) / 1000);
  if (diffSeconds < 45) return "just now";

  const minutes = Math.round(diffSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;

  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;

  return `${Math.round(days / 365)}y ago`;
};
