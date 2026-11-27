// @vitest-environment jsdom

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, type ComponentProps } from "react";
import { ChevronRightIcon, CaretSortIcon, DragHandleDots2Icon } from "@radix-ui/react-icons";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CominsTableIcon,
  CominsTableIconButton,
  type CominsTableIconName,
} from "../src/table-icons";

import { CominsTable } from "../src";

const renderIconWrapper = vi.hoisted(() => vi.fn());

vi.mock(import("../src/table-icons"), async (importOriginal) => {
  const icons = await importOriginal();

  return {
    ...icons,
    CominsTableIcon: (props: ComponentProps<typeof icons.CominsTableIcon>) => {
      renderIconWrapper(props.name);
      return <icons.CominsTableIcon {...props} />;
    },
  };
});

vi.mock(import("@radix-ui/react-icons"), async (importOriginal) => {
  const icons = await importOriginal();

  return {
    ...icons,
    DragHandleDots2Icon: vi.fn((props: ComponentProps<typeof icons.DragHandleDots2Icon>) => (
      <icons.DragHandleDots2Icon {...props} />
    )),
  };
});

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

    expect(source).toContain("export const CominsTableIcon =");
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

  it("updates the decorated icon only when its props change", () => {
    const renderIcon = vi.mocked(DragHandleDots2Icon);
    renderIcon.mockClear();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => root?.render(<CominsTableIcon name="columnMove" className="handle" />));
    act(() => root?.render(<CominsTableIcon name="columnMove" className="handle" />));

    expect(renderIcon).toHaveBeenCalledTimes(1);

    act(() => root?.render(<CominsTableIcon name="columnMove" className="new-handle" />));

    expect(renderIcon).toHaveBeenCalledTimes(2);
    expect(container.querySelector("svg")?.classList.contains("new-handle")).toBe(true);
  });

  it("mounts separate header move icons without rendering the icon wrapper", () => {
    const columns = [
      { id: "name", field: "name", label: "Name" },
      { id: "age", field: "age", label: "Age" },
    ];
    const columnGroups = [{ id: "person", label: "Person", children: ["name", "age"] }];
    const data = [{ id: "a", name: "Alice", age: 42 }];
    const render = (showFirst: boolean) => (
      <>
        {showFirst ? <CominsTable key="first" columns={columns} columnGroups={columnGroups} data={data} /> : null}
        <CominsTable key="second" columns={columns} columnGroups={columnGroups} data={data} />
      </>
    );
    renderIconWrapper.mockClear();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => root?.render(render(true)));

    const selector = '[data-comins-column-move-handle="true"] svg[data-comins-icon="columnMove"]';
    const tableRoots = container.querySelectorAll("[data-comins-table-instance-id]");
    const firstIcons = Array.from(tableRoots[0]!.querySelectorAll(selector));
    const secondIcons = Array.from(tableRoots[1]!.querySelectorAll(selector));
    expect(firstIcons).toHaveLength(3);
    expect(secondIcons).toHaveLength(3);
    expect(new Set([...firstIcons, ...secondIcons]).size).toBe(6);
    expect(renderIconWrapper).not.toHaveBeenCalled();

    act(() => root?.render(render(false)));

    expect(firstIcons.every(icon => !icon.isConnected)).toBe(true);
    const remainingIcons = Array.from(container.querySelectorAll(selector));
    expect(remainingIcons).toHaveLength(secondIcons.length);
    remainingIcons.forEach((icon, index) => expect(icon).toBe(secondIcons[index]));
  });

  it("does not rerender the SVG when only the button label changes", () => {
    const renderIcon = vi.mocked(DragHandleDots2Icon);
    renderIcon.mockClear();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => root?.render(<CominsTableIconButton aria-label="First" icon="columnMove" />));
    act(() => root?.render(<CominsTableIconButton aria-label="Second" icon="columnMove" />));

    expect(container.querySelector("button")?.getAttribute("aria-label")).toBe("Second");
    expect(renderIcon).toHaveBeenCalledTimes(1);
  });

  it("uses the disclosure Chevron family for sorted states", () => {
    expect(renderToStaticMarkup(<CominsTableIcon name="sortAscending" />)).toContain(renderToStaticMarkup(<ChevronRightIcon />).match(/d="([^"]+)"/)![0]);
    expect(renderToStaticMarkup(<CominsTableIcon name="sortDescending" />)).toContain(renderToStaticMarkup(<ChevronRightIcon />).match(/d="([^"]+)"/)![0]);
    expect(renderToStaticMarkup(<CominsTableIcon name="sortUnsorted" />)).toContain(renderToStaticMarkup(<CaretSortIcon />).match(/d="([^"]+)"/)![0]);
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
