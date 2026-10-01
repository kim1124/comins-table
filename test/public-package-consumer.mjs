// Integration test for a trusted local tarball, never an untrusted-package sandbox.
// Installs React peers in disposable consumers; does not change repository dependencies.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifact = resolve(process.argv[2] ?? "");
assert.ok(process.argv[2]?.endsWith(".tgz"), "Usage: node test/public-package-consumer.mjs <trusted-local.tgz>");
const digest = () => createHash("sha256").update(readFileSync(artifact)).digest("hex");
const hash = digest();
const temporary = mkdtempSync(resolve(tmpdir(), "comins-public-consumers-"));
const env = { ...process.env, npm_config_cache: resolve(temporary, "cache"), npm_config_logs_dir: resolve(temporary, "logs") };
delete env.NODE_PATH;
delete env.NODE_OPTIONS;
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, env, encoding: "utf8", timeout: 180_000, maxBuffer: 8 * 1024 * 1024 });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  assert.equal(result.error, undefined, `${command} could not execute`);
  assert.equal(result.status, 0, `${command} ${args.join(" ")} failed`);
}

function expectMissingArtifactFailure(path, command, args, cwd, diagnostic) {
  const held = `${path}.negative-control`;
  renameSync(path, held);
  try {
    const result = spawnSync(command, args, { cwd, env, encoding: "utf8", timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.ok(Number.isInteger(result.status) && result.status > 0, "Missing artifact must not pass");
    assert.match(`${result.stdout}\n${result.stderr}`, diagnostic, "Failure must identify the removed artifact");
    console.log(`Negative control passed: missing ${path.split("/").pop()} rejected`);
  } finally {
    renameSync(held, path);
  }
}

try {
  console.log(`Public consumer artifact SHA-256: ${hash}`);
  run(process.execPath, [resolve(repository, "scripts/check-core-boundary.mjs"), artifact, "--source-root", repository], repository);
  for (const major of [18, 19]) {
    const consumer = resolve(temporary, `react-${major}`);
    mkdirSync(consumer);
    writeFileSync(resolve(consumer, "package.json"), JSON.stringify({ private: true, type: "module" }));
    run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--no-package-lock", artifact,
      `react@${major}`, `react-dom@${major}`, `@types/react@${major}`, `@types/react-dom@${major}`], consumer);
    cpSync(resolve(repository, "test/fixtures/react-public-consumer"), consumer, { recursive: true });
    // jsdom is only a test environment; consumer React and package resolve from the temp install.
    symlinkSync(resolve(repository, "node_modules/jsdom"), resolve(consumer, "node_modules/jsdom"), "dir");
    writeFileSync(resolve(consumer, "styles.d.ts"), 'declare module "*.css";\n');
    const manifest = JSON.parse(readFileSync(resolve(repository, "docs/feature-manifest.json"), "utf8"));
    writeFileSync(resolve(consumer, "inventory.ts"), Object.entries(manifest.publicApi.entrypoints)
      .map(([specifier, entry], index) => `import type { ${entry.exports.map(name => `${name} as entry${index}_${name}`).join(", ")} } from ${JSON.stringify(specifier)};`).join("\n"));
    const examples = [];
    for (const language of ["user", "ko"]) {
      const guide = readFileSync(resolve(repository, `docs/${language}/26-migration-0.2.0.md`), "utf8");
      for (const [index, match] of [...guide.matchAll(/```tsx?\n([\s\S]*?)\n```/g)].entries()) {
        const name = `migration-${language}-${index}.tsx`;
        writeFileSync(resolve(consumer, name), match[1]);
        examples.push(name);
      }
    }
    assert.equal(examples.length, 4, "Compile both React and Core examples in both languages");
    writeFileSync(resolve(consumer, "tsconfig.json"), JSON.stringify({
      compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "Bundler", jsx: "react-jsx",
        strict: true, noUncheckedIndexedAccess: true, skipLibCheck: false, types: ["react", "react-dom"],
        lib: ["ES2022", "DOM", "DOM.Iterable"], noEmit: true },
      files: ["consumer.tsx", "styles.d.ts", "inventory.ts", ...examples],
    }));
    run(resolve(repository, "node_modules/.bin/tsc"), ["-p", "tsconfig.json"], consumer);
    run(process.execPath, ["smoke.mjs"], consumer);
    writeFileSync(resolve(consumer, "index.html"), '<div id="app"></div><script type="module" src="/consumer.tsx"></script>');
    run(resolve(repository, "node_modules/.bin/vite"), ["build"], consumer);
    assert.ok(readdirSync(resolve(consumer, "dist/assets")).some(name => name.endsWith(".css")), "CSS must survive the consumer bundle");
    const installed = resolve(consumer, "node_modules/comins-table");
    expectMissingArtifactFailure(resolve(installed, "dist/clipboard.d.ts"), resolve(repository, "node_modules/.bin/tsc"), ["-p", "tsconfig.json"], consumer, /comins-table\/clipboard/);
    expectMissingArtifactFailure(resolve(installed, "styles.css"), resolve(repository, "node_modules/.bin/vite"), ["build"], consumer, /styles\.css/);
    // Restore the clean consumer before recording its final type/build result.
    run(resolve(repository, "node_modules/.bin/tsc"), ["-p", "tsconfig.json"], consumer);
    run(resolve(repository, "node_modules/.bin/vite"), ["build"], consumer);
    assert.equal(digest(), hash, "Every consumer must use the unchanged artifact");
    console.log(`React ${major}: strict packed types, runtime, client mount, browser JS/CSS build passed`);
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
