import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const API_TARGET = env["NWIS_API"] ?? "http://127.0.0.1:8000";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      allowedHosts: true,
      proxy: {
        "/api": { target: API_TARGET, changeOrigin: true },
      },
    },
    build: { outDir: "dist", sourcemap: true },
  };
});
