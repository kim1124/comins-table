// Local, trusted package diagnostics; this executes package code, not a security sandbox.
import { spawnSync, execFileSync } from "node:child_process";
import { accessSync, constants, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { API } from "typescript/unstable/sync";
import { SyntaxKind } from "typescript/unstable/ast";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const forbiddenPackage = /^(?:react|react-dom|@types\/react|@types\/react-dom)(?:\/|$)/;
const compilerOptions = {
  strict: true, noUncheckedIndexedAccess: true, skipLibCheck: false, types: [],
  lib: ["ES2022"], target: "ES2022", module: "ESNext", moduleResolution: "Bundler", noEmit: true,
};
function environment() {
  const env = { ...process.env };
  delete env.NODE_PATH;
  delete env.NODE_OPTIONS;
  return env;
}
function inside(root, path) {
  const rel = relative(root, path);
  return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}
function regularFile(path) {
  if (!lstatSync(path).isFile()) throw new Error(`Expected regular file: ${path}`);
}
function declarationEntry(packageRoot) {
  const manifest = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"));
  const entry = manifest.exports?.["./core"]?.types;
  if (typeof entry !== "string" || !entry.startsWith("./") || !inside(packageRoot, resolve(packageRoot, entry))) {
    throw new Error("Missing supported ./core types export (an explicit declaration file is required)");
  }
  regularFile(resolve(packageRoot, entry));
}
function filesUnder(root) {
  const files = [];
  function walk(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const child = resolve(path, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Symlink is not an isolated package file: ${child}`);
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile()) files.push(child);
      else throw new Error(`Unsupported package file: ${child}`);
    }
  }
  walk(root);
  return files;
}
function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd, env: environment(), encoding: "utf8", timeout: 60_000, maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.signal || result.status === null) {
    throw result.error ?? new Error(`Process did not exit normally: ${command} (${result.signal})`);
  }
  return { status: result.status, diagnostics: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim() };
}

export async function checkCoreBoundary({ packageRoot, compilerPath, fixtureRoot }) {
  packageRoot = realpathSync(packageRoot);
  compilerPath = resolve(compilerPath);
  fixtureRoot = resolve(fixtureRoot);
  accessSync(compilerPath, constants.X_OK);
  regularFile(resolve(packageRoot, "package.json"));
  declarationEntry(packageRoot);
  for (const file of ["consumer.ts", "smoke.mjs"]) regularFile(resolve(fixtureRoot, file));
  const files = filesUnder(packageRoot);
  const root = mkdtempSync(resolve(tmpdir(), "comins-core-consumer-"));
  try {
    const destination = resolve(root, "node_modules/comins-table");
    for (const file of files) {
      const target = resolve(destination, relative(packageRoot, file));
      mkdirSync(dirname(target), { recursive: true });
      cpSync(file, target);
    }
    writeFileSync(resolve(root, "package.json"), JSON.stringify({ private: true, type: "module" }));
    for (const file of ["consumer.ts", "smoke.mjs"]) cpSync(resolve(fixtureRoot, file), resolve(root, file));
    writeFileSync(resolve(root, "tsconfig.json"), JSON.stringify({ compilerOptions, files: ["consumer.ts"] }));
    // Probe in a child with a clean Node environment, from the consumer's own location.
    const probe = run(process.execPath, ["--input-type=module", "-e", `
      import {createRequire} from 'node:module';
      const require = createRequire(process.cwd() + '/probe.mjs');
      for (const name of ['react', 'react-dom', '@types/react', '@types/react-dom']) {
        for (const specifier of [name, name + '/package.json']) {
          try { require.resolve(specifier); throw Error('Isolation contaminated: ' + specifier); }
          catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
        }
      }
    `], root);
    if (probe.status !== 0) throw new Error(`Isolation setup failed: ${probe.diagnostics}`);
    const types = run(compilerPath, ["-p", resolve(root, "tsconfig.json"), "--pretty", "false", "--locale", "en", "--listFiles"], root);
    if (types.status !== 0 && !/error TS\d+:/.test(types.diagnostics)) {
      throw new Error(`Compiler setup failed: ${types.diagnostics || types.status}`);
    }
    // Local declaration edges missing from the artifact are setup failures, unlike
    // forbidden external dependencies (e.g. react) absent from the consumer.
    const missingDeclaration = types.diagnostics.split("\n").filter((line) =>
      /error TS6053:/.test(line) ||
      /error TS(?:2307|7016):[^\n]*module ['"]\.{1,2}\//.test(line));
    if (missingDeclaration.length) {
      throw new Error(`Missing declaration artifact: ${missingDeclaration.join("\n")}`);
    }
    const loadedFiles = types.diagnostics.split("\n").filter((line) => isAbsolute(line) && existsSync(line));
    if (loadedFiles.length === 0) throw new Error("Compiler did not report its file closure");
    const isolatedRoot = realpathSync(root);
    const libraryRoot = realpathSync(resolve(repository, "node_modules"));
    const forbiddenFiles = loadedFiles.filter((file) => {
      const actual = realpathSync(file);
      if (inside(isolatedRoot, actual)) return false;
      const compilerLibrary = /^(?:@typescript\/typescript-[^/]+|typescript)\/lib\//.test(relative(libraryRoot, actual).replaceAll(sep, "/"));
      return !compilerLibrary || !/^lib\.(?:es[\w.]*|decorators(?:\.legacy)?)\.d\.ts$/.test(basename(actual));
    });
    // A .d.ts can inject DOM via triple-slash lib directives despite compilerOptions.lib.
    const typeDiagnostics = types.diagnostics.split("\n").filter((line) => !loadedFiles.includes(line));
    typeDiagnostics.push(...forbiddenFiles.map((file) => `Forbidden environment declaration: ${file}`));
    const runtime = run(process.execPath, [resolve(root, "smoke.mjs")], root);
    return {
      types: { ok: types.status === 0 && forbiddenFiles.length === 0, diagnostics: typeDiagnostics.join("\n").trim() },
      runtime: { ok: runtime.status === 0, diagnostics: runtime.diagnostics },
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

export function inspectCoreGraph({ root, entries, mode }) {
  if (!["source", "runtime"].includes(mode)) throw new Error(`Unknown graph mode: ${mode}`);
  root = realpathSync(root);
  if (!Array.isArray(entries) || entries.length === 0) throw new Error("Graph entries are required");
  const targets = entries.map((entry) => {
    const target = resolve(root, entry);
    if (isAbsolute(entry) || !inside(root, target)) throw new Error(`Invalid graph entry: ${entry}`);
    regularFile(target);
    return target;
  });
  const temp = mkdtempSync(resolve(tmpdir(), "comins-core-graph-"));
  const violations = new Set();
  const unresolved = new Set();
  let api;
  let snapshot;
  try {
    const config = resolve(temp, "tsconfig.json");
    writeFileSync(config, JSON.stringify({
      ...(mode === "source" && existsSync(resolve(root, "tsconfig.json")) ? { extends: resolve(root, "tsconfig.json") } : {}),
      compilerOptions: { ...compilerOptions, allowJs: mode === "runtime", checkJs: false, jsx: "preserve" },
      // Runtime resolution must inspect JS, never its adjacent declaration substitute.
      files: mode === "runtime" ? filesUnder(root).filter((path) => /\.[cm]?js$/.test(path)) : targets,
      include: [], exclude: [],
    }));
    api = new API({ cwd: root });
    snapshot = api.updateSnapshot({ openProjects: [config] });
    const project = snapshot.getProject(config);
    if (!project) throw new Error("TypeScript graph project unavailable");
    const visited = new Set();
    function visit(file) {
      if (visited.has(file)) return;
      visited.add(file);
      const label = relative(root, file);
      if (!inside(root, realpathSync(file))) { unresolved.add(`${label}: outside graph root`); return; }
      const source = project.program.getSourceFile(file);
      if (!source) { unresolved.add(`${label}: unavailable syntax tree`); return; }
      if (project.program.getSyntacticDiagnostics(file).length) {
        unresolved.add(`${label}: syntax errors prevent complete graph inspection`);
        return;
      }
      function follow(literal) {
        if (!literal || ![SyntaxKind.StringLiteral, SyntaxKind.NoSubstitutionTemplateLiteral].includes(literal.kind)) {
          unresolved.add(`${label}: computed module path at ${literal?.pos ?? "unknown"}`);
          return;
        }
        const specifier = literal.text;
        const edge = `${label} -> ${specifier}`;
        if (forbiddenPackage.test(specifier)) { violations.add(edge); return; }
        let target;
        if (mode === "source") {
          const symbol = project.checker.getSymbolAtLocation(literal);
          // NodeHandle.path is compiler-canonical (lowercased on macOS), not a filesystem path.
          target = symbol?.declarations.find((declaration) => declaration.kind === SyntaxKind.SourceFile)?.resolve()?.fileName;
        } else if (specifier.startsWith("./") || specifier.startsWith("../")) {
          target = resolve(dirname(file), specifier);
          if (!existsSync(target) || !lstatSync(target).isFile()) target = undefined;
        }
        if (!target || !inside(root, target) || target.includes(`${sep}node_modules${sep}`)) {
          unresolved.add(`${edge}: cannot prove an internal dependency`);
          return;
        }
        const targetLabel = relative(root, target).replaceAll(sep, "/");
        if (/(?:^|\/)(?:browser|react)(?:[./-]|$)/.test(targetLabel) || /\.tsx$/.test(targetLabel)) {
          violations.add(`${edge} (${targetLabel}): Core -> Browser/React`);
        }
        visit(target);
      }
      for (const reference of [...source.referencedFiles, ...source.typeReferenceDirectives, ...source.libReferenceDirectives]) {
        unresolved.add(`${label}: triple-slash reference ${reference.fileName} requires explicit inspection`);
      }
      function walk(node) {
        if (node.kind === SyntaxKind.ImportDeclaration || node.kind === SyntaxKind.ExportDeclaration) {
          if (node.moduleSpecifier) follow(node.moduleSpecifier);
        } else if (node.kind === SyntaxKind.ImportType) {
          follow(node.argument?.literal);
        } else if (node.kind === SyntaxKind.ExternalModuleReference) {
          follow(node.expression);
        } else if (node.kind === SyntaxKind.CallExpression && (
          node.expression.kind === SyntaxKind.ImportKeyword ||
          (node.expression.kind === SyntaxKind.Identifier && node.expression.text === "require")
        )) {
          follow(node.arguments[0]);
        }
        node.forEachChild((child) => { walk(child); });
      }
      walk(source);
    }
    for (const target of targets) visit(target);
    return { ok: violations.size === 0 && unresolved.size === 0, violations: [...violations].sort(), unresolved: [...unresolved].sort() };
  } finally {
    snapshot?.dispose();
    api?.close();
    rmSync(temp, { recursive: true, force: true });
  }
}

function unpack(artifact, destination) {
  regularFile(artifact);
  const options = { encoding: "utf8", env: environment(), timeout: 60_000, maxBuffer: 32 * 1024 * 1024 };
  const entries = execFileSync("tar", ["-tzf", artifact], options).trim().split("\n");
  if (entries.length > 5000) throw new Error("Archive has too many entries");
  const seen = new Set();
  let bytes = 0;
  for (const entry of entries) {
    if (!/^package\//.test(entry) || entry.includes("\\") || entry.split("/").some((part) => part === ".." || part === ".") || seen.has(entry)) {
      throw new Error(`Unsafe or duplicate archive path: ${entry}`);
    }
    seen.add(entry);
    if (entry.endsWith("/")) continue;
    const target = resolve(destination, entry);
    if (!inside(destination, target)) throw new Error(`Archive path escapes destination: ${entry}`);
    // Never extract archive paths or links directly: materialize stdout as regular files.
    const contents = execFileSync("tar", ["-xOzf", artifact, entry], { ...options, encoding: null });
    bytes += contents.length;
    if (bytes > 64 * 1024 * 1024) throw new Error("Archive exceeds diagnostic size limit");
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
  return resolve(destination, "package");
}

async function main(args) {
  let temp;
  try {
    if (!(args.length === 1 || (args.length === 3 && args[1] === "--source-root"))) {
      throw new Error("Usage: node scripts/check-core-boundary.mjs <tarball.tgz> [--source-root <repo>]");
    }
    temp = mkdtempSync(resolve(tmpdir(), "comins-core-artifact-"));
    const packageRoot = realpathSync(unpack(resolve(args[0]), temp));
    // Let Node choose node/import/default conditions in manifest order, without executing code.
    const resolvedEntry = run(process.execPath, ["--input-type=module", "-e",
      'process.stdout.write(import.meta.resolve("comins-table/core"))'], packageRoot);
    if (resolvedEntry.status !== 0) throw new Error(`Core export resolution failed: ${resolvedEntry.diagnostics}`);
    const entry = fileURLToPath(resolvedEntry.diagnostics);
    if (!inside(packageRoot, entry)) throw new Error("Resolved Core entry is outside the package");
    regularFile(entry);
    const results = await checkCoreBoundary({
      packageRoot, compilerPath: resolve(repository, "node_modules/.bin/tsc"),
      fixtureRoot: resolve(repository, "test/fixtures/core-public-consumer"),
    });
    const runtimeGraph = inspectCoreGraph({ root: packageRoot, entries: [relative(packageRoot, entry)], mode: "runtime" });
    const sourceGraph = args[1] ? inspectCoreGraph({ root: resolve(args[2]), entries: ["src/core.ts"], mode: "source" }) : null;
    const graphs = [runtimeGraph, sourceGraph].filter(Boolean);
    process.stdout.write(`${JSON.stringify({ ...results, runtimeGraph, sourceGraph }, null, 2)}\n`);
    process.exitCode = graphs.some((graph) => graph.unresolved.length) ? 2 :
      results.types.ok && results.runtime.ok && graphs.every((graph) => graph.ok) ? 0 : 1;
  } catch (error) {
    process.stderr.write(`SETUP: ${error.message}\n`);
    process.exitCode = 2;
  } finally {
    if (temp) rmSync(temp, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
