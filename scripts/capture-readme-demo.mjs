import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const scriptsRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = dirname(scriptsRoot);
const outputDirectory = join(repositoryRoot, "docs", "assets");
const outputPath = join(outputDirectory, "comins-table-demo.gif");
const frameRoot = await mkdtemp(join(tmpdir(), "comins-table-readme-frames-"));
const port = Number(process.env.COMINS_TABLE_README_GIF_PORT ?? 4102);
const baseURL = `http://127.0.0.1:${port}`;
const frameDelay = 0.1;
let server;
let browser;
let frameNumber = 0;

async function settleLayout(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseURL}/readme-demo`);
      if (response.ok) return;
    } catch {
      // The fixed local server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("readme-gif: server unavailable");
}

async function capture(page, count = 1) {
  const surface = page.getByTestId("readme-demo");
  const box = await surface.boundingBox();
  if (!box) throw new Error("readme-gif: capture surface unavailable");

  for (let index = 0; index < count; index += 1) {
    await settleLayout(page);
    const filename = `frame-${String(frameNumber).padStart(3, "0")}.png`;
    frameNumber += 1;
    await page.screenshot({
      clip: {
        height: Math.floor(box.height),
        width: Math.min(960, Math.floor(box.width)),
        x: Math.floor(box.x),
        y: Math.floor(box.y),
      },
      path: join(frameRoot, filename),
    });
  }
}

async function resetFlatHorizontalScroll(page) {
  await settleLayout(page);
  await page
    .getByTestId("readme-demo-flat")
    .locator(".comins-table__body-viewport")
    .evaluate((element) => {
      element.scrollLeft = 0;
      element.dispatchEvent(new Event("scroll"));
    });
}

async function dragHeader(page, source, target) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("readme-gif: Header geometry unavailable");
  const start = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };
  const end = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let step = 1; step <= 12; step += 1) {
    await page.mouse.move(
      start.x + ((end.x - start.x) * step) / 12,
      start.y + ((end.y - start.y) * step) / 12,
    );
    await capture(page);
  }
  await page.mouse.up();
  await resetFlatHorizontalScroll(page);
  await capture(page, 4);
}

try {
  server = spawn(join(repositoryRoot, "node_modules", ".bin", "vite"), [
    "--config",
    "vite.example.config.ts",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
  ], { cwd: repositoryRoot, stdio: "ignore" });
  await waitForServer();

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { height: 760, width: 1000 } });
  await page.goto(`${baseURL}/readme-demo`);
  await page.getByRole("heading", { name: "Controlled data grids for React" }).waitFor();
  await page.getByTestId("readme-demo").evaluate((element) => {
    element.style.height = "655px";
  });
  await capture(page, 8);

  const flat = page.getByTestId("readme-demo-flat");
  await flat.getByTestId("header-age").click();
  await capture(page, 6);
  await dragHeader(page, flat.getByTestId("header-name"), flat.getByTestId("header-team"));

  await flat
    .getByTestId("virtual-list-record-a-tasks")
    .locator("[data-comins-virtual-list-item='true']")
    .first()
    .click();
  await resetFlatHorizontalScroll(page);
  await capture(page, 6);
  const more = flat.getByTestId("virtual-list-overflow-record-a-tasks");
  await more.focus();
  await more.press("Enter");
  await resetFlatHorizontalScroll(page);
  await capture(page, 8);

  await page.getByTestId("readme-demo-view-tree").click();
  await capture(page, 8);
  const tree = page.getByTestId("readme-demo-tree");
  await tree.getByRole("button", { name: "Expand all" }).click();
  await capture(page, 8);
  await tree.getByRole("button", { name: "Fold all" }).click();
  await capture(page, 8);

  const frames = (await readdir(frameRoot))
    .filter((name) => name.endsWith(".png"))
    .sort()
    .map((name) => join(frameRoot, name));
  if (frames.length === 0 || frames.length * frameDelay > 12) {
    throw new Error("readme-gif: duration budget exceeded");
  }

  await mkdir(outputDirectory, { recursive: true });
  execFileSync("swift", [
    join(scriptsRoot, "encode-readme-gif.swift"),
    outputPath,
    String(frameDelay),
    ...frames,
  ], { cwd: repositoryRoot, stdio: "inherit" });

  const result = await stat(outputPath);
  if (result.size > 5 * 1024 * 1024) throw new Error("readme-gif: size budget exceeded");
  process.stdout.write("README GIF generated.\n");
} finally {
  try {
    await browser?.close();
  } finally {
    try {
      if (server && server.exitCode === null) {
        const serverExit = once(server, "exit");
        server.kill("SIGTERM");
        await serverExit;
      }
    } finally {
      await rm(frameRoot, { force: true, recursive: true });
    }
  }
}
