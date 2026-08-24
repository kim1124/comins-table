import { defineConfig } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const port = process.env.PLAYWRIGHT_PORT ?? "4002";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  forbidOnly: isCI,
  outputDir: "reports/artifacts/playwright",
  reporter: isCI
    ? [["github"], ["html", { open: "never", outputFolder: "reports/artifacts/playwright-html" }], ["list"]]
    : [["html", { open: "never", outputFolder: "reports/artifacts/playwright-html" }], ["list"]],
  retries: isCI ? 1 : 0,
  failOnFlakyTests: isCI || process.env.PLAYWRIGHT_FAIL_ON_FLAKY_TESTS === "1",
  testDir: "test/playwright/specs",
  use: {
    baseURL,
    trace: "retain-on-failure-and-retries",
  },
  webServer: {
    command: `./node_modules/.bin/vite --config vite.example.config.ts --host 127.0.0.1 --port ${port}`,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1",
    timeout: 30_000,
    url: baseURL,
  },
});
