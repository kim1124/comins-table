import { EventEmitter } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { CDPSession } from "@playwright/test";
import { expect, it, vi } from "vitest";
import { saveMemoryHeap } from "./playwright/helpers/memory-heap";

it("reports a snapshot filename collision without starting CDP capture or replacing evidence", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "comins-heap-stream-"));
  const filename = path.join(directory, "existing.heapsnapshot");
  const send = vi.fn(async () => {});
  const session = Object.assign(new EventEmitter(), { send }) as unknown as CDPSession;
  try {
    await writeFile(filename, "preserve");
    await expect(saveMemoryHeap(session, filename)).rejects.toMatchObject({ code: "EEXIST" });
    expect(send).not.toHaveBeenCalled();
    expect(await readFile(filename, "utf8")).toBe("preserve");
  } finally {
    await rm(directory, { recursive: true });
  }
});
