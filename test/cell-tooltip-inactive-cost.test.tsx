// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CominsTable } from "../src";
import * as tooltipModule from "../src/react/cell-tooltip";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root: ReturnType<typeof createRoot> | undefined;
let host: HTMLDivElement | undefined;
afterEach(() => {
  act(() => root?.unmount()); host?.remove(); root = undefined; host = undefined;
  vi.restoreAllMocks(); vi.useRealTimers();
});
function mount(custom = false) {
  const surface = vi.spyOn(tooltipModule, "CominsCellTooltip");
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  act(() => root!.render(<CominsTable columns={[{ field: "name", label: "Name", cell: custom ? { tooltip: { render: () => "Details" } } : undefined }]}
    data={[{ id: "a", name: "Alpha" }]} getRowId={row => row.id} />));
  return { surface, cell: host.querySelector<HTMLElement>('[data-testid="cell-a-name"]')! };
}
describe("inactive tooltip render cost", () => {
  it("does not render a surface for ordinary cells or pointer exit", () => {
    const { surface, cell } = mount();
    act(() => cell.dispatchEvent(new MouseEvent("pointerout", { bubbles: true })));
    expect(surface).not.toHaveBeenCalled();
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });
  it("defers the custom surface until active, then closes and reopens accessibly", () => {
    vi.useFakeTimers();
    const { surface, cell } = mount(true);
    expect(surface).not.toHaveBeenCalled();
    cell.setAttribute("aria-describedby", "existing");
    act(() => cell.focus());
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    act(() => vi.advanceTimersByTime(50));
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe("Details");
    expect(cell.getAttribute("aria-describedby")).toContain("existing comins-cell-tooltip-");
    act(() => cell.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" })));
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    expect(cell.getAttribute("aria-describedby")).toBe("existing");
    surface.mockClear();
    act(() => cell.blur());
    expect(surface).not.toHaveBeenCalled();
    act(() => cell.focus());
    act(() => vi.advanceTimersByTime(50));
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe("Details");
  });
});
