import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  root: ".",
  build: {
    outDir: "dist/client",
    emptyOutDir: true
  },
  server: {
    allowedHosts: [".replit.dev", ".repl.co"],
    host: "0.0.0.0",
    port: 5173
  }
});
