import { createContext, useContext, useEffect, useState } from "react";
import api, { isCanceled } from "../api";
import { useAuth } from "./AuthContext";

// Server-provided config: { retentionDays, domains }.
// If GET /api/config is unavailable (older backend → 404), both stay null
// and dependent features (expiry chips, server domain list) hide gracefully.
const ConfigContext = createContext({ retentionDays: null, domains: null });

export const ConfigProvider = ({ children }) => {
  const { token } = useAuth();
  const [config, setConfig] = useState({ retentionDays: null, domains: null });

  useEffect(() => {
    if (!token) return undefined;

    const controller = new AbortController();

    api
      .get("/api/config", { signal: controller.signal })
      .then((response) => {
        const { retentionDays, domains } = response.data || {};
        setConfig({
          retentionDays: Number.isFinite(retentionDays) && retentionDays > 0 ? retentionDays : null,
          domains: Array.isArray(domains) && domains.length > 0 ? domains : null,
        });
      })
      .catch((error) => {
        if (!isCanceled(error)) {
          // Endpoint missing or failing — hide config-driven features.
          setConfig({ retentionDays: null, domains: null });
        }
      });

    return () => controller.abort();
  }, [token]);

  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
};

export const useConfig = () => useContext(ConfigContext);
