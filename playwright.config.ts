import { defineConfig } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const port = process.env.PLAYWRIGHT_PORT ?? "4002";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  forbidOnly: true,
  outputDir: "reports/artifacts/playwright",
  reporter: isCI
    ? [["github"], ["html", { open: "never", outputFolder: "reports/artifacts/playwright-html" }], ["list"]]
    : [["html", { open: "never", outputFolder: "reports/artifacts/playwright-html" }], ["list"]],
  retries: 0,
  failOnFlakyTests: true,
  workers: 1,
  testDir: "test/playwright/specs",
  use: {
    baseURL,
    browserName: "chromium",
    deviceScaleFactor: 1,
    headless: true,
    locale: "en-US",
    reducedMotion: "no-preference",
    timezoneId: "UTC",
    trace: "retain-on-failure-and-retries",
    viewport: { height: 720, width: 1280 },
  },
  webServer: {
    command: `./node_modules/.bin/vite --config vite.example.config.ts --host 127.0.0.1 --port ${port}`,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1",
    timeout: 30_000,
    url: baseURL,
  },
});
