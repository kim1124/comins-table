// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
const modules = import.meta.glob("../src/browser/table-transfer.ts", { eager: true });
function browser() {
  expect(modules["../src/browser/table-transfer.ts"], "Browser registration boundary").toBeDefined();
  return modules["../src/browser/table-transfer.ts"] as typeof import("../src/browser/table-transfer");
}
function snapshot(coordinator: object, tableId = "target") {
  const root = document.createElement("div"), viewport = document.createElement("div"), cell = document.createElement("span");
  root.dataset.cominsTableInstanceId = tableId + "-instance";
  root.dataset.cominsTransferTableId = tableId;
  root.dataset.cominsTransferScope = "scope";
  root.append(viewport); viewport.append(cell);
  return { config: { coordinator, scope: "scope", tableId }, endpoint: { tableId, data: [], getRowId: () => 0 }, instanceId: tableId + "-instance", root, viewport, cell };
}
describe("Browser transfer registrations", () => {
  it("isolates registries and scopes and rejects duplicate table registrations", () => {
    const api = browser(), a = api.createTableTransferRegistry<ReturnType<typeof snapshot>>(), b = api.createTableTransferRegistry<ReturnType<typeof snapshot>>();
    const value = snapshot({}), registration = { getSnapshot: () => value };
    const remove = a.register("scope", "target", registration);
    expect(a.get("scope", "target")).toBe(registration);
    expect(b.get("scope", "target")).toBeNull();
    expect(a.get("other", "target")).toBeNull();
    const removeDuplicate = a.register("scope", "target", { getSnapshot: () => value });
    expect(a.get("scope", "target")).toBeNull();
    removeDuplicate(); expect(a.get("scope", "target")).toBe(registration);
    remove(); expect(a.get("scope", "target")).toBeNull();
  });
  it("repeated cleanup cannot remove a replacement registered under the same keys", () => {
    const registry = browser().createTableTransferRegistry<ReturnType<typeof snapshot>>();
    const old = { getSnapshot: () => snapshot({}) };
    const remove = registry.register("scope", "target", old);
    const sibling = registry.register("scope", "sibling", old);
    remove();
    const replacement = { getSnapshot: () => snapshot({}) };
    const removeReplacement = registry.register("scope", "target", replacement);
    remove();
    expect(registry.get("scope", "target")).toBe(replacement);
    removeReplacement(); sibling();
    const again = registry.register("scope", "target", replacement);
    sibling();
    expect(registry.get("scope", "target")).toBe(replacement);
    again();
  });
  it("checks current snapshot identity instead of accepting stale coordinator, scope or table data", () => {
    const api = browser(), coordinator = {}, registry = api.createTableTransferRegistry<ReturnType<typeof snapshot>>();
    let current: ReturnType<typeof snapshot> | null = snapshot(coordinator);
    registry.register("scope", "target", { getSnapshot: () => current });
    const get = () => api.getRegisteredTransferSnapshot(registry, coordinator, "scope", "target");
    expect(get()).toBe(current);
    current = { ...current!, config: { ...current!.config, scope: "other" } }; expect(get()).toBeNull();
    current = snapshot({}); expect(get()).toBeNull();
    current = { ...snapshot(coordinator), endpoint: { tableId: "wrong", data: [], getRowId: () => 0 } }; expect(get()).toBeNull();
    current = null; expect(get()).toBeNull();
  });
  it("rejects stale DOM instances, roots and detached viewports when resolving a hit", () => {
    const api = browser(), coordinator = {}, source = snapshot(coordinator, "source");
    let target = snapshot(coordinator);
    const original = target;
    const hit = () => api.getCrossTableTransferHit({ sourceTableId: "source", scope: "scope", instanceId: source.instanceId, root: source.root, clientX: 10, clientY: 10, document: { elementFromPoint: () => original.cell }, getSnapshot: id => id === "source" ? source : target });
    expect(hit()?.snapshot).toBe(target);
    target = { ...original, instanceId: "stale" }; expect(hit()).toBeNull();
    target = { ...original, root: document.createElement("div") }; expect(hit()).toBeNull();
    target = { ...original, viewport: document.createElement("div") }; expect(hit()).toBeNull();
    target = original; source.instanceId = "stale-source";
    expect(api.getCrossTableTransferHit({ sourceTableId: "source", scope: "scope", instanceId: "source-instance", root: source.root, clientX: 0, clientY: 0, document: { elementFromPoint: () => original.cell }, getSnapshot: id => id === "source" ? source : target })).toBeNull();
  });
});
