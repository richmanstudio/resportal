import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@resportal/shared": fileURLToPath(new URL("../../packages/shared/src", import.meta.url))
    }
  },
  server: {
    port: 5173
  }
});
