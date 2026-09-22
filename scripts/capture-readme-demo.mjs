import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readdir, rename, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { finalizeReadmeGifs } from "./finalize-readme-gif.mjs";
import { waitForReadmeState } from "./wait-for-readme-state.mjs";

const scriptsRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = dirname(scriptsRoot);
const outputDirectory = join(repositoryRoot, "docs", "assets");
const legacyOutputPath = join(outputDirectory, "comins-table-demo.gif");
const frameDelay = 0.1;
const readyAssets = [];
const temporaryRoots = new Set();
let baseURL;
let server;
let browser;

function assert(condition, message) {
  if (!condition) throw new Error(`readme-gif: ${message}`);
}

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
      const response = await fetch(`${baseURL}/readme-demo?feature=column-pinning`);
      if (response.ok) return;
    } catch {
      // The fixed local server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("readme-gif: server unavailable");
}

async function capture(page, frameRoot, frameState, count = 1) {
  const surface = page.getByTestId("readme-demo");
  const box = await surface.boundingBox();
  if (!box) throw new Error("readme-gif: capture surface unavailable");

  for (let index = 0; index < count; index += 1) {
    await settleLayout(page);
    const filename = `frame-${String(frameState.number).padStart(3, "0")}.png`;
    frameState.number += 1;
    await page.screenshot({
      clip: {
        height: 655,
        width: 960,
        x: Math.floor(box.x),
        y: Math.floor(box.y),
      },
      path: join(frameRoot, filename),
    });
  }
}

async function dragWithCapture(page, source, target, captureFrame, targetYRatio = 0.5) {
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  await source.hover();
  await page.mouse.down();
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  assert(sourceBox && targetBox, "Drag geometry unavailable");

  const start = {
    x: sourceBox.x + sourceBox.width / 2,
    y: sourceBox.y + sourceBox.height / 2,
  };
  const end = {
    x: targetBox.x + targetBox.width / 2,
    y: targetBox.y + targetBox.height * targetYRatio,
  };

  for (let step = 1; step <= 12; step += 1) {
    await page.mouse.move(
      start.x + ((end.x - start.x) * step) / 12,
      start.y + ((end.y - start.y) * step) / 12,
    );
    await captureFrame();
  }
  await page.mouse.up();
  await settleLayout(page);
}

async function captureColumnPinning(page, captureFrame) {
  const table = page.getByTestId("readme-demo-column-pinning-table");
  const root = table.locator("xpath=..");
  const scrollbar = root.getByTestId("table-horizontal-scrollbar");
  const leftHeader = root.getByTestId("header-name");
  const rightHeader = root.getByTestId("header-status");

  assert(await scrollbar.isVisible(), "Column Pinning scrollbar unavailable");
  assert(await leftHeader.getAttribute("data-comins-pinned") === "left", "left pin unavailable");
  assert(await rightHeader.getAttribute("data-comins-pinned") === "right", "right pin unavailable");
  await captureFrame(8);

  await scrollbar.hover();
  for (let step = 0; step < 6; step += 1) {
    await page.mouse.wheel(220, 0);
    await captureFrame(2);
  }
  assert(await scrollbar.evaluate((element) => element.scrollLeft) > 500, "Column Pinning scroll did not advance");
  await captureFrame(8);

  for (let step = 0; step < 6; step += 1) {
    await page.mouse.wheel(-220, 0);
    await captureFrame();
  }
  await captureFrame(5);
}

async function captureRowGrouping(page, captureFrame) {
  const table = page.getByTestId("readme-demo-row-grouping-table");
  const platformToggle = table.getByTestId("group-toggle-platform");
  const groupRows = table.locator("tr[data-comins-group-row='true']");

  await waitForReadmeState(
    async () => await groupRows.count() === 3,
    "Row Grouping groups unavailable",
  );
  await captureFrame(8);
  await platformToggle.click();
  await waitForReadmeState(
    async () => await platformToggle.getAttribute("aria-expanded") === "false",
    "Row Grouping collapse failed",
  );
  await captureFrame(6);
  await platformToggle.click();
  await waitForReadmeState(
    async () => await platformToggle.getAttribute("aria-expanded") === "true",
    "Row Grouping expand failed",
  );
  await captureFrame(5);

  await dragWithCapture(
    page,
    table.getByTestId("group-drag-handle-platform"),
    table.getByTestId("group-row-experience"),
    () => captureFrame(),
    0.9,
  );
  await waitForReadmeState(
    async () => {
      const order = await groupRows.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-comins-group-id")));
      return order.join(",") === "empty,experience,platform";
    },
    "Row Grouping reorder failed",
  );
  await captureFrame(9);
}

