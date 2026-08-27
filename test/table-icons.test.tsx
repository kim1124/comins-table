// @vitest-environment jsdom

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CominsTableIcon,
  CominsTableIconButton,
  type CominsTableIconName,
} from "../src/table-icons";

const modulePath = resolve(process.cwd(), "src/table-icons.tsx");
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

describe("private Comins Table icon primitives", () => {
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;
  });

  it("defines the module-owned icon primitive boundary", () => {
    expect(existsSync(modulePath)).toBe(true);
    const source = readFileSync(modulePath, "utf8");

    expect(source).toContain("export function CominsTableIcon");
    expect(source).toContain("export const CominsTableIconButton");
  });

  it("maps every Core semantic icon to a decorative 15px Radix SVG", () => {
    const names: CominsTableIconName[] = [
      "columnMove",
      "disclosureCollapsed",
      "disclosureExpanded",
      "filter",
      "sortAscending",
      "sortDescending",
      "sortUnsorted",
    ];
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => root?.render(names.map((name) => <CominsTableIcon key={name} name={name} />)));

    for (const name of names) {
      const icon = container.querySelector<SVGElement>(`svg[data-comins-icon='${name}']`);
      expect(icon).not.toBeNull();
      expect(icon?.getAttribute("aria-hidden")).toBe("true");
      expect(icon?.getAttribute("focusable")).toBe("false");
      expect(icon?.getAttribute("height")).toBe("15");
      expect(icon?.getAttribute("width")).toBe("15");
      expect(icon?.classList.contains("comins-table-icon")).toBe(true);
    }
  });

  it("uses thick directional arrows for sorted states and retains CaretSortIcon while unsorted", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <>
          <CominsTableIcon name="sortAscending" />
          <CominsTableIcon name="sortDescending" />
          <CominsTableIcon name="sortUnsorted" />
        </>,
      );
    });

    expect(
      container.querySelector("svg[data-comins-icon='sortAscending'] path")?.getAttribute("d"),
    ).toBe(
      "M7.5 1C7.66148 1 7.81301 1.07798 7.90687 1.20938L12.9069 8.20938C13.0157 8.36179 13.0303 8.56226 12.9446 8.72879C12.8589 8.89533 12.6873 9 12.5 9H10V11.5C10 11.7761 9.77614 12 9.5 12H5.5C5.22386 12 5 11.7761 5 11.5V9H2.5C2.31271 9 2.14112 8.89533 2.05542 8.72879C1.96972 8.56226 1.98427 8.36179 2.09314 8.20938L7.09314 1.20938C7.18699 1.07798 7.33853 1 7.5 1ZM3.4716 8H5.5C5.77614 8 6 8.22386 6 8.5V11H9V8.5C9 8.22386 9.22386 8 9.5 8H11.5284L7.5 2.36023L3.4716 8Z",
    );
    expect(
      container.querySelector("svg[data-comins-icon='sortDescending'] path")?.getAttribute("d"),
    ).toBe(
      "M5 3.5C5 3.22386 5.22386 3 5.5 3H9.5C9.77614 3 10 3.22386 10 3.5V6H12.5C12.6873 6 12.8589 6.10467 12.9446 6.27121C13.0303 6.43774 13.0157 6.63821 12.9069 6.79062L7.90687 13.7906C7.81301 13.922 7.66148 14 7.5 14C7.33853 14 7.18699 13.922 7.09314 13.7906L2.09314 6.79062C1.98427 6.63821 1.96972 6.43774 2.05542 6.27121C2.14112 6.10467 2.31271 6 2.5 6H5V3.5ZM6 4V6.5C6 6.77614 5.77614 7 5.5 7H3.4716L7.5 12.6398L11.5284 7H9.5C9.22386 7 9 6.77614 9 6.5V4H6Z",
    );
    expect(
      container.querySelector("svg[data-comins-icon='sortUnsorted'] path")?.getAttribute("d"),
    ).toBe(
      "M4.93179 5.43179C4.75605 5.60753 4.75605 5.89245 4.93179 6.06819C5.10753 6.24392 5.39245 6.24392 5.56819 6.06819L7.49999 4.13638L9.43179 6.06819C9.60753 6.24392 9.89245 6.24392 10.0682 6.06819C10.2439 5.89245 10.2439 5.60753 10.0682 5.43179L7.81819 3.18179C7.73379 3.0974 7.61933 3.04999 7.49999 3.04999C7.38064 3.04999 7.26618 3.0974 7.18179 3.18179L4.93179 5.43179ZM10.0682 9.56819C10.2439 9.39245 10.2439 9.10753 10.0682 8.93179C9.89245 8.75606 9.60753 8.75606 9.43179 8.93179L7.49999 10.8636L5.56819 8.93179C5.39245 8.75606 5.10753 8.75606 4.93179 8.93179C4.75605 9.10753 4.75605 9.39245 4.93179 9.56819L7.18179 11.8182C7.35753 11.9939 7.64245 11.9939 7.81819 11.8182L10.0682 9.56819Z",
    );
  });

  it("keeps accessible state and native button behavior on the icon button", () => {
    const onClick = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <CominsTableIconButton
          aria-expanded="false"
          aria-label="Expand details"
          className="site-button"
          disabled
          icon="disclosureCollapsed"
          onClick={onClick}
        />,
      );
    });

    const button = container.querySelector<HTMLButtonElement>("button");
    expect(button?.type).toBe("button");
    expect(button?.disabled).toBe(true);
    expect(button?.getAttribute("aria-label")).toBe("Expand details");
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(button?.classList.contains("comins-table-icon-button")).toBe(true);
    expect(button?.classList.contains("site-button")).toBe(true);
    expect(button?.querySelector("svg[data-comins-icon='disclosureCollapsed']")).not.toBeNull();

    act(() => button?.click());
    expect(onClick).not.toHaveBeenCalled();
  });
});
