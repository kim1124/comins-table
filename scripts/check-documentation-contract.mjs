import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { API } from "typescript/unstable/sync";

const allowedFeatureStatuses = new Set(["experimental", "planned", "shipped", "unsupported"]);
const allowedApiClassifications = ["documented", "reference", "deprecated"];
const allowedTokenClassifications = ["public-stable", "public-experimental", "internal"];
const defaultManifestPath = "docs/feature-manifest.json";

export function loadDocumentationManifest(root = process.cwd(), manifestPath = defaultManifestPath) {
  return JSON.parse(readFileSync(resolve(root, manifestPath), "utf8"));
}

export function collectDocumentationContractEvidence(root, manifest) {
  const entrypoints = manifest?.publicApi?.entrypoints ?? {};
  const routeSource = readFileSync(resolve(root, "example/src/docs/featureRouteManifest.ts"), "utf8");
  const playgroundRoutes = [...routeSource.matchAll(
    /\{\s*featureId:\s*"([^"]+)",\s*path:\s*"([^"]+)"\s*\}/gu,
  )].map((match) => ({ featureId: match[1], path: match[2] }));
  const publicDocumentPaths = [
    "README.md",
    ...readMarkdownPaths(root, "docs/user"),
    ...readMarkdownPaths(root, "docs/ko"),
  ];

  return {
    cssTokens: collectCssTokens(root),
    designDoc: readFileSync(resolve(root, "DESIGN.md"), "utf8"),
    docExamples: collectDocumentExamples(root, publicDocumentPaths),
    entrypointExports: collectTypeScriptExports(root, entrypoints),
    playgroundRoutes,
    publicDocumentPaths,
    publicDocs: publicDocumentPaths
      .map((path) => readFileSync(resolve(root, path), "utf8"))
      .join("\n"),
  };
}

