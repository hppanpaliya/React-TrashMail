const defaultEnv = {
  REACT_APP_API_URL: "",
  REACT_APP_DOMAINS: '["react-mail.com"]',
};

// Build-time env comes from Vite (envPrefix allows REACT_APP_*),
// runtime env comes from /env.js (window.env), regenerated in Docker
// by react-inject-env at container start. Runtime wins.
export const env = { ...defaultEnv, ...import.meta.env, ...window["env"] };
