import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "example",
  optimizeDeps: { include: ["xlsx", "@federicocarboni/saxe", "write-excel-file/universal", "write-excel-file/utility", "@zip.js/zip.js/index-native.js"] },
  server: {
    host: "127.0.0.1",
    port: 4002,
    strictPort: true,
  },
});