export function validateDocumentationContract(root, manifest, evidence) {
  const violations = [];

  if (manifest?.schemaVersion !== 1) violations.push("schemaVersion must be 1");
  if (!Array.isArray(manifest?.features)) violations.push("features must be an array");

  const features = Array.isArray(manifest?.features) ? manifest.features : [];
  const featureIds = new Set();
  const classifiedApiSymbols = new Set();

  for (const feature of features) {
    const featureLabel = typeof feature?.id === "string" ? feature.id : "<missing-id>";

    if (typeof feature?.id !== "string" || feature.id.length === 0) {
      violations.push("feature id must be a non-empty string");
    } else if (featureIds.has(feature.id)) {
      violations.push(`duplicate feature id: ${feature.id}`);
    } else {
      featureIds.add(feature.id);
    }

    if (!allowedFeatureStatuses.has(feature?.status)) {
      violations.push(`invalid feature status: ${featureLabel}`);
    }

    for (const symbol of arrayValue(feature?.apiSymbols)) {
      if (typeof symbol !== "string") {
        violations.push(`invalid API symbol in feature: ${featureLabel}`);
      } else {
        classifiedApiSymbols.add(symbol);
      }
    }

    const englishGuides = arrayValue(feature?.guides?.en);
    const koreanGuides = arrayValue(feature?.guides?.ko);
    const routes = arrayValue(feature?.playgroundRoutes);
    const tests = arrayValue(feature?.tests);
    const evidencePaths = arrayValue(feature?.evidence);

    if (feature?.status === "shipped") {
      if (arrayValue(feature?.apiSymbols).length === 0) violations.push(`shipped feature has no API symbol: ${featureLabel}`);
      if (englishGuides.length === 0 || koreanGuides.length === 0) violations.push(`shipped feature has incomplete language guides: ${featureLabel}`);
      if (routes.length === 0) violations.push(`shipped feature has no Playground route: ${featureLabel}`);
      if (tests.length === 0) violations.push(`shipped feature has no test evidence: ${featureLabel}`);
    }

    if (feature?.status === "unsupported" && routes.length > 0) {
      violations.push(`unsupported feature exposes a Playground route: ${featureLabel}`);
    }

    for (const path of [...englishGuides, ...koreanGuides, ...tests, ...evidencePaths]) {
      if (typeof path !== "string" || !existsSync(resolve(root, path))) {
        violations.push(`missing evidence path for ${featureLabel}: ${String(path)}`);
      }
    }

    if (feature?.status === "shipped") {
      for (const guidePath of [...englishGuides, ...koreanGuides]) {
        if (typeof guidePath !== "string" || !existsSync(resolve(root, guidePath))) continue;
        const guide = readFileSync(resolve(root, guidePath), "utf8");
        if (!routes.some((route) => typeof route === "string" && guide.includes(route))) {
          violations.push(`guide does not reference a feature route for ${featureLabel}: ${guidePath}`);
        }
      }
    }
  }

  const actualRootExports = evidence?.entrypointExports?.["comins-table"] ?? [];
  const classifications = manifest?.publicApi?.classifications ?? {};
  const classifiedSymbols = [];

  for (const classification of allowedApiClassifications) {
    const symbols = arrayValue(classifications[classification]);
    for (const symbol of symbols) {
      if (typeof symbol !== "string") {
        violations.push(`invalid ${classification} API symbol: ${String(symbol)}`);
        continue;
      }
      if (classifiedSymbols.includes(symbol)) violations.push(`API symbol has multiple classifications: ${symbol}`);
      classifiedSymbols.push(symbol);
      if (classification === "documented" && !containsSymbol(evidence?.publicDocs ?? "", symbol)) {
        violations.push(`documented API symbol is absent from public docs: ${symbol}`);
      }
    }
  }

  compareSets("root API classification", classifiedSymbols, actualRootExports, violations);

  for (const symbol of classifiedApiSymbols) {
    if (!actualRootExports.includes(symbol)) violations.push(`feature references a non-exported API symbol: ${symbol}`);
  }

  const entrypoints = manifest?.publicApi?.entrypoints ?? {};
  for (const [specifier, definition] of Object.entries(entrypoints)) {
    compareSets(
      `entrypoint ${specifier}`,
      arrayValue(definition?.exports),
      evidence?.entrypointExports?.[specifier] ?? [],
      violations,
    );
  }

  const expectedRoutes = features
    .filter((feature) => feature?.status === "shipped")
    .flatMap((feature) => arrayValue(feature?.playgroundRoutes).map((path) => `${feature.id}:${path}`));
  const actualRoutes = arrayValue(evidence?.playgroundRoutes)
    .map((route) => `${route.featureId}:${route.path}`);

  compareSets("Playground route manifest", expectedRoutes, actualRoutes, violations);

  const classifiedTokens = [];
  for (const classification of allowedTokenClassifications) {
    const tokens = arrayValue(manifest?.cssTokens?.[classification]);

    for (const token of tokens) {
      if (typeof token !== "string" || !token.startsWith("--comins-table-")) {
        violations.push(`invalid ${classification} CSS token: ${String(token)}`);
        continue;
      }
      if (classifiedTokens.includes(token)) violations.push(`CSS token has multiple classifications: ${token}`);
      classifiedTokens.push(token);

      if (classification !== "internal" && !evidence?.designDoc?.includes(token)) {
        violations.push(`public CSS token is absent from DESIGN.md: ${token}`);
      }
    }
  }
  compareSets("CSS token classification", classifiedTokens, evidence?.cssTokens ?? [], violations);

  for (const token of arrayValue(manifest?.cssTokens?.internal)) {
    if (typeof token === "string" && evidence?.publicDocs?.includes(token)) {
      violations.push(`internal CSS token appears in consumer documentation: ${token}`);
    }
  }

  for (const [restrictionId, paths] of Object.entries(manifest?.restrictions ?? {})) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(restrictionId)) {
      violations.push(`invalid restriction id: ${restrictionId}`);
    }

    for (const path of arrayValue(paths)) {
      if (typeof path !== "string" || !existsSync(resolve(root, path))) {
        violations.push(`missing restriction guide for ${restrictionId}: ${String(path)}`);
        continue;
      }

      const guide = readFileSync(resolve(root, path), "utf8");
      if (!guide.includes(`<!-- comins-restriction: ${restrictionId} -->`)) {
        violations.push(`guide is missing restriction marker ${restrictionId}: ${path}`);
      }
    }
  }

  const compileExamples = [];
  for (const example of arrayValue(evidence?.docExamples)) {
    if (example.kind === "missing") {
      violations.push(`TypeScript example is missing annotation: ${example.path}:${example.line}`);
      continue;
    }

    if (example.kind !== "compile") continue;
    compileExamples.push(example.id);
    const fixtureBase = resolve(root, "test/typecheck/docs", example.id);
    if (!existsSync(`${fixtureBase}.ts`) && !existsSync(`${fixtureBase}.tsx`)) {
      violations.push(`compiled documentation example has no fixture: ${example.id}`);
    }
  }

  if (new Set(compileExamples).size < 6) {
    violations.push("documentation contract requires at least 6 compiled TypeScript examples");
  }

  const documentedExamples = manifest?.documentationExamples ?? {};
  compareSets("compiled documentation examples", Object.keys(documentedExamples), compileExamples, violations);
  for (const [id, definition] of Object.entries(documentedExamples)) {
    for (const key of ["guide", "fixture"]) {
      const path = definition?.[key];
      if (typeof path !== "string" || !existsSync(resolve(root, path))) {
        violations.push(`missing ${key} for documentation example ${id}: ${String(path)}`);
      }
    }

    if (!arrayValue(evidence?.docExamples).some((example) =>
      example.kind === "compile" && example.id === id && example.path === definition?.guide)) {
      violations.push(`compiled documentation example guide mismatch: ${id}`);
    }
  }

  return violations;
}

