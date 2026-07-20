import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readlinkSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";

const supportedArguments = new Set(["--staged"]);
const unknownArguments = process.argv.slice(2).filter((argument) => !supportedArguments.has(argument));

if (unknownArguments.length > 0) {
  process.stderr.write("Usage: node scripts/check-repository-hygiene.mjs [--staged]\n");
  process.exit(2);
}

const stagedOnly = process.argv.includes("--staged");
const explicitHistoryRef = Boolean(process.env.COMINS_HYGIENE_REF);
const historyRef = process.env.COMINS_HYGIENE_REF || "HEAD";
if (historyRef !== "HEAD" && !/^[0-9a-f]{40,64}$/iu.test(historyRef)) {
  process.stderr.write("Repository hygiene check received an invalid history ref.\n");
  process.exit(2);
}
const requestedHistoryBase = process.env.COMINS_HYGIENE_BASE || "";
if (
  requestedHistoryBase &&
  !/^0{40,64}$/u.test(requestedHistoryBase) &&
  !/^[0-9a-f]{40,64}$/iu.test(requestedHistoryBase)
) {
  process.stderr.write("Repository hygiene check received an invalid history base.\n");
  process.exit(2);
}
const repositoryRoot = runGitText(["rev-parse", "--show-toplevel"]).trim();
const benchmarkExclusions = new Set(["scripts/check-repository-hygiene.mjs"]);
const historyContentBatchSize = 128;
const findings = [];
const findingKeys = new Set();
const redactedPaths = new Set();
let scannedHistoryObjects = 0;
const configuredGitName = getGitConfig("user.name");
const configuredGitEmail = getGitConfig("user.email");
const localIdentityName = process.env.GIT_AUTHOR_NAME || configuredGitName;
const localGitEmail = process.env.GIT_AUTHOR_EMAIL || configuredGitEmail;
const localCommitterName = process.env.GIT_COMMITTER_NAME || configuredGitName;
const localCommitterEmail = process.env.GIT_COMMITTER_EMAIL || configuredGitEmail;
const allowedPublicIdentities = publicRepositoryOwners();
const localBlocklistMarkers = readLocalBlocklist();
const historyBase = resolveHistoryBase();

const contentPatterns = [
  {
    category: "email-address",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu,
    allow: (value) => isSafePlatformEmail(value),
  },
  {
    category: "absolute-home-path",
    pattern: /(?:\/(?:Users|home)\/[A-Z0-9._-]+(?:\/|\b)|[A-Z]:\\Users\\[A-Z0-9._-]+(?:\\|\b))/giu,
  },
  {
    category: "private-key",
    pattern: /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/gu,
  },
  {
    category: "provider-token",
    pattern:
      /(?:gh[pousr]_[A-Z0-9]{36,255}|github_pat_[A-Z0-9_]{50,255}|npm_[A-Z0-9]{36}|sk-(?:proj-|svcacct-)?[A-Z0-9_-]{20,}|(?:AKIA|ASIA)[A-Z0-9]{16}|AIza[A-Z0-9_-]{35}|xox[baprs]-[A-Z0-9-]{10,}|(?:sk|rk)_(?:live|test)_[A-Z0-9]{16,}|glpat-[A-Z0-9_-]{20,})/giu,
  },
  {
    category: "jwt-token",
    pattern: /\beyJ[A-Z0-9_-]{10,}\.eyJ[A-Z0-9_-]{10,}\.[A-Z0-9_-]{10,}\b/giu,
  },
  {
    category: "credential-url",
    pattern: /\bhttps?:\/\/[^\s/:@]+:[^\s/@]+@[^\s/]+/giu,
  },
  {
    category: "secret-assignment",
    pattern:
      /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|secret)\s*[:=]\s*["']?[A-Z0-9+/_=-]{16,}/giu,
  },
];

const benchmarkPattern =
  /\b(?:AG Grid|MUI X|MUI Data Grid|TanStack (?:Table|Virtual)|Handsontable|Syncfusion|DevExtreme|KendoReact|ReactDataTable\.com|Tabulator|SlickGrid|Glide Data Grid|PrimeReact DataTable|react-window)\b|@tanstack\/(?:react-)?(?:table|virtual)\b|\bag-grid-(?:community|enterprise|react)\b/giu;
