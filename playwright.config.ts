import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "test/playwright/specs",
  use: {
    baseURL: "http://127.0.0.1:4002",
    trace: "on-first-retry",
  },
  webServer: {
    command: "./node_modules/.bin/vite --config vite.example.config.ts --host 127.0.0.1 --port 4002",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    url: "http://127.0.0.1:4002",
  },
});
