import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Keep the legacy REACT_APP_* variable names working (they are also what
  // react-inject-env injects at container start via build/env.js).
  envPrefix: ["VITE_", "REACT_APP_"],
  server: {
    port: 3000,
  },
  build: {
    // The Docker image and the mailserver's static file serving expect build/.
    outDir: "build",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
    css: false,
  },
});