const benchmarkPathPattern =
  /(?:^|\/)(?:benchmarks?|competitors?|comparisons?|research|vendor-snapshots?|benchmark-exports?)(?:\/|$)|(?:^|[/_.-])(?:ag[-_ ]?grid|mui[-_ ]?(?:x|data[-_ ]?grid)|tanstack[-_ ]?(?:table|virtual)|handsontable|syncfusion|devextreme|kendoreact|slickgrid|tabulator|react[-_ ]?window|react[-_ ]?data[-_ ]?table|glide[-_ ]?data[-_ ]?grid|primereact[-_ ]?datatable)(?:[/_.-]|$)/iu;

for (const path of listCandidatePaths()) {
  scanCandidatePath(path);

  if (isLocalOnlyPath(path)) {
    addFinding(path, 1, "local-only-path");
  }

  if (isForbiddenCredentialPath(path)) {
    addFinding(path, 1, "credential-path");
  }

  if (benchmarkPathPattern.test(path)) {
    addFinding(path, 1, "benchmark-path");
  }

  const content = readCandidate(path);
  if (content === null) {
    continue;
  }

  scanContent(path, content);
}

scanGitIdentity();
scanReachableCommitMetadata();
if (!stagedOnly) {
  scanReachableTagMetadata();
  await scanReachableBlobHistory();
  scanNewCommitRange();
}

if (findings.length > 0) {
  const scope = stagedOnly ? "staged snapshot" : "tracked working tree";
  process.stderr.write(`Repository hygiene check failed for ${scope}:\n`);
  for (const finding of findings.sort(compareFindings)) {
    process.stderr.write(`- ${displayPath(finding.path)}:${finding.line} [${finding.category}]\n`);
  }
  process.stderr.write("Move private or benchmark material under .local/, then remove it from Git tracking.\n");
  process.exit(1);
}

const scope = stagedOnly ? "staged snapshot" : "tracked working tree";
const historySummary = stagedOnly ? "" : ` ${scannedHistoryObjects} reachable history objects scanned.`;
process.stdout.write(`Repository hygiene check passed for ${scope}.${historySummary}\n`);

