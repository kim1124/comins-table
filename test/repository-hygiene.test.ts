import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const scannerPath = join(repositoryRoot, "scripts/check-repository-hygiene.mjs");
const temporaryRoots: string[] = [];

function createRepository() {
  const root = mkdtempSync(join(tmpdir(), "comins-table-hygiene-"));
  temporaryRoots.push(root);
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync("git", ["config", "user.name", "github-actions[bot]"], { cwd: root });
  execFileSync(
    "git",
    ["config", "user.email", ["41898282+github-actions[bot]", "users.noreply.github.com"].join("@")],
    { cwd: root },
  );
  return root;
}

function writeRepositoryFile(root: string, path: string, content: string | Uint8Array) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

function add(root: string, ...paths: string[]) {
  execFileSync("git", ["add", "--", ...paths], { cwd: root });
}

function scan(root: string, ...args: string[]) {
  return scanWithEnvironment(root, {}, ...args);
}

function scanWithEnvironment(root: string, environment: NodeJS.ProcessEnv, ...args: string[]) {
  return spawnSync(process.execPath, [scannerPath, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...environment },
  });
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

describe("repository hygiene scanner", () => {
  it("passes a clean tracked repository", () => {
    const root = createRepository();
    writeRepositoryFile(root, "src/index.ts", "export const value = 1;\n");
    add(root, "src/index.ts");

    const result = scan(root);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Repository hygiene check passed");
  });

  it("blocks a local-only path when it is staged forcefully", () => {
    const root = createRepository();
    writeRepositoryFile(root, ".gitignore", "/.local/\n");
    writeRepositoryFile(root, ".local/benchmarks/catalog.md", "local research\n");
    add(root, ".gitignore");
    execFileSync("git", ["add", "--force", ".local/benchmarks/catalog.md"], { cwd: root });

    const result = scan(root, "--staged");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("local-only-path");
  });

  it("blocks a credential path when it is staged forcefully", () => {
    const root = createRepository();
    writeRepositoryFile(root, ".env.local", "PLACEHOLDER=replace-me\n");
    execFileSync("git", ["add", "--force", ".env.local"], { cwd: root });

    const result = scan(root, "--staged");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("credential-path");
  });

  it("detects sensitive values without printing the matched values", () => {
    const root = createRepository();
    const email = ["owner", "example.com"].join("@");
    const homePath = ["", "Users", "private-user", "project"].join("/");
    const token = ["gh", "p_", "a".repeat(36)].join("");
    const privateKey = ["-----BEGIN", "PRIVATE KEY-----"].join(" ");
    writeRepositoryFile(root, "notes.txt", `${email}\n${homePath}\n${token}\n${privateKey}\n`);
    add(root, "notes.txt");

    const result = scan(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("email-address");
    expect(result.stderr).toContain("absolute-home-path");
    expect(result.stderr).toContain("provider-token");
    expect(result.stderr).toContain("private-key");
    expect(result.stderr).not.toContain(email);
    expect(result.stderr).not.toContain(homePath);
    expect(result.stderr).not.toContain(token);
    expect(result.stderr).not.toContain(privateKey);
  });

  it("detects a sensitive UTF-16 file", () => {
    const root = createRepository();
    const token = ["gh", "p_", "d".repeat(36)].join("");
    const oddLengthContent = Buffer.concat([Buffer.from(token, "utf16le"), Buffer.from([0xff])]);
    writeRepositoryFile(root, "notes.txt", oddLengthContent);
    add(root, "notes.txt");

    const result = scan(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("provider-token");
    expect(result.stderr).not.toContain(token);
  });

  it("redacts a sensitive filename from scanner output", () => {
    const root = createRepository();
    const email = ["owner", "example.com"].join("@");
    const path = `notes/${email}.txt`;
    writeRepositoryFile(root, path, "safe content\n");
    add(root, path);

    const result = scan(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("sensitive-path");
    expect(result.stderr).toContain("[redacted-path:");
    expect(result.stderr).not.toContain(email);
    expect(result.stderr).not.toContain(path);
  });

  it("blocks a research asset path even when its binary content is neutral", () => {
    const root = createRepository();
    writeRepositoryFile(root, "benchmarks/capture.png", new Uint8Array([0, 1, 2, 3]));
    add(root, "benchmarks/capture.png");

    const result = scan(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("benchmark-path");
  });

  it("scans the staged snapshot instead of an unstaged working-tree edit", () => {
    const root = createRepository();
    writeRepositoryFile(root, "src/config.ts", "export const enabled = true;\n");
    add(root, "src/config.ts");
    const token = ["gh", "p_", "b".repeat(36)].join("");
    writeRepositoryFile(root, "src/config.ts", `export const token = "${token}";\n`);

    const stagedResult = scan(root, "--staged");
    const workingTreeResult = scan(root);

    expect(stagedResult.status, stagedResult.stderr).toBe(0);
    expect(workingTreeResult.status).toBe(1);
    expect(workingTreeResult.stderr).toContain("provider-token");
  });

  it("detects a sensitive staged snapshot even after the working tree is cleaned", () => {
    const root = createRepository();
    const token = ["gh", "p_", "c".repeat(36)].join("");
    writeRepositoryFile(root, "src/config.ts", `export const token = "${token}";\n`);
    add(root, "src/config.ts");
    writeRepositoryFile(root, "src/config.ts", "export const enabled = true;\n");

    const result = scan(root, "--staged");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("provider-token");
    expect(result.stderr).not.toContain(token);
  });

  it("scans every tracked entry in the staged index", () => {
    const root = createRepository();
    const email = ["retained", "mail.example"].join("@");
    writeRepositoryFile(root, "retained.txt", `${email}\n`);
    add(root, "retained.txt");
    execFileSync("git", ["commit", "--quiet", "-m", "initial"], { cwd: root });
    writeRepositoryFile(root, "changed.txt", "safe content\n");
    add(root, "changed.txt");

    const result = scan(root, "--staged");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("email-address");
    expect(result.stderr).not.toContain(email);
  });

  it("blocks named third-party table comparison research", () => {
    const root = createRepository();
    const vendor = ["AG", "Grid"].join(" ");
    writeRepositoryFile(root, "docs/research.md", `${vendor} feature comparison matrix\n`);
    add(root, "docs/research.md");

    const result = scan(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("benchmark-reference");
  });

  it("blocks every cataloged comparison module reference", () => {
    const root = createRepository();
    const moduleName = ["react", "window"].join("-");
    writeRepositoryFile(root, "docs/notes.md", `${moduleName} feature comparison\n`);
    add(root, "docs/notes.md");

    const result = scan(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("benchmark-reference");
  });

  it("blocks the local Git author identity without exposing it", () => {
    const root = createRepository();
    execFileSync("git", ["config", "user.name", "Private Person"], { cwd: root });
    writeRepositoryFile(root, "notes.md", "Reviewed by Private Person.\n");
    add(root, "notes.md");

    const result = scan(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("local-identity-marker");
    expect(result.stderr).not.toContain("Private Person");
  });

  it("blocks a personal Git author email before a commit", () => {
    const root = createRepository();
    const email = ["private", "mail.example"].join("@");
    execFileSync("git", ["config", "user.email", email], { cwd: root });
    writeRepositoryFile(root, "src/index.ts", "export const value = 1;\n");
    add(root, "src/index.ts");

    const result = scan(root, "--staged");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("unsafe-git-email");
    expect(result.stderr).not.toContain(email);
  });

  it("blocks a personal email retained in reachable commit metadata", () => {
    const root = createRepository();
    const email = ["historical", "mail.example"].join("@");
    execFileSync("git", ["config", "user.name", "Private Person"], { cwd: root });
    execFileSync("git", ["config", "user.email", email], { cwd: root });
    writeRepositoryFile(root, "src/index.ts", "export const value = 1;\n");
    add(root, "src/index.ts");
    execFileSync("git", ["commit", "--quiet", "-m", "initial"], { cwd: root });
    execFileSync("git", ["config", "user.name", "github-actions[bot]"], { cwd: root });
    execFileSync(
      "git",
      ["config", "user.email", ["41898282+github-actions[bot]", "users.noreply.github.com"].join("@")],
      { cwd: root },
    );

    const result = scan(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("commit-email");
    expect(result.stderr).not.toContain(email);
  });

  it("blocks a non-public name retained with a noreply commit email", () => {
    const root = createRepository();
    execFileSync("git", ["config", "user.name", "Private Person"], { cwd: root });
    writeRepositoryFile(root, "src/index.ts", "export const value = 1;\n");
    add(root, "src/index.ts");
    execFileSync("git", ["commit", "--quiet", "-m", "initial"], { cwd: root });
    execFileSync("git", ["config", "user.name", "github-actions[bot]"], { cwd: root });

    const result = scan(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("commit-name");
    expect(result.stderr).not.toContain("Private Person");
  });

  it("blocks sensitive data retained in a commit message", () => {
    const root = createRepository();
    const email = ["message", "mail.example"].join("@");
    writeRepositoryFile(root, "src/index.ts", "export const value = 1;\n");
    add(root, "src/index.ts");
    execFileSync("git", ["commit", "--quiet", "-m", `contact ${email}`], { cwd: root });

    const result = scan(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("commit-message-email-address");
    expect(result.stderr).not.toContain(email);
  });

  it("blocks named comparison material retained in a commit message", () => {
    const root = createRepository();
    const vendor = ["AG", "Grid"].join(" ");
    writeRepositoryFile(root, "src/index.ts", "export const value = 1;\n");
    add(root, "src/index.ts");
    execFileSync("git", ["commit", "--quiet", "-m", `${vendor} comparison`], { cwd: root });

    const result = scan(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("commit-message-benchmark-reference");
  });

  it("blocks sensitive content retained only in an intermediate commit", () => {
    const root = createRepository();
    const token = ["gh", "p_", "e".repeat(36)].join("");
    writeRepositoryFile(root, "src/config.ts", `export const token = "${token}";\n`);
    add(root, "src/config.ts");
    execFileSync("git", ["commit", "--quiet", "-m", "initial"], { cwd: root });
    writeRepositoryFile(root, "src/config.ts", "export const enabled = true;\n");
    add(root, "src/config.ts");
    execFileSync("git", ["commit", "--quiet", "-m", "remove local value"], { cwd: root });

    const result = scan(root);

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(1);
    expect(result.stderr).toContain("history-provider-token");
    expect(result.stderr).not.toContain(token);
  });

  it("keeps each reachable history content batch within 128 objects", () => {
    const root = createRepository();
    for (let index = 0; index < 140; index += 1) {
      writeRepositoryFile(root, `src/history-${index}.txt`, `safe fixture ${index}\n`);
    }
    add(root, "src");
    execFileSync("git", ["commit", "--quiet", "-m", "large safe history"], { cwd: root });

    const realGit = execFileSync("/usr/bin/env", ["sh", "-c", "command -v git"], {
      encoding: "utf8",
    }).trim();
    const binaryDirectory = join(root, "test-bin");
    const gitWrapper = join(binaryDirectory, "git");
    writeRepositoryFile(
      root,
      "test-bin/git",
      [
        "#!/bin/sh",
        "set -eu",
        'if [ "$1" = "cat-file" ] && [ "${2:-}" = "--batch" ]; then',
        '  input_file="$(mktemp)"',
        '  trap \'rm -f "$input_file"\' 0',
        '  cat > "$input_file"',
        '  object_count="$(wc -l < "$input_file")"',
        '  if [ "$object_count" -gt 128 ]; then',
        '    echo "history content batch exceeded 128 objects" >&2',
        "    exit 86",
        "  fi",
        '  "$COMINS_TEST_REAL_GIT" "$@" < "$input_file"',
        "  exit $?",
        "fi",
        'exec "$COMINS_TEST_REAL_GIT" "$@"',
        "",
      ].join("\n"),
    );
    chmodSync(gitWrapper, 0o755);

    const result = scanWithEnvironment(root, {
      COMINS_TEST_REAL_GIT: realGit,
      PATH: `${binaryDirectory}${delimiter}${process.env.PATH ?? ""}`,
    });

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
  });

  it("streams reachable history content instead of synchronously capturing binary output", () => {
    const source = readFileSync(scannerPath, "utf8");

    expect(source).not.toContain('runGit(["cat-file", "--batch"]');
    expect(source).toContain('spawn("git", ["cat-file", "--batch"]');
  });

  it("aligns odd-length buffers before UTF-16 decoding", () => {
    const source = readFileSync(scannerPath, "utf8");

    expect(source).toContain("const utf16Length = buffer.length - (buffer.length % 2);");
    expect(source).toContain('buffer.subarray(0, utf16Length).toString("utf16le")');
    expect(source).not.toContain('buffer.toString("utf16le")');
  });

  it("scans the exact commit selected by the pre-push environment", () => {
    const root = createRepository();
    writeRepositoryFile(root, "src/index.ts", "export const value = 1;\n");
    add(root, "src/index.ts");
    execFileSync("git", ["commit", "--quiet", "-m", "safe main"], { cwd: root });
    execFileSync("git", ["switch", "--quiet", "-c", "unsafe-branch"], { cwd: root });
    const token = ["gh", "p_", "f".repeat(36)].join("");
    writeRepositoryFile(root, "src/config.ts", `export const token = "${token}";\n`);
    add(root, "src/config.ts");
    execFileSync("git", ["commit", "--quiet", "-m", "branch value"], { cwd: root });
    writeRepositoryFile(root, "src/config.ts", "export const enabled = true;\n");
    add(root, "src/config.ts");
    execFileSync("git", ["commit", "--quiet", "-m", "remove branch value"], { cwd: root });
    const unsafeCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    execFileSync("git", ["switch", "--quiet", "master"], { cwd: root });

    const result = scanWithEnvironment(root, { COMINS_HYGIENE_REF: unsafeCommit });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("history-provider-token");
    expect(result.stderr).not.toContain(token);
  });

  it("scans the exact tip tree selected by the pre-push environment", () => {
    const root = createRepository();
    writeRepositoryFile(root, "src/index.ts", "export const value = 1;\n");
    add(root, "src/index.ts");
    execFileSync("git", ["commit", "--quiet", "-m", "safe main"], { cwd: root });
    execFileSync("git", ["switch", "--quiet", "-c", "unsafe-branch"], { cwd: root });
    const vendor = ["AG", "Grid"].join(" ");
    writeRepositoryFile(root, "docs/notes.md", `${vendor} comparison\n`);
    writeRepositoryFile(root, "benchmarks/capture.png", new Uint8Array([0, 1, 2, 3]));
    writeRepositoryFile(root, ".env.local", "PLACEHOLDER=replace-me\n");
    add(root, "docs/notes.md", "benchmarks/capture.png");
    execFileSync("git", ["add", "--force", ".env.local"], { cwd: root });
    execFileSync("git", ["commit", "--quiet", "-m", "unsafe tip tree"], { cwd: root });
    const unsafeCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    execFileSync("git", ["switch", "--quiet", "master"], { cwd: root });

    const result = scanWithEnvironment(root, { COMINS_HYGIENE_REF: unsafeCommit });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("benchmark-reference");
    expect(result.stderr).toContain("benchmark-path");
    expect(result.stderr).toContain("credential-path");
  });

  it("blocks sensitive annotated tag metadata and messages", () => {
    const root = createRepository();
    writeRepositoryFile(root, "src/index.ts", "export const value = 1;\n");
    add(root, "src/index.ts");
    execFileSync("git", ["commit", "--quiet", "-m", "safe main"], { cwd: root });
    const token = ["gh", "p_", "t".repeat(36)].join("");
    const email = ["private-tagger", "example.com"].join("@");
    const name = ["Private", "Tagger"].join(" ");
    const vendor = ["AG", "Grid"].join(" ");
    execFileSync("git", ["tag", "--annotate", "v1.0.0", "--message", `${vendor} ${token}`], {
      cwd: root,
      env: {
        ...process.env,
        GIT_COMMITTER_EMAIL: email,
        GIT_COMMITTER_NAME: name,
      },
    });
    const tagObject = execFileSync("git", ["rev-parse", "refs/tags/v1.0.0"], {
      cwd: root,
      encoding: "utf8",
    }).trim();

    const result = scanWithEnvironment(root, { COMINS_HYGIENE_REF: tagObject });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("tag-email");
    expect(result.stderr).toContain("tag-name");
    expect(result.stderr).toContain("tag-provider-token");
    expect(result.stderr).toContain("tag-benchmark-reference");
    expect(result.stderr).not.toContain(token);
    expect(result.stderr).not.toContain(email);
    expect(result.stderr).not.toContain(name);
    expect(result.stderr).not.toContain(vendor);
  });

  it("allows a lightweight tag that points to a clean commit", () => {
    const root = createRepository();
    writeRepositoryFile(root, "src/index.ts", "export const value = 1;\n");
    add(root, "src/index.ts");
    execFileSync("git", ["commit", "--quiet", "-m", "safe main"], { cwd: root });
    execFileSync("git", ["tag", "v1.0.0"], { cwd: root });
    const tagTarget = execFileSync("git", ["rev-parse", "refs/tags/v1.0.0"], {
      cwd: root,
      encoding: "utf8",
    }).trim();

    const result = scanWithEnvironment(root, { COMINS_HYGIENE_REF: tagTarget });

    expect(result.status, result.stderr).toBe(0);
  });

  it("scans sensitive messages through a nested annotated tag chain", () => {
    const root = createRepository();
    writeRepositoryFile(root, "src/index.ts", "export const value = 1;\n");
    add(root, "src/index.ts");
    execFileSync("git", ["commit", "--quiet", "-m", "safe main"], { cwd: root });
    const token = ["gh", "p_", "n".repeat(36)].join("");
    execFileSync("git", ["tag", "--annotate", "inner", "--message", token], { cwd: root });
    execFileSync("git", ["config", "advice.nestedTag", "false"], { cwd: root });
    execFileSync("git", ["tag", "--annotate", "outer", "inner", "--message", "safe outer tag"], {
      cwd: root,
    });
    const outerTag = execFileSync("git", ["rev-parse", "refs/tags/outer"], {
      cwd: root,
      encoding: "utf8",
    }).trim();

    const result = scanWithEnvironment(root, { COMINS_HYGIENE_REF: outerTag });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("tag-provider-token");
    expect(result.stderr).not.toContain(token);
  });

  it("scans comparison material retained only between the remote base and pushed tip", () => {
    const root = createRepository();
    writeRepositoryFile(root, "src/index.ts", "export const value = 1;\n");
    add(root, "src/index.ts");
    execFileSync("git", ["commit", "--quiet", "-m", "safe main"], { cwd: root });
    const baseCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    execFileSync("git", ["switch", "--quiet", "-c", "unsafe-branch"], { cwd: root });
    const vendor = ["AG", "Grid"].join(" ");
    writeRepositoryFile(root, "docs/notes.md", `${vendor} feature comparison\n`);
    add(root, "docs/notes.md");
    execFileSync("git", ["commit", "--quiet", "-m", "add local comparison"], { cwd: root });
    rmSync(join(root, "docs/notes.md"));
    execFileSync("git", ["add", "--update"], { cwd: root });
    execFileSync("git", ["commit", "--quiet", "-m", "remove local comparison"], { cwd: root });
    const unsafeCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    execFileSync("git", ["switch", "--quiet", "master"], { cwd: root });

    const result = scanWithEnvironment(root, {
      COMINS_HYGIENE_BASE: baseCommit,
      COMINS_HYGIENE_REF: unsafeCommit,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("benchmark-reference");
  });

  it("allows a pushed commit that only deletes forbidden base material", () => {
    const root = createRepository();
    writeRepositoryFile(root, "benchmarks/legacy.png", new Uint8Array([0, 1, 2, 3]));
    add(root, "benchmarks/legacy.png");
    execFileSync("git", ["commit", "--quiet", "-m", "legacy base"], { cwd: root });
    const baseCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    execFileSync("git", ["switch", "--quiet", "-c", "cleanup-branch"], { cwd: root });
    rmSync(join(root, "benchmarks/legacy.png"));
    execFileSync("git", ["add", "--update"], { cwd: root });
    execFileSync("git", ["commit", "--quiet", "-m", "remove legacy material"], { cwd: root });
    const cleanupCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();

    const result = scanWithEnvironment(root, {
      COMINS_HYGIENE_BASE: baseCommit,
      COMINS_HYGIENE_REF: cleanupCommit,
    });

    expect(result.status, result.stderr).toBe(0);
  });

  it("blocks a non-public Git author name before a commit", () => {
    const root = createRepository();
    execFileSync("git", ["config", "user.name", "Private Person"], { cwd: root });
    writeRepositoryFile(root, "src/index.ts", "export const value = 1;\n");
    add(root, "src/index.ts");

    const result = scan(root, "--staged");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("unsafe-git-name");
    expect(result.stderr).not.toContain("Private Person");
  });

  it("blocks a Git author identity supplied through an environment override", () => {
    const root = createRepository();
    writeRepositoryFile(root, "src/index.ts", "export const value = 1;\n");
    add(root, "src/index.ts");

    const result = scanWithEnvironment(root, { GIT_AUTHOR_NAME: "Private Person" }, "--staged");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("unsafe-git-name");
    expect(result.stderr).not.toContain("Private Person");
  });

  it("blocks an identity marker configured in the ignored local blocklist", () => {
    const root = createRepository();
    const marker = "Former Private Name";
    writeRepositoryFile(root, ".gitignore", "/.local/\n");
    writeRepositoryFile(root, ".local/hygiene-blocklist.txt", `# local only\n${marker}\n`);
    writeRepositoryFile(root, "notes.md", `Reviewed by ${marker}.\n`);
    add(root, ".gitignore", "notes.md");

    const result = scan(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("local-blocklist-marker");
    expect(result.stderr).not.toContain(marker);
  });

  it("does not treat its own matcher definitions as findings", () => {
    const root = createRepository();
    writeRepositoryFile(root, "scripts/check-repository-hygiene.mjs", readFileSync(scannerPath, "utf8"));
    add(root, "scripts/check-repository-hygiene.mjs");

    const result = scan(root);

    expect(result.status, result.stderr).toBe(0);
  });

  it("keeps repository-only safeguards outside the published package allowlist", () => {
    const packageJson = JSON.parse(readFileSync(join(repositoryRoot, "package.json"), "utf8")) as {
      files?: string[];
    };

    expect(packageJson.files).toEqual(["dist", "README.md", "styles.css", "CHANGELOG.md"]);
    expect(packageJson.files).not.toContain(".local");
    expect(packageJson.files).not.toContain("scripts");
    expect(packageJson.files).not.toContain("test");
    expect(packageJson.files).not.toContain("reports");
    expect(packageJson.files).not.toContain(".githooks");
  });
});
