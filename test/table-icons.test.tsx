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