function runGit(args, options = {}) {
  return execFileSync("git", args, {
    cwd: repositoryRoot || process.cwd(),
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}

function runGitText(args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function listCandidatePaths() {
  const output = explicitHistoryRef && !stagedOnly
    ? runGit(["ls-tree", "-r", "-z", "--name-only", historyRef])
    : runGit(["ls-files", "--cached", "-z"]);

  return output
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map(normalizePath);
}

function normalizePath(path) {
  return path.replaceAll("\\", "/").replace(/^\.\//u, "");
}

function isLocalOnlyPath(path) {
  return path === ".local" || path.startsWith(".local/");
}

function isForbiddenCredentialPath(path) {
  const normalized = normalizePath(path).toLocaleLowerCase("en-US");
  const segments = normalized.split("/");
  const basename = segments.at(-1) ?? "";

  if (segments.includes(".secrets") || segments.includes("secrets")) {
    return true;
  }
  if (basename === ".env.example" || basename === ".npmrc.example") {
    return false;
  }
  if (
    basename === ".env" ||
    basename.startsWith(".env.") ||
    basename === ".envrc" ||
    basename === ".npmrc" ||
    basename.startsWith(".npmrc.") ||
    basename === ".netrc" ||
    basename === ".pypirc" ||
    basename === ".auth.json" ||
    /^credentials.*\.json$/u.test(basename) ||
    /^service-account.*\.json$/u.test(basename) ||
    /^id_(?:rsa|dsa|ecdsa|ed25519)$/u.test(basename)
  ) {
    return true;
  }

  return /\.(?:pem|key|p12|pfx|jks|keystore)$/u.test(basename);
}

function scanCandidatePath(path) {
  let sensitive = false;

  for (const definition of contentPatterns) {
    definition.pattern.lastIndex = 0;
    for (const match of path.matchAll(definition.pattern)) {
      if (!definition.allow?.(match[0])) {
        sensitive = true;
        break;
      }
    }
    if (sensitive) {
      break;
    }
  }

  if (!sensitive && localIdentityName && !isPublicIdentity(localIdentityName)) {
    sensitive = includesLiteral(path, localIdentityName);
  }
  if (!sensitive) {
    sensitive = localBlocklistMarkers.some((marker) => includesLiteral(path, marker));
  }

  if (sensitive) {
    redactedPaths.add(path);
    addFinding(path, 1, "sensitive-path");
  }
}

function readCandidate(path) {
  try {
    let buffer;
    if (stagedOnly) {
      buffer = runGit(["show", `:${path}`]);
    } else if (explicitHistoryRef) {
      buffer = runGit(["show", `${historyRef}:${path}`]);
    } else {
      const absolutePath = join(repositoryRoot, path);
      const stats = lstatSync(absolutePath);
      buffer = stats.isSymbolicLink()
        ? Buffer.from(readlinkSync(absolutePath), "utf8")
        : readFileSync(absolutePath);
    }

    return decodeBuffer(buffer);
  } catch (error) {
    if (!stagedOnly && error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function decodeBuffer(buffer) {
  const variants = [buffer.toString("utf8")];
  if (buffer.subarray(0, 8192).includes(0)) {
    const utf16Length = buffer.length - (buffer.length % 2);
    variants.push(buffer.subarray(0, utf16Length).toString("utf16le"));
    const swapped = Buffer.allocUnsafe(utf16Length);
    for (let index = 0; index < swapped.length; index += 2) {
      swapped[index] = buffer[index + 1];
      swapped[index + 1] = buffer[index];
    }
    variants.push(swapped.toString("utf16le"));
  }
  return variants.join("\n");
}

function scanContent(path, content) {
  for (const definition of contentPatterns) {
    definition.pattern.lastIndex = 0;
    for (const match of content.matchAll(definition.pattern)) {
      const value = match[0];
      if (definition.allow?.(value)) {
        continue;
      }
      addFinding(path, lineAt(content, match.index ?? 0), definition.category);
    }
  }

  if (!benchmarkExclusions.has(path)) {
    benchmarkPattern.lastIndex = 0;
    for (const match of content.matchAll(benchmarkPattern)) {
      addFinding(path, lineAt(content, match.index ?? 0), "benchmark-reference");
    }
  }

  const identity = localIdentityName;
  if (identity && !isPublicIdentity(identity)) {
    const identityPattern = new RegExp(escapeRegExp(identity), "giu");
    for (const match of content.matchAll(identityPattern)) {
      addFinding(path, lineAt(content, match.index ?? 0), "local-identity-marker");
    }
  }

  for (const marker of localBlocklistMarkers) {
    const markerPattern = new RegExp(escapeRegExp(marker), "giu");
    for (const match of content.matchAll(markerPattern)) {
      addFinding(path, lineAt(content, match.index ?? 0), "local-blocklist-marker");
    }
  }
}

function scanGitIdentity() {
  for (const name of new Set([localIdentityName, localCommitterName])) {
    if (name && !isPublicIdentity(name)) {
      addFinding("(git-config)", 1, "unsafe-git-name");
    }
  }
  for (const email of new Set([localGitEmail, localCommitterEmail])) {
    if (email && !isSafePlatformEmail(email)) {
      addFinding("(git-config)", 1, "unsafe-git-email");
    }
  }
}

function scanReachableCommitMetadata() {
  let output;
  try {
    output = runGit([
      "log",
      "--format=%an%x00%ae%x00%cn%x00%ce%x00%B%x00%x1e",
      historyRef,
    ]).toString("utf8");
  } catch {
    return;
  }

  const records = output.split("\x1e").filter((record) => record.replaceAll("\0", "").trim());
  records.forEach((record, index) => {
    const [authorName = "", authorEmail = "", committerName = "", committerEmail = "", message = ""] =
      record.replace(/^\n/gu, "").split("\0");

    for (const email of [authorEmail, committerEmail]) {
      if (email.trim() && !isSafePlatformEmail(email)) {
        addFinding("(commit-metadata)", index + 1, "commit-email");
      }
    }

    for (const name of [authorName, committerName]) {
      if (name.trim() && !isPublicIdentity(name)) {
        addFinding("(commit-metadata)", index + 1, "commit-name");
      }
      for (const marker of localBlocklistMarkers) {
        if (includesLiteral(name, marker)) {
          addFinding("(commit-metadata)", index + 1, "commit-identity-marker");
        }
      }
    }

    scanDetachedSensitiveText("(commit-message)", index + 1, message, "commit-message-");
    benchmarkPattern.lastIndex = 0;
    if (benchmarkPattern.test(message)) {
      addFinding("(commit-message)", index + 1, "commit-message-benchmark-reference");
    }
  });
}

function scanDetachedSensitiveText(path, line, content, categoryPrefix) {
  for (const definition of contentPatterns) {
    definition.pattern.lastIndex = 0;
    for (const match of content.matchAll(definition.pattern)) {
      if (!definition.allow?.(match[0])) {
        addFinding(path, line, `${categoryPrefix}${definition.category}`);
      }
    }
  }

  if (localIdentityName && !isPublicIdentity(localIdentityName) && includesLiteral(content, localIdentityName)) {
    addFinding(path, line, `${categoryPrefix}identity-marker`);
  }
  for (const marker of localBlocklistMarkers) {
    if (includesLiteral(content, marker)) {
      addFinding(path, line, `${categoryPrefix}identity-marker`);
    }
  }
}

function scanReachableTagMetadata() {
  let roots;
  try {
    roots = explicitHistoryRef
      ? [historyRef]
      : runGit(["for-each-ref", "--format=%(objectname)", "refs/tags"])
          .toString("utf8")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
  } catch {
    addFinding("(tag-metadata)", 1, "tag-metadata-error");
    return;
  }

  const scannedTags = new Set();
  let tagIndex = 0;
  for (const root of roots) {
    let objectId = root;
    const tagChain = new Set();

    while (objectId) {
      let type;
      try {
        type = runGit(["cat-file", "-t", objectId]).toString("utf8").trim();
      } catch {
        addFinding("(tag-metadata)", tagIndex + 1, "tag-object-error");
        break;
      }
      if (type !== "tag") {
        break;
      }
      if (tagChain.has(objectId)) {
        addFinding("(tag-metadata)", tagIndex + 1, "tag-cycle");
        break;
      }
      if (scannedTags.has(objectId)) {
        break;
      }

      tagChain.add(objectId);
      scannedTags.add(objectId);
      tagIndex += 1;

      let content;
      try {
        content = decodeBuffer(runGit(["cat-file", "-p", objectId]));
      } catch {
        addFinding("(tag-metadata)", tagIndex, "tag-object-error");
        break;
      }

      scanDetachedSensitiveText("(tag-metadata)", tagIndex, content, "tag-");
      benchmarkPattern.lastIndex = 0;
      if (benchmarkPattern.test(content)) {
        addFinding("(tag-metadata)", tagIndex, "tag-benchmark-reference");
      }

      const headerEnd = content.indexOf("\n\n");
      const header = headerEnd < 0 ? content : content.slice(0, headerEnd);
      const taggerLine = header.split("\n").find((line) => line.startsWith("tagger ")) ?? "";
      const tagger = /^tagger (.*) <([^<>]*)> \d+ [+-]\d{4}$/u.exec(taggerLine);
      if (!tagger) {
        addFinding("(tag-metadata)", tagIndex, "tag-tagger-error");
      } else {
        const [, name = "", email = ""] = tagger;
        if (name.trim() && !isPublicIdentity(name)) {
          addFinding("(tag-metadata)", tagIndex, "tag-name");
        }
        if (email.trim() && !isSafePlatformEmail(email)) {
          addFinding("(tag-metadata)", tagIndex, "tag-email");
        }
        for (const marker of localBlocklistMarkers) {
          if (includesLiteral(name, marker)) {
            addFinding("(tag-metadata)", tagIndex, "tag-identity-marker");
          }
        }
      }

      const target = /^object ([0-9a-f]{40,64})$/mu.exec(header)?.[1] ?? "";
      if (!target) {
        addFinding("(tag-metadata)", tagIndex, "tag-target-error");
        break;
      }
      objectId = target;
      scannedHistoryObjects += 1;
    }
  }
}

async function scanReachableBlobHistory() {
  let objectIds;
  try {
    objectIds = runGit(["rev-list", "--objects", "--no-object-names", historyRef])
      .toString("utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return;
  }

  if (objectIds.length === 0) {
    return;
  }

  const input = Buffer.from(`${objectIds.join("\n")}\n`, "utf8");
  const checks = runGit(["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"], {
    input,
    stdio: ["pipe", "pipe", "pipe"],
  })
    .toString("utf8")
    .split("\n");
  const parsedChecks = checks.filter((line) => line.trim()).map((line) => line.trim().split(" "));
  const oversized = parsedChecks.filter(
    ([, type, size]) => (type === "blob" || type === "tree") && Number(size) > 32 * 1024 * 1024,
  );
  if (oversized.length > 0) {
    addFinding("(history-object)", 1, "oversized-history-object");
  }
  const selected = parsedChecks
    .filter(([, type, size]) => (type === "blob" || type === "tree") && Number(size) <= 32 * 1024 * 1024)
    .map(([objectId, type]) => ({ objectId, type }));

  if (selected.length === 0) {
    return;
  }

  let objectIndex = 0;
  for (let start = 0; start < selected.length; start += historyContentBatchSize) {
    const selectedBatch = selected.slice(start, start + historyContentBatchSize);
    objectIndex = await scanHistoryContentBatch(selectedBatch, objectIndex);
  }
}

async function scanHistoryContentBatch(selectedBatch, objectIndex) {
  const typeByObjectId = new Map(selectedBatch.map(({ objectId, type }) => [objectId, type]));
  const child = spawn("git", ["cat-file", "--batch"], {
    cwd: repositoryRoot,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const completion = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    if (stderr.length < 16 * 1024) {
      stderr += chunk;
    }
  });
  child.stdin.on("error", () => {
    // The child close status below is the authoritative batch failure signal.
  });
  child.stdin.end(`${selectedBatch.map(({ objectId }) => objectId).join("\n")}\n`);

  let pending = Buffer.alloc(0);
  let expectedObject = null;
  let processedObjects = 0;

  for await (const chunk of child.stdout) {
    pending = pending.length === 0 ? chunk : Buffer.concat([pending, chunk]);

    while (pending.length > 0) {
      if (expectedObject === null) {
        const headerEnd = pending.indexOf(10);
        if (headerEnd < 0) {
          break;
        }
        const [objectId = "", type = "", sizeText = ""] = pending
          .subarray(0, headerEnd)
          .toString("utf8")
          .split(" ");
        const size = Number(sizeText);
        if (!typeByObjectId.has(objectId) || !Number.isSafeInteger(size) || size < 0) {
          throw new Error("Repository hygiene history stream returned malformed output.");
        }
        expectedObject = { objectId, size, type };
        pending = pending.subarray(headerEnd + 1);
      }

      if (pending.length < expectedObject.size + 1) {
        break;
      }
      if (pending[expectedObject.size] !== 10) {
        throw new Error("Repository hygiene history stream returned malformed content.");
      }

      const content = decodeBuffer(pending.subarray(0, expectedObject.size));
      const objectType = typeByObjectId.get(expectedObject.objectId) ?? expectedObject.type;
      const prefix = objectType === "tree" ? "history-path-" : "history-";
      scanDetachedSensitiveText(`(history-${objectType})`, objectIndex + 1, content, prefix);
      scannedHistoryObjects += 1;
      objectIndex += 1;
      processedObjects += 1;
      pending = pending.subarray(expectedObject.size + 1);
      expectedObject = null;
    }
  }

  const { code, signal } = await completion;
  if (code !== 0 || signal || stderr) {
    throw new Error("Repository hygiene history stream failed.");
  }
  if (expectedObject !== null || pending.length > 0 || processedObjects !== selectedBatch.length) {
    throw new Error("Repository hygiene history stream ended before all objects were scanned.");
  }

  return objectIndex;
}

function scanNewCommitRange() {
  if (!historyBase) {
    return;
  }

  let commits;
  try {
    commits = runGit(["rev-list", "--reverse", `${historyBase}..${historyRef}`])
      .toString("utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    addFinding("(history-range)", 1, "history-range-error");
    return;
  }

  commits.forEach((commit, commitIndex) => {
    const paths = runGit(["diff-tree", "--root", "-m", "--no-commit-id", "--name-only", "-r", "-z", commit])
      .toString("utf8")
      .split("\0")
      .filter(Boolean)
      .map(normalizePath);

    for (const path of paths) {
      let content;
      try {
        content = decodeBuffer(runGit(["show", `${commit}:${path}`]));
      } catch {
        continue;
      }

      scanCandidatePath(path);
      if (isLocalOnlyPath(path)) {
        addFinding(path, commitIndex + 1, "local-only-path");
      }
      if (isForbiddenCredentialPath(path)) {
        addFinding(path, commitIndex + 1, "credential-path");
      }
      if (benchmarkPathPattern.test(path)) {
        addFinding(path, commitIndex + 1, "benchmark-path");
      }
      scanContent(path, content);
    }
  });
}

function resolveHistoryBase() {
  if (!explicitHistoryRef) {
    return "";
  }
  if (requestedHistoryBase && !/^0{40,64}$/u.test(requestedHistoryBase)) {
    return requestedHistoryBase;
  }
  try {
    return runGit(["merge-base", historyRef, "refs/remotes/origin/main"]).toString("utf8").trim();
  } catch {
    return "";
  }
}

function getGitConfig(key) {
  try {
    return runGitText(["config", "--get", key]).trim();
  } catch {
    return "";
  }
}

function isPublicIdentity(identity) {
  const normalized = identity.trim().toLocaleLowerCase("en-US");
  if (!normalized) {
    return true;
  }

  if (/^(?:github-actions|dependabot)(?:\[bot\])?$/u.test(normalized) || normalized === "github") {
    return true;
  }

  return allowedPublicIdentities.has(normalized);
}

function publicRepositoryOwners() {
  const owners = new Set();
  const candidates = [];

  try {
    const packagePath = join(repositoryRoot, "package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
    const repositoryUrl =
      typeof packageJson.repository === "string" ? packageJson.repository : packageJson.repository?.url;
    if (typeof repositoryUrl === "string") {
      candidates.push(repositoryUrl);
    }
  } catch {
    // A repository without package metadata can still be scanned.
  }

  try {
    candidates.push(runGitText(["remote", "get-url", "origin"]).trim());
  } catch {
    // A temporary or new repository may not have a remote.
  }

  for (const candidate of candidates) {
    const match = candidate.match(/github\.com[/:]([^/]+)\//iu);
    if (match?.[1]) {
      owners.add(match[1].toLocaleLowerCase("en-US"));
    }
  }
  return owners;
}

function readLocalBlocklist() {
  try {
    return [
      ...new Set(
        readFileSync(join(repositoryRoot, ".local/hygiene-blocklist.txt"), "utf8")
          .split(/\r?\n/u)
          .map((line) => line.trim())
          .filter((line) => line.length >= 3 && !line.startsWith("#")),
      ),
    ];
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function isSafePlatformEmail(value) {
  const normalized = value.trim().toLocaleLowerCase("en-US");
  return normalized.endsWith("@users.noreply.github.com") || normalized === "noreply@github.com";
}

function includesLiteral(content, literal) {
  return content
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .includes(literal.normalize("NFKC").toLocaleLowerCase("en-US"));
}

function displayPath(path) {
  if (!redactedPaths.has(path)) {
    return path;
  }
  const fingerprint = createHash("sha256").update(path).digest("hex").slice(0, 12);
  return `[redacted-path:${fingerprint}]`;
}

function addFinding(path, line, category) {
  const normalizedPath = isAbsolute(path) ? normalizePath(relative(repositoryRoot, path)) : normalizePath(path);
  const key = `${normalizedPath}\0${line}\0${category}`;
  if (findingKeys.has(key)) {
    return;
  }
  findingKeys.add(key);
  findings.push({ category, line, path: normalizedPath });
}

function lineAt(content, index) {
  let line = 1;
  for (let offset = 0; offset < index; offset += 1) {
    if (content.charCodeAt(offset) === 10) {
      line += 1;
    }
  }
  return line;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function compareFindings(left, right) {
  return (
    left.path.localeCompare(right.path) ||
    left.line - right.line ||
    left.category.localeCompare(right.category)
  );
}
