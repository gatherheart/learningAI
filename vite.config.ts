import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// GitHub Pages serves under /<repo>/, so set base accordingly in CI.
// In dev, BASE is "/". Override via VITE_BASE in the workflow.
const base = process.env.VITE_BASE ?? "/";

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