async function captureColumnFiltering(page, captureFrame) {
  const table = page.getByTestId("readme-demo-column-filtering-table");
  const root = table.locator("xpath=..");
  const trigger = root.getByTestId("column-filter-trigger-status");

  const leafRows = table.locator("tr[data-comins-row-data-index]");
  await waitForReadmeState(async () => await leafRows.count() === 6, "Column Filtering rows unavailable");
  await captureFrame(8);
  await trigger.click();
  const popover = page.getByTestId("column-filter-popover-status");
  await waitForReadmeState(async () => popover.isVisible(), "Column Filtering popover unavailable");
  await captureFrame(6);
  await page.getByTestId("column-filter-value-status").fill("Active");
  await waitForReadmeState(async () => await leafRows.count() === 3, "Column Filtering model did not apply");
  await captureFrame(10);
  await page.getByTestId("column-filter-clear-status").click();
  await waitForReadmeState(async () => await leafRows.count() === 6, "Column Filtering clear failed");
  await captureFrame(7);
}

async function captureCrossTableDrag(page, captureFrame) {
  const left = page.getByTestId("readme-demo-transfer-left");
  const right = page.getByTestId("readme-demo-transfer-right");

  await captureFrame(8);
  await dragWithCapture(
    page,
    left.getByTestId("group-drag-handle-platform"),
    right.getByTestId("group-row-experience"),
    () => captureFrame(),
    0.1,
  );
  await waitForReadmeState(
    async () => await left.getByTestId("group-row-platform").count() === 0,
    "Cross-Table Group source was retained",
  );
  await waitForReadmeState(
    async () => right.getByTestId("group-row-platform").isVisible(),
    "Cross-Table Group target unavailable",
  );
  await captureFrame(8);

  await dragWithCapture(
    page,
    left.getByTestId("row-drag-handle-shared"),
    right.getByTestId("row-shared"),
    () => captureFrame(),
  );
  const tooltip = page.getByTestId("transfer-rejection-tooltip");
  await waitForReadmeState(
    async () => tooltip.isVisible(),
    "Cross-Table duplicate feedback unavailable",
  );
  await waitForReadmeState(
    async () => Boolean((await tooltip.textContent())?.includes("Duplicate ID")),
    "Cross-Table duplicate message unavailable",
  );
  await captureFrame(12);
}

async function movePreviewSubtree(page, captureFrame) {
  const tree = page.getByTestId("readme-demo-tree-grid-table");
  await dragWithCapture(page, tree.getByTestId("row-drag-handle-record-c"), tree.getByTestId("row-tree-experience"), captureFrame);
  await waitForReadmeState(async () => (await page.getByTestId("readme-tree-destination").textContent()).includes("Experience portfolio"), "Tree subtree move failed");
  assert(await tree.getByTestId("row-record-e").isVisible(), "Tree descendant lost after move");
  const childBox = await tree.getByTestId("row-record-e").boundingBox();
  const viewportBox = await tree.boundingBox();
  assert(childBox && viewportBox && childBox.y + childBox.height <= viewportBox.y + viewportBox.height, "Tree descendant outside capture");
}

async function captureTreeDrag(page, captureFrame) {
  await captureFrame(8);
  await page.getByRole("button", { name: "Expand all" }).click();
  await captureFrame(8);
  await movePreviewSubtree(page, captureFrame);
  await captureFrame(12);
  await page.getByRole("button", { name: "Fold all" }).click();
  await captureFrame(8);
  await page.getByRole("button", { name: "Expand all" }).click();
  await captureFrame(8);
}

