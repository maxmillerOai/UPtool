import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Backend (backend/server.mjs) default port is 8792; override with BACKEND_URL.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8792";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: BACKEND_URL,
        changeOrigin: true,
      },
    },
  },
});
