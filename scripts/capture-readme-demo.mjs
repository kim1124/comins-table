import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readdir, rename, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const scriptsRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = dirname(scriptsRoot);
const outputDirectory = join(repositoryRoot, "docs", "assets");
const outputPath = join(outputDirectory, "comins-table-demo.gif");
const frameDelay = 0.1;
let baseURL;
let server;
let browser;
let frameRoot;
let frameNumber = 0;
let port;
let stagingRoot;

async function settleLayout(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

function runSwift(arguments_, encoding) {
  try {
    return execFileSync("swift", arguments_, {
      cwd: repositoryRoot,
      encoding,
      stdio: encoding ? ["ignore", "pipe", "ignore"] : "ignore",
    });
  } catch {
    throw new Error("readme-gif: Swift command failed");
  }
}

async function waitForServerOwnership() {
  await new Promise((resolve, reject) => {
    let output = "";
    let settled = false;
    let timeout;

    function cleanup() {
      if (timeout) clearTimeout(timeout);
      server.stdout.off("data", handleOutput);
      server.off("error", rejectOwnership);
      server.off("exit", rejectOwnership);
    }

    function finish(callback, value) {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    }

    function resolveOwnership() {
      finish(resolve);
    }

    function rejectOwnership() {
      finish(reject, new Error("readme-gif: server unavailable"));
    }

    function handleOutput(chunk) {
      output = `${output}${chunk}`.slice(-8192);
      if (output.includes(`${baseURL}/`)) resolveOwnership();
    }

    server.stdout.on("data", handleOutput);
    server.once("error", rejectOwnership);
    server.once("exit", rejectOwnership);
    timeout = setTimeout(rejectOwnership, 6000);
    if (server.exitCode !== null) rejectOwnership();
  });
  server.stdout.resume();
}

async function waitForServer() {
  await waitForServerOwnership();
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) throw new Error("readme-gif: server unavailable");
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

async function generateReadmeGif() {
  port = Number(process.env.COMINS_TABLE_README_GIF_PORT ?? 4102);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("readme-gif: invalid port");
  }
  baseURL = `http://127.0.0.1:${port}`;
  frameRoot = await mkdtemp(join(tmpdir(), "comins-table-readme-frames-"));

  try {
    server = spawn(join(repositoryRoot, "node_modules", ".bin", "vite"), [
      "--config",
      "vite.example.config.ts",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ], { cwd: repositoryRoot, stdio: ["ignore", "pipe", "ignore"] });
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
    stagingRoot = await mkdtemp(join(outputDirectory, ".comins-table-readme-gif-"));
    const stagedOutputPath = join(stagingRoot, "comins-table-demo.gif");
    runSwift([
      join(scriptsRoot, "encode-readme-gif.swift"),
      stagedOutputPath,
      String(frameDelay),
      ...frames,
    ]);

    let metadata;
    try {
      metadata = JSON.parse(runSwift([
        join(scriptsRoot, "inspect-readme-gif.swift"),
        stagedOutputPath,
      ], "utf8"));
    } catch {
      throw new Error("readme-gif: metadata validation failed");
    }
    if (
      metadata.width !== 960
      || metadata.height !== 655
      || metadata.frameCount !== frames.length
      || metadata.loopCount !== 0
      || metadata.duration <= 0
      || metadata.duration > 12
      || Math.abs(metadata.duration - frames.length * frameDelay) > 0.05
    ) {
      throw new Error("readme-gif: metadata validation failed");
    }

    const result = await stat(stagedOutputPath);
    if (result.size > 5 * 1024 * 1024) throw new Error("readme-gif: size budget exceeded");
    await rename(stagedOutputPath, outputPath);
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
        try {
          if (stagingRoot) await rm(stagingRoot, { force: true, recursive: true });
        } finally {
          await rm(frameRoot, { force: true, recursive: true });
        }
      }
    }
  }
}

try {
  await generateReadmeGif();
} catch {
  process.stderr.write("readme-gif: generation failed\n");
  process.exitCode = 1;
}
