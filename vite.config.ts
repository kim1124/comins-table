import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: {
        clipboard: "src/clipboard.ts",
        core: "src/core.ts",
        index: "src/index.tsx",
        selection: "src/selection.ts",
      },
      fileName: (_format, entryName) => `${entryName}.js`,
      formats: ["es"],
      name: "KmsfDataTable",
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
    },
    sourcemap: true,
  },
  test: {
    exclude: [...configDefaults.exclude, "test/playwright/**"],
  },
});
