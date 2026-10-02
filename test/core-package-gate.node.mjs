import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";

const modulePath = resolve("scripts/verify-core-package.mjs");
test("local package gate exists", () => assert.ok(existsSync(modulePath)));
for (const status of [0, 1, 2]) {
  test(`propagates checker exit ${status} and cleans its own artifact`, async () => {
    assert.ok(existsSync(modulePath));
    const { verifyCorePackage } = await import(modulePath);
    const parent = mkdtempSync(resolve(tmpdir(), "comins-gate-test-"));
    const sentinel = resolve(parent, "keep.txt");
    writeFileSync(sentinel, "user-owned");
    let temporary;
    try {
      const actual = verifyCorePackage({ root: process.cwd(), tempParent: parent, log: () => {}, run(command, args, options) {
        if (command === "npm") {
          assert.ok(args.includes("--offline"));
          assert.ok(args.includes("--ignore-scripts"));
          assert.equal(args[0], "pack");
          temporary = args[args.indexOf("--pack-destination") + 1];
          assert.equal(options.env.npm_config_cache, resolve(temporary, "cache"));
          writeFileSync(resolve(temporary, "fixture.tgz"), "trusted local artifact");
          return { status: 0, stdout: JSON.stringify([{ filename: "fixture.tgz" }]), stderr: "" };
        }
        assert.equal(command, process.execPath);
        assert.equal(args[0], resolve("scripts/check-core-boundary.mjs"));
        assert.equal(args[1], resolve(temporary, "fixture.tgz"));
        assert.deepEqual(args.slice(2), ["--source-root", process.cwd()]);
        return { status, stdout: "checker evidence", stderr: "" };
      } });
      assert.equal(actual, status);
      assert.equal(existsSync(temporary), false);
      assert.equal(readFileSync(sentinel, "utf8"), "user-owned");
    } finally { rmSync(parent, { recursive: true, force: true }); }
  });
}
for (const failure of ["pack", "json", "escape", "missing", "process"]) {
  test(`reports setup failure and cleans up on ${failure}`, async () => {
    assert.ok(existsSync(modulePath));
    const { verifyCorePackage } = await import(modulePath);
    let temporary;
    const result = verifyCorePackage({ root: process.cwd(), log: () => {}, run(command, args) {
      assert.equal(command, "npm", "checker must not run after failed packing");
      temporary = args[args.indexOf("--pack-destination") + 1];
      if (failure === "process") return { status: null, error: new Error("cannot execute") };
      return { status: failure === "pack" ? 1 : 0, stdout: failure === "json" ? "invalid" : JSON.stringify([{ filename: failure === "escape" ? "../outside.tgz" : "missing.tgz" }]), stderr: "" };
    } });
    assert.equal(result, 2);
    assert.equal(existsSync(temporary), false);
  });
}
