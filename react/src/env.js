const defaultEnv = {
  REACT_APP_API_URL: '',
  REACT_APP_DOMAINS: '["react-mail.com"]',
};

export const env = { ...defaultEnv, ...process.env, ...window["env"] };
