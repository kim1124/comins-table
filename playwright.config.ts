import { defineConfig } from "@playwright/test";

const isCI = Boolean(process.env.CI);

export default defineConfig({
  forbidOnly: isCI,
  outputDir: "reports/artifacts/playwright",
  reporter: isCI
    ? [["github"], ["html", { open: "never", outputFolder: "reports/artifacts/playwright-html" }], ["list"]]
    : [["html", { open: "never", outputFolder: "reports/artifacts/playwright-html" }], ["list"]],
  retries: isCI ? 1 : 0,
  failOnFlakyTests: process.env.PLAYWRIGHT_FAIL_ON_FLAKY_TESTS === "1",
  testDir: "test/playwright/specs",
  use: {
    baseURL: "http://127.0.0.1:4002",
    trace: "retain-on-failure-and-retries",
  },
  webServer: {
    command: "./node_modules/.bin/vite --config vite.example.config.ts --host 127.0.0.1 --port 4002",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    url: "http://127.0.0.1:4002",
  },
});
