const STORAGE_KEY = "recentInboxes";
const MAX_RECENT = 8;

// Most-recent-first list of inbox addresses the user has visited.
export const getRecentInboxes = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string" && item.length > 0) : [];
  } catch {
    return [];
  }
};

export const addRecentInbox = (emailId) => {
  if (!emailId) return;
  const list = [emailId, ...getRecentInboxes().filter((item) => item !== emailId)].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // storage full/unavailable — non-fatal
  }
  // Kept for backward compatibility with the /inbox redirect.
  localStorage.setItem("lastEmailId", emailId);
};