async function expandPreviewContent(page, captureFrame) {
  const row = page.getByTestId("readme-demo-auto-row-height-table").getByTestId("row-0");
  const initial = await row.evaluate(element => element.getBoundingClientRect().height);
  await page.getByTestId("readme-content-toggle").click();
  await waitForReadmeState(async () => await row.evaluate(element => element.getBoundingClientRect().height) > initial + 30, "Automatic row height did not grow");
  await captureFrame(4);
}

async function captureAutoHeight(page, captureFrame) {
  const viewport = page.getByTestId("readme-demo-auto-row-height-table");
  await captureFrame(8);
  await expandPreviewContent(page, captureFrame);
  await captureFrame(8);
  const row = viewport.getByTestId("row-0");
  const wideHeight = await row.evaluate(element => element.getBoundingClientRect().height);
  await page.getByTestId("readme-width-toggle").click();
  await waitForReadmeState(async () => await row.evaluate(element => element.getBoundingClientRect().height) > wideHeight, "Automatic height did not react to width");
  await captureFrame(10);
  await page.getByTestId("readme-content-toggle").click();
  await captureFrame(8);
  await viewport.hover();
  for (let step = 0; step < 4; step += 1) {
    await page.mouse.wheel(0, 180);
    await captureFrame(3);
  }
  await captureFrame(8);
}

async function scrollPreviewViewport(page, captureFrame) {
  const viewport = page.getByTestId("readme-demo-viewport-datasource-table");
  await viewport.hover();
  const distance = await viewport.evaluate(element => element.scrollHeight * 0.06);
  for (let step = 0; step < 10; step += 1) {
    await page.mouse.wheel(0, distance);
    await captureFrame();
  }
  await waitForReadmeState(async () => Number(await viewport.locator("[data-comins-row-data-index]").first().getAttribute("data-comins-absolute-index")) > 400_000, "Viewport distant rows unavailable");
}

async function captureViewport(page, captureFrame) {
  const viewport = page.getByTestId("readme-demo-viewport-datasource-table");
  await viewport.getByTestId("row-0").waitFor();
  await captureFrame(10);
  await scrollPreviewViewport(page, captureFrame);
  await captureFrame(12);
  await page.getByTestId("readme-viewport-query").click();
  await captureFrame(4);
  await viewport.getByTestId("row-0").waitFor();
  await waitForReadmeState(async () => (await viewport.getByTestId("row-0").textContent()).includes("Query 2"), "Viewport query reset failed");
  await captureFrame(12);
}

async function captureClipboardFill(page, captureFrame) {
  const table = page.getByTestId("readme-demo-clipboard-fill-table");
  const cell = (row, column = "column1") => table.getByTestId(`cell-${row}-${column}`);
  const modifier = process.platform === "darwin" ? "Meta" : "Control";
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await captureFrame(6);
  await page.getByRole("textbox", { name: "Copy two TSV fields" }).click();
  await page.keyboard.press(`${modifier}+A`);
  await page.keyboard.press(`${modifier}+C`);
  await cell(0).click();
  await page.keyboard.press(`${modifier}+V`);
  await waitForReadmeState(async () => await cell(0).textContent() === "Pasted value", "TSV paste unavailable");
  assert(await cell(0, "column2").textContent() === "900", "Typed paste unavailable");
  assert(await cell(0, "column3").textContent() === "Keep 1", "Paste changed the third field");
  await captureFrame(8);
  await cell(0).click();
  const handle = await table.getByTestId("fill-handle").boundingBox();
  const target = await cell(3).boundingBox();
  assert(handle && target, "Fill geometry unavailable");
  const x = handle.x + handle.width - 5, y = handle.y + handle.height - 5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let step = 1; step <= 12; step += 1) {
    await page.mouse.move(x + (target.x + target.width / 2 - x) * step / 12,
      y + (target.y + target.height / 2 - y) * step / 12);
    await captureFrame();
  }
  await page.mouse.up();
  await waitForReadmeState(async () => await cell(3).textContent() === "Pasted value", "Fill did not commit");
  assert(await cell(3, "column2").textContent() === "400", "Fill changed an unselected column");
  assert(await page.getByTestId("readme-clipboard-commits").textContent() === "Data updates: 2", "Clipboard commit count mismatch");
  await captureFrame(10);
}

