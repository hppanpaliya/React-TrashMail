// Parse the REACT_APP_DOMAINS env var, which may be a JSON array,
// a comma-separated string, or a mix of both.
export const parseDomains = (envVar) => {
  if (!envVar) return ["example.com"];

  let domains;

  try {
    const parsed = JSON.parse(envVar);
    if (Array.isArray(parsed)) {
      domains = parsed.flatMap((item) => (typeof item === "string" ? item.split(",").map((d) => d.trim()) : []));
    } else {
      domains = [String(parsed)];
    }
  } catch {
    domains = envVar.split(",").map((d) => d.trim());
  }

  return domains.map((d) => d.replace(/[[\]"']/g, "").trim()).filter((d) => d.length > 0);
};