export function checkDocumentationContract(root = process.cwd(), manifest = loadDocumentationManifest(root)) {
  const evidence = collectDocumentationContractEvidence(root, manifest);
  const violations = validateDocumentationContract(root, manifest, evidence);

  return {
    evidence,
    manifest,
    violations,
  };
}

function collectTypeScriptExports(root, entrypoints) {
  const api = new API({ cwd: root });
  let snapshot;

  try {
    const configPath = resolve(root, "tsconfig.json");
    snapshot = api.updateSnapshot({ openProjects: [configPath] });
    const project = snapshot.getProject(configPath) ?? snapshot.getProjects()[0];

    if (!project) throw new Error("TypeScript project could not be loaded");

    return Object.fromEntries(Object.entries(entrypoints).map(([specifier, definition]) => {
      const sourcePath = resolve(root, definition.source);
      const source = project.program.getSourceFile(sourcePath);
      const symbol = source ? project.checker.getSymbolAtLocation(source) : undefined;
      const exports = symbol
        ? project.checker.getExportsOfModule(symbol).map((item) => item.name).sort()
        : [];

      return [specifier, exports];
    }));
  } finally {
    snapshot?.dispose();
    api.close();
  }
}

function readMarkdownPaths(root, directory) {
  return readdirSync(resolve(root, directory))
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => join(directory, name));
}

function collectCssTokens(root) {
  const source = readFileSync(resolve(root, "styles.css"), "utf8");

  return [...new Set(source.match(/--comins-table-[a-z0-9-]+/gu) ?? [])].sort();
}

function collectDocumentExamples(root, paths) {
  return paths.flatMap((path) => {
    const lines = readFileSync(resolve(root, path), "utf8").split(/\r?\n/u);

    return lines.flatMap((line, index) => {
      if (!/^```(?:ts|tsx|typescript)$/u.test(line.trim())) return [];

      const annotation = lines[index - 1]?.trim() ?? "";
      if (annotation === "<!-- comins-doc-example: fragment -->") {
        return [{ kind: "fragment", line: index + 1, path }];
      }

      const compile = annotation.match(/^<!-- comins-doc-example: compile=([a-z0-9]+(?:-[a-z0-9]+)*) -->$/u);
      if (compile) {
        return [{ id: compile[1], kind: "compile", line: index + 1, path }];
      }

      return [{ kind: "missing", line: index + 1, path }];
    });
  });
}

function containsSymbol(content, symbol) {
  return new RegExp(`\\b${escapeRegExp(symbol)}\\b`, "u").test(content);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function compareSets(label, expectedValues, actualValues, violations) {
  const expected = [...new Set(expectedValues)].sort();
  const actual = [...new Set(actualValues)].sort();
  const missing = actual.filter((value) => !expected.includes(value));
  const stale = expected.filter((value) => !actual.includes(value));

  if (missing.length > 0) violations.push(`${label} has unclassified values: ${missing.join(", ")}`);
  if (stale.length > 0) violations.push(`${label} has stale values: ${stale.join(", ")}`);
  if (expected.length !== expectedValues.length) violations.push(`${label} contains duplicate values`);
}

function runCli() {
  try {
    const result = checkDocumentationContract();
    if (result.violations.length > 0) {
      process.stderr.write("documentation-contract: failed\n");
      for (const violation of result.violations) process.stderr.write(`- ${violation}\n`);
      process.exitCode = 1;
      return;
    }

    const shippedCount = result.manifest.features.filter((feature) => feature.status === "shipped").length;
    const exportCount = result.evidence.entrypointExports["comins-table"]?.length ?? 0;
    process.stdout.write(`documentation-contract: ok features=${shippedCount} exports=${exportCount}\n`);
  } catch (error) {
    process.stderr.write("documentation-contract: failed\n");
    if (process.env.COMINS_DOCS_DEBUG === "1") process.stderr.write(`${error?.stack ?? error}\n`);
    process.exitCode = 1;
  }
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (entryPath && fileURLToPath(import.meta.url) === entryPath) runCli();