async function switchOverviewFeature(page, feature) {
  await page.getByTestId(`readme-demo-view-${feature}`).click();
  await waitForReadmeState(
    async () => await page.getByTestId("readme-demo").getAttribute("data-feature") === feature,
    `Overview ${feature} scene unavailable`,
  );
  await page.getByTestId(`readme-demo-${feature}`).waitFor();
}

async function captureOverview(page, captureFrame) {
  const table = page.getByTestId("readme-demo-table-overview-table");
  const tableRoot = table.locator("xpath=..");
  const overviewRows = table.locator("tr[data-comins-row-data-index]");

  await waitForReadmeState(async () => await overviewRows.count() === 6, "Overview Table rows unavailable");
  await captureFrame(6);
  await tableRoot.getByTestId("header-amount").click();
  await waitForReadmeState(
    async () => await tableRoot.getByTestId("header-amount").getAttribute("aria-sort") === "ascending",
    "Overview sort unavailable",
  );
  await captureFrame(4);
  const selectedRow = table.getByTestId("row-record-a");
  await selectedRow.click();
  await waitForReadmeState(
    async () => await selectedRow.getAttribute("aria-selected") === "true",
    "Overview selection unavailable",
  );
  await captureFrame(4);

  await switchOverviewFeature(page, "column-pinning");
  const pinning = page.getByTestId("readme-demo-column-pinning-table").locator("xpath=..");
  const scrollbar = pinning.getByTestId("table-horizontal-scrollbar");
  await captureFrame(5);
  await scrollbar.hover();
  await page.mouse.wheel(900, 0);
  await waitForReadmeState(
    async () => await scrollbar.evaluate((element) => element.scrollLeft) > 300,
    "Overview Column Pinning scroll unavailable",
  );
  await captureFrame(5);

  await switchOverviewFeature(page, "row-grouping");
  const grouping = page.getByTestId("readme-demo-row-grouping-table");
  const groupToggle = grouping.getByTestId("group-toggle-platform");
  await captureFrame(5);
  await groupToggle.click();
  await waitForReadmeState(
    async () => await groupToggle.getAttribute("aria-expanded") === "false",
    "Overview Row Grouping collapse unavailable",
  );
  await captureFrame(4);

  await switchOverviewFeature(page, "column-filtering");
  const filtering = page.getByTestId("readme-demo-column-filtering-table");
  const filterRoot = filtering.locator("xpath=..");
  await filterRoot.getByTestId("column-filter-trigger-status").click();
  await page.getByTestId("column-filter-value-status").fill("Active");
  await waitForReadmeState(
    async () => await filtering.locator("tr[data-comins-row-data-index]").count() === 3,
    "Overview Column Filtering unavailable",
  );
  await captureFrame(6);

  await switchOverviewFeature(page, "tree-grid");
  const tree = page.getByTestId("readme-demo-tree-grid-table");
  await captureFrame(5);
  await page.getByRole("button", { name: "Expand all" }).click();
  await waitForReadmeState(
    async () => await tree.locator("tr[data-comins-row-data-index]").count() === 8,
    "Overview Tree Grid expansion unavailable",
  );
  await captureFrame(6);
  await movePreviewSubtree(page, captureFrame);
  await captureFrame(4);

  await switchOverviewFeature(page, "auto-row-height");
  await captureFrame(3);
  await expandPreviewContent(page, captureFrame);

  await switchOverviewFeature(page, "viewport-datasource");
  await page.getByTestId("readme-demo-viewport-datasource-table").getByTestId("row-0").waitFor();
  await captureFrame(4);
  await scrollPreviewViewport(page, captureFrame);
  await captureFrame(6);

  await switchOverviewFeature(page, "clipboard-fill");
  await captureClipboardFill(page, count => captureFrame(Math.min(count ?? 1, 2)));
}

