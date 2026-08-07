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

  it("uses directional arrows for sorted states and retains CaretSortIcon while unsorted", () => {
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
      "M7.14645 2.14645C7.34171 1.95118 7.65829 1.95118 7.85355 2.14645L11.8536 6.14645C12.0488 6.34171 12.0488 6.65829 11.8536 6.85355C11.6583 7.04882 11.3417 7.04882 11.1464 6.85355L8 3.70711L8 12.5C8 12.7761 7.77614 13 7.5 13C7.22386 13 7 12.7761 7 12.5L7 3.70711L3.85355 6.85355C3.65829 7.04882 3.34171 7.04882 3.14645 6.85355C2.95118 6.65829 2.95118 6.34171 3.14645 6.14645L7.14645 2.14645Z",
    );
    expect(
      container.querySelector("svg[data-comins-icon='sortDescending'] path")?.getAttribute("d"),
    ).toBe(
      "M7.5 2C7.77614 2 8 2.22386 8 2.5L8 11.2929L11.1464 8.14645C11.3417 7.95118 11.6583 7.95118 11.8536 8.14645C12.0488 8.34171 12.0488 8.65829 11.8536 8.85355L7.85355 12.8536C7.75979 12.9473 7.63261 13 7.5 13C7.36739 13 7.24021 12.9473 7.14645 12.8536L3.14645 8.85355C2.95118 8.65829 2.95118 8.34171 3.14645 8.14645C3.34171 7.95118 3.65829 7.95118 3.85355 8.14645L7 11.2929L7 2.5C7 2.22386 7.22386 2 7.5 2Z",
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
