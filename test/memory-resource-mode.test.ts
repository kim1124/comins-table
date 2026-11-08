import { expect, it, vi } from "vitest";
import type { Page } from "@playwright/test";
import { installMemoryResources } from "./playwright/helpers/memory-resources";

it("keeps the counter process free of observer WeakRef history and timer wrappers", async () => {
  const addInitScript = vi.fn();
  const page = { addInitScript } as unknown as Page;
  await installMemoryResources(page, "counter");
  expect(addInitScript).not.toHaveBeenCalled();
});

it("installs observer and timer probes only in a separate diagnostic process", async () => {
  const addInitScript = vi.fn();
  const page = { addInitScript } as unknown as Page;
  await installMemoryResources(page, "diagnostic");
  expect(addInitScript).toHaveBeenCalledTimes(1);
});


it("rejects an omitted mode instead of silently adding diagnostic history", async () => {
  const addInitScript = vi.fn();
  const page = { addInitScript } as unknown as Page;
  // @ts-expect-error callers must explicitly choose the process mode
  await expect(installMemoryResources(page)).rejects.toThrow(/explicit counter or diagnostic mode/);
  expect(addInitScript).not.toHaveBeenCalled();
});
