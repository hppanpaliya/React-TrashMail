// Default runtime environment for local development.
// In Docker, docker_start.sh overwrites build/env.js with real values
// via `npx react-inject-env set` (REACT_APP_* variables).
window.env = window.env || {};
