import { defineConfig } from "@playwright/test";
import { readMemoryPlaygroundMode, shouldReusePlaygroundServer } from "./test/playwright/helpers/playground-build";

const isCI = Boolean(process.env.CI);
const port = process.env.PLAYWRIGHT_PORT ?? "4002";
if (!/^\d+$/u.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error("Invalid Playground port");
const buildMode = readMemoryPlaygroundMode(process.env.PLAYWRIGHT_PLAYGROUND_MODE);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  forbidOnly: true,
  outputDir: "reports/artifacts/playwright",
  reporter: isCI
    ? [["./test/playwright/reporters/memory-layers.ts"], ["github"], ["html", { open: "never", outputFolder: "reports/artifacts/playwright-html" }], ["list"]]
    : [["./test/playwright/reporters/memory-layers.ts"], ["html", { open: "never", outputFolder: "reports/artifacts/playwright-html" }], ["list"]],
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
    command: `node scripts/serve-memory-playground.mjs --mode ${buildMode} --port ${port}`,
    reuseExistingServer: shouldReusePlaygroundServer(buildMode, process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER),
    timeout: buildMode === "production" ? 120_000 : 30_000,
    url: baseURL,
  },
});
