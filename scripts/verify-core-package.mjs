// Verifies a trusted local build. No install, registry lookup, or package lifecycle scripts.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function verifyCorePackage({
  root = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  tempParent = tmpdir(), run = spawnSync, log = message => process.stdout.write(`${message}\n`),
} = {}) {
  let temporary;
  try {
    root = resolve(root);
    temporary = mkdtempSync(resolve(tempParent, "comins-core-package-"));
    const env = { ...process.env, npm_config_cache: resolve(temporary, "cache"), npm_config_logs_dir: resolve(temporary, "logs") };
    delete env.NODE_PATH;
    delete env.NODE_OPTIONS;
    const options = { cwd: root, env, encoding: "utf8", timeout: 120_000, maxBuffer: 8 * 1024 * 1024 };
    const packed = run("npm", ["pack", "--offline", "--ignore-scripts", "--json", "--pack-destination", temporary], options);
    if (packed.error || packed.signal || packed.status !== 0) throw new Error(`Local pack failed: ${packed.error?.message ?? packed.stderr ?? packed.status}`);
    const entries = JSON.parse(packed.stdout);
    const filename = Array.isArray(entries) && entries.length === 1 ? entries[0]?.filename : null;
    if (typeof filename !== "string" || basename(filename) !== filename || filename.includes("\\") || !filename.endsWith(".tgz")) throw new Error("Invalid local pack filename");
    const artifact = resolve(temporary, filename);
    if (!lstatSync(artifact).isFile()) throw new Error("Local artifact must be a regular file");
    const sha256 = createHash("sha256").update(readFileSync(artifact)).digest("hex");
    log(`Core artifact: ${filename}; SHA-256: ${sha256}`);
    const checked = run(process.execPath, [resolve(root, "scripts/check-core-boundary.mjs"), artifact, "--source-root", root], options);
    if (checked.error || checked.signal || ![0, 1, 2].includes(checked.status)) throw new Error(`Core checker could not finish: ${checked.error?.message ?? checked.signal ?? checked.status}`);
    if (checked.stdout?.trim()) log(checked.stdout.trim());
    if (checked.stderr?.trim()) log(checked.stderr.trim());
    return checked.status;
  } catch (error) {
    log(`SETUP: ${error.message}`);
    return 2;
  } finally {
    if (temporary) rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = verifyCorePackage();