const featureDefinitions = [
  { assetName: "comins-table-clipboard-fill.gif", feature: "clipboard-fill", run: captureClipboardFill },
  { assetName: "comins-table-tree-row-drag.gif", feature: "tree-grid", run: captureTreeDrag },
  { assetName: "comins-table-auto-row-height.gif", feature: "auto-row-height", run: captureAutoHeight },
  { assetName: "comins-table-viewport-datasource.gif", feature: "viewport-datasource", run: captureViewport },
  {
    assetName: "comins-table-overview.gif",
    feature: "table-overview",
    run: captureOverview,
  },
  {
    assetName: "comins-table-column-pinning.gif",
    feature: "column-pinning",
    run: captureColumnPinning,
  },
  {
    assetName: "comins-table-row-grouping.gif",
    feature: "row-grouping",
    run: captureRowGrouping,
  },
  {
    assetName: "comins-table-column-filtering.gif",
    feature: "column-filtering",
    run: captureColumnFiltering,
  },
  {
    assetName: "comins-table-cross-table-drag.gif",
    feature: "cross-table-drag",
    run: captureCrossTableDrag,
  },
];

async function cleanupGenerationResources() {
  let cleanupError;
  const cleanup = async (operation) => {
    try {
      await operation();
    } catch (error) {
      cleanupError ??= error;
    }
  };

  await cleanup(async () => {
    await browser?.close();
    browser = undefined;
  });
  await cleanup(async () => {
    if (server && server.exitCode === null) {
      const serverExit = once(server, "exit");
      server.kill("SIGTERM");
      await serverExit;
    }
    server = undefined;
  });
  for (const root of temporaryRoots) {
    await cleanup(async () => rm(root, { force: true, recursive: true }));
    temporaryRoots.delete(root);
  }

  if (cleanupError) throw cleanupError;
}

async function encodeFeatureGif(definition, page) {
  const frameRoot = await mkdtemp(join(tmpdir(), `comins-table-readme-${definition.feature}-frames-`));
  temporaryRoots.add(frameRoot);
  const frameState = { number: 0 };
  const captureFrame = (count) => capture(page, frameRoot, frameState, count);

  await page.goto(`${baseURL}/readme-demo?feature=${definition.feature}`);
  await page.getByTestId(`readme-demo-${definition.feature}`).waitFor();
  await definition.run(page, captureFrame);

  const frames = (await readdir(frameRoot))
    .filter((name) => name.endsWith(".png"))
    .sort()
    .map((name) => join(frameRoot, name));
  if (frames.length === 0 || frames.length * frameDelay > 12) {
    throw new Error("readme-gif: duration budget exceeded");
  }

  const stagingRoot = await mkdtemp(join(outputDirectory, `.comins-table-${definition.feature}-`));
  temporaryRoots.add(stagingRoot);
  const stagedOutputPath = join(stagingRoot, definition.assetName);
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
  const readyOutputPath = join(outputDirectory, `.${definition.assetName}.${process.pid}.ready.gif`);
  await rm(readyOutputPath, { force: true });
  await rename(stagedOutputPath, readyOutputPath);
  readyAssets.push({
    outputPath: join(outputDirectory, definition.assetName),
    readyOutputPath,
  });
  await rm(frameRoot, { force: true, recursive: true });
  temporaryRoots.delete(frameRoot);
  await rm(stagingRoot, { force: true, recursive: true });
  temporaryRoots.delete(stagingRoot);
}

async function generateReadmeGifs() {
  const port = Number(process.env.COMINS_TABLE_README_GIF_PORT ?? 4102);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("readme-gif: invalid port");
  }
  baseURL = `http://127.0.0.1:${port}`;

  try {
    const viteEntry = join(repositoryRoot, "node_modules", "vite", "bin", "vite.js");
    server = spawn(process.execPath, [viteEntry,
      "--config",
      "vite.example.config.ts",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ], { cwd: repositoryRoot, stdio: ["ignore", "pipe", "ignore"] });
    await waitForServer();

    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { height: 760, width: 960 } });
    for (const definition of featureDefinitions) {
      process.stdout.write(`readme-gif: capturing ${definition.feature}\n`);
      await encodeFeatureGif(definition, page);
    }
  } catch (error) {
    try {
      await cleanupGenerationResources();
    } finally {
      await Promise.allSettled(readyAssets.map(({ readyOutputPath }) =>
        rm(readyOutputPath, { force: true })));
    }
    throw error;
  }

  await finalizeReadmeGifs({
    assets: readyAssets,
    cleanup: cleanupGenerationResources,
    legacyPaths: [legacyOutputPath],
  });
}

generateReadmeGifs().catch(() => {
  process.stderr.write("readme-gif: generation failed\n");
  process.exitCode = 1;
});
