import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = dirname(projectRoot);
const temporaryRoot = await mkdtemp(join(tmpdir(), "comins-table-consumer-"));
const npmEnvironment = {
  ...process.env,
  npm_config_cache: join(temporaryRoot, "npm-cache"),
  npm_config_logs_dir: join(temporaryRoot, "npm-logs"),
};

await mkdir(npmEnvironment.npm_config_cache, { recursive: true });
await mkdir(npmEnvironment.npm_config_logs_dir, { recursive: true });

function runNpm(args, options = {}) {
  return execFileSync("npm", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: npmEnvironment,
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}

try {
  runNpm(["run", "build"]);
  const packed = JSON.parse(runNpm(["pack", "--json", "--pack-destination", temporaryRoot]));
  const tarballName = packed[0]?.filename;
  assert.equal(typeof tarballName, "string", "npm pack did not return a tarball filename");

  const consumerRoot = join(temporaryRoot, "consumer");
  await mkdir(consumerRoot);
  await writeFile(
    join(consumerRoot, "package.json"),
    JSON.stringify({ name: "comins-table-consumer-smoke", private: true, type: "module" }),
  );

  execFileSync(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--no-package-lock", join(temporaryRoot, tarballName), "react@18", "react-dom@18"],
    { cwd: consumerRoot, env: npmEnvironment, stdio: "inherit" },
  );

  const requireFromConsumer = createRequire(join(consumerRoot, "package.json"));
  const javascriptEntries = ["comins-table", "comins-table/core", "comins-table/clipboard", "comins-table/selection"];

  for (const entry of javascriptEntries) {
    const resolved = requireFromConsumer.resolve(entry);
    await import(pathToFileURL(resolved).href);
  }

  assert.ok(requireFromConsumer.resolve("comins-table/styles.css"));
  process.stdout.write("Consumer package smoke check passed.\n");
} finally {
  await rm(temporaryRoot, { force: true, recursive: true });
}
