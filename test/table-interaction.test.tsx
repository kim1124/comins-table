// @vitest-environment jsdom

import type React from "react";
import { act, createRef, startTransition, StrictMode, Suspense, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CominsTable,
  createCominsTableTransferCoordinator,
  type CominsColumnFilterModel,
  type CominsRowGroupingConfig,
  type CominsTableProps,
  type CominsTableRef,
  type CominsTableTransferResult,
} from "../src";
import { CominsHeightIndex } from "../src/virtual-layout";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type PersonRow = {
  age: number;
  id: string;
  name: string;
  profile?: {
    age: number;
  };
};

const columns = [
  { field: "name", label: "Name" },
  { field: "age", label: "Age", sort: true },
] as const;

const rows: PersonRow[] = [
  { age: 31, id: "a", name: "Alpha" },
  { age: 42, id: "b", name: "Beta" },
];

function getPersonRowId(row: PersonRow) {
  return row.id;
}

type PersonGroup = {
  id: number;
  label: string;
};

const personGroups: PersonGroup[] = [
  { id: 31, label: "Age 31" },
  { id: 99, label: "Empty" },
  { id: 42, label: "Age 42" },
];

function getPersonGroupId(group: PersonGroup) {
  return group.id;
}

function getPersonGroupLabel(group: PersonGroup) {
  return group.label;
}

function getPersonRowGroupId(row: PersonRow) {
  return row.age;
}

function createPersonGrouping(
  overrides: Partial<CominsRowGroupingConfig<PersonRow, PersonGroup>> = {},
): CominsRowGroupingConfig<PersonRow, PersonGroup> {
  return {
    getGroupId: getPersonGroupId,
    getGroupLabel: getPersonGroupLabel,
    getRowGroupId: getPersonRowGroupId,
    groups: personGroups,
    ...overrides,
  };
}

const apiColumns = [
  { field: "name", label: "Name" },
  { field: "profile.age", label: "Profile Age" },
] as const;

const apiRows: PersonRow[] = [
  { age: 31, id: "a", name: "Alpha", profile: { age: 31 } },
  { age: 42, id: "b", name: "Beta", profile: { age: 42 } },
];

const threeRows: PersonRow[] = [
  ...rows,
  { age: 27, id: "c", name: "Gamma" },
];
const manyRows: PersonRow[] = Array.from({ length: 200 }, (_value, index) => ({
  age: index,
  id: `row-${index}`,
  name: `Row ${index}`,
}));

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }

  container?.remove();
  root = undefined;
  container = undefined;
});

describe("column pinning interaction contract", () => {
  it("renders responsive sticky Header, Body, and split Summary surfaces", () => {
    const restoreResizeObserver = installTestResizeObserver(240, 400);

    try {
      const element = renderTableElement(
        <CominsTable
          columns={[
            { field: "name", label: "Name", pinned: "left", width: 120 },
            { field: "age", label: "Age", width: 120 },
            { field: "id", label: "ID", pinned: "right", width: 120 },
          ]}
          data={rows}
          getRowId={(row) => row.id}
          rowProps={{ draggable: true }}
          summary={{
            columns: {
              name: { aggregate: "count", colSpan: 3 },
            },
          }}
        />,
      );
      const leftHeader = element.querySelector<HTMLElement>("[data-testid='header-name']")!;
      const centerHeader = element.querySelector<HTMLElement>("[data-testid='header-age']")!;
      const rightHeader = element.querySelector<HTMLElement>("[data-testid='header-id']")!;
      const leftCell = element.querySelector<HTMLElement>("[data-testid='cell-a-name']")!;
      const rightCell = element.querySelector<HTMLElement>("[data-testid='cell-a-id']")!;
      const summaryCells = element.querySelectorAll<HTMLElement>(".comins-table__summary-cell");

      expect(leftHeader.dataset.cominsPinned).toBe("left");
      expect(leftHeader.style.position).toBe("sticky");
      expect(leftHeader.style.left).toBe("0px");
      expect(centerHeader.dataset.cominsPinned).toBeUndefined();
      expect(rightHeader.dataset.cominsPinned).toBe("right");
      expect(rightHeader.style.right).toBe("0px");
      expect(leftCell.dataset.cominsPinned).toBe("left");
      expect(rightCell.dataset.cominsPinned).toBe("right");
      expect(leftHeader.querySelector("[data-testid='column-move-handle-name']")).toBeNull();
      expect(element.querySelector("[data-testid='row-drag-handle-a']")).not.toBeNull();
      expect(summaryCells).toHaveLength(3);
      expect(summaryCells[0]?.dataset.cominsPinned).toBe("left");
      expect(summaryCells[1]?.dataset.cominsPinned).toBeUndefined();
      expect(summaryCells[2]?.dataset.cominsPinned).toBe("right");
      expect(summaryCells[0]?.getAttribute("data-testid")).toBe("summary-cell-name");
      expect(summaryCells[1]?.hasAttribute("data-testid")).toBe(false);
    } finally {
      restoreResizeObserver();
    }
  });

  it("pins a Header Group atomically, ignores child pin intent, and demotes the wider side", () => {
    const restoreResizeObserver = installTestResizeObserver(240, 250);

    try {
      const element = renderTableElement(
        <CominsTable
          columnGroups={[
            { children: ["name", "age"], id: "profile", label: "Profile", pinned: "left" },
          ]}
          columns={[
            { field: "name", label: "Name", pinned: "right", width: 100 },
            { field: "age", label: "Age", width: 100 },
            { field: "id", label: "ID", pinned: "right", width: 200 },
          ]}
          data={rows}
          getRowId={(row) => row.id}
        />,
      );
      const groupHeader = element.querySelector<HTMLElement>("[data-testid='header-group-profile']")!;
      const nameHeader = element.querySelector<HTMLElement>("[data-testid='header-name']")!;
      const ageHeader = element.querySelector<HTMLElement>("[data-testid='header-age']")!;
      const rightHeader = element.querySelector<HTMLElement>("[data-testid='header-id']")!;

      expect(groupHeader.dataset.cominsPinned).toBe("left");
      expect(groupHeader.querySelector("[data-testid='column-group-move-handle-profile']")).toBeNull();
      expect(nameHeader.dataset.cominsPinned).toBe("left");
      expect(ageHeader.dataset.cominsPinned).toBe("left");
      expect(rightHeader.dataset.cominsPinned).toBeUndefined();
    } finally {
      restoreResizeObserver();
    }
  });
});

describe("row grouping interaction contract", () => {
  it("renders synthetic group rows without routing them through ordinary Row callbacks", () => {
    const onClickRow = vi.fn();
    const view = renderTable({
      onClickRow,
      rowGrouping: createPersonGrouping({
        expandedGroupIds: [],
        onChangeExpandedGroupIds: () => undefined,
      }),
    } as unknown as Partial<CominsTableProps<PersonRow>>);
    const groupRows = view.querySelectorAll("[data-comins-group-row]");

    expect(groupRows).toHaveLength(3);
    act(() => {
      groupRows[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onClickRow).not.toHaveBeenCalled();
  });

  it("keeps disclosure controlled and preserves leaf callback indexes and Detail ownership", () => {
    const onChangeExpandedGroupIds = vi.fn();
    const onClickRow = vi.fn();
    const renderGrouped = (expandedGroupIds: readonly (string | number)[]) => (
      <CominsTable
        columns={columns}
        data={rows}
        expandedRowIds={["a"]}
        getRowId={(row) => row.id}
        onClickRow={onClickRow}
        renderRowDetail={({ row }) => <span>{row.data.name} detail</span>}
        rowGrouping={createPersonGrouping({
          aggregations: { age: "sum" },
          expandedGroupIds,
          onChangeExpandedGroupIds,
        })}
      />
    );
    const view = renderTableElement(renderGrouped([]));
    const firstToggle = view.querySelector<HTMLButtonElement>("[data-testid^='group-toggle-']")!;

    act(() => firstToggle.click());
    const firstGroupId = onChangeExpandedGroupIds.mock.calls[0]?.[0]?.[0] as number;

    expect(firstGroupId).toBe(31);
    expect(view.querySelector("[data-testid='row-a']")).toBeNull();

    act(() => {
      root?.render(renderGrouped([firstGroupId]));
    });

    const leaf = view.querySelector<HTMLElement>("[data-testid='row-a']")!;
    const group = [...view.querySelectorAll<HTMLElement>("[data-comins-group-id]")]
      .find((candidate) => candidate.dataset.cominsGroupId === String(firstGroupId))!;

    expect(group.querySelectorAll(":scope > th, :scope > td")).toHaveLength(1);
    expect(group.textContent).toContain("Age: 31");
    expect(view.querySelector("[data-testid='row-detail-content-a']")?.textContent).toContain("Alpha detail");

    act(() => leaf.click());
    expect(onClickRow).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 0,
        row: expect.objectContaining({ dataIndex: 0, id: "a", index: 0 }),
      }),
    );
  });

  it("keeps read-only disclosure disabled when the controlled callback is absent", () => {
    const view = renderTable({
      rowGrouping: createPersonGrouping({ expandedGroupIds: [] }),
    } as unknown as Partial<CominsTableProps<PersonRow>>);

    expect(view.querySelector<HTMLButtonElement>("[data-testid^='group-toggle-']")?.disabled).toBe(true);
  });

  it("does not invoke leaf Cell formatters, renderers, or tooltips for synthetic group rows", () => {
    const format = vi.fn(({ value }: { value: unknown }) => String(value));
    const renderer = vi.fn(() => <span>leaf renderer</span>);
    const tooltip = vi.fn(() => "leaf tooltip");

    renderTableElement(
      <CominsTable
        columns={[
          { field: "name", label: "Name" },
          { cell: { format, renderer, tooltip }, field: "age", label: "Age" },
        ]}
        data={rows}
        getRowId={(row) => row.id}
        rowGrouping={createPersonGrouping({ aggregations: { age: "sum" }, expandedGroupIds: [] })}
      />,
    );

    expect(format).not.toHaveBeenCalled();
    expect(renderer).not.toHaveBeenCalled();
    expect(tooltip).not.toHaveBeenCalled();
  });

  it("does not rebuild membership when only controlled expansion changes", () => {
    const getRowGroupId = vi.fn(getPersonRowGroupId);

    function StableMembershipFixture() {
      const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);

      return (
        <CominsTable
          columns={columns}
          data={rows}
          getRowId={getPersonRowId}
          rowGrouping={createPersonGrouping({
            expandedGroupIds,
            getRowGroupId,
            onChangeExpandedGroupIds: setExpandedGroupIds,
          })}
        />
      );
    }

    const view = renderTableElement(<StableMembershipFixture />);
    expect(getRowGroupId).toHaveBeenCalledTimes(2);

    act(() => view.querySelector<HTMLButtonElement>("[data-testid^='group-toggle-']")?.click());
    expect(getRowGroupId).toHaveBeenCalledTimes(2);
  });

  it("clears a hidden Cell once, preserves Row selection, and moves focus to the collapsed ancestor", () => {
    const onChangeExpandedGroupIds = vi.fn();
    const onChangeSelection = vi.fn();
    const renderGrouped = (expandedGroupIds: readonly (string | number)[]) => (
      <CominsTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        onChangeSelection={onChangeSelection}
        rowGrouping={createPersonGrouping({
          expandedGroupIds,
          onChangeExpandedGroupIds,
        })}
      />
    );
    const view = renderTableElement(renderGrouped([]));
    const firstToggle = view.querySelector<HTMLButtonElement>("[data-testid^='group-toggle-']")!;

    act(() => firstToggle.click());
    const firstGroupId = onChangeExpandedGroupIds.mock.calls[0]?.[0]?.[0] as number;

    act(() => {
      root?.render(renderGrouped([firstGroupId]));
    });

    const cell = view.querySelector<HTMLElement>("[data-testid='cell-a-age']")!;
    act(() => {
      cell.focus();
      cell.click();
    });
    onChangeSelection.mockClear();

    act(() => {
      root?.render(renderGrouped([]));
    });

    const collapsedGroup = [...view.querySelectorAll<HTMLElement>("[data-comins-group-id]")]
      .find((candidate) => candidate.dataset.cominsGroupId === String(firstGroupId))!;
    const collapsedToggle = collapsedGroup.querySelector<HTMLButtonElement>("[data-testid^='group-toggle-']")!;
    const latestSelection = onChangeSelection.mock.calls.at(-1)?.[0];

    expect(document.activeElement).toBe(collapsedToggle);
    expect(latestSelection).toMatchObject({ cell: null, range: null, rowIds: ["a"] });
    expect(onChangeSelection).toHaveBeenCalledTimes(1);
  });

  it("keeps pagination and loading inert while allowing the existing Row drag contract", () => {
    const onChangeData = vi.fn();
    const onLazyLoad = vi.fn();
    const onLoadMore = vi.fn();
    const ref = createRef<CominsTableRef<PersonRow>>();

    function RuntimeGuardFixture() {
      const [expandedGroupIds, setExpandedGroupIds] = useState<(string | number)[]>([]);
      const runtimeProps = {
        columns,
        data: rows,
        getRowId: (row: PersonRow) => row.id,
        hasMoreRows: true,
        infiniteScroll: true,
        lazyLoad: true,
        loadingMore: true,
        onChangeData,
        onLazyLoad,
        onLoadMore,
        pagination: { pageIndex: 0, pageSize: 1 },
        ref,
        rowGrouping: createPersonGrouping({
          expandedGroupIds,
          onChangeExpandedGroupIds: setExpandedGroupIds,
        }),
        rowProps: { draggable: true },
      } as unknown as CominsTableProps<PersonRow> & React.RefAttributes<CominsTableRef<PersonRow>>;

      return <CominsTable {...runtimeProps} />;
    }

    const view = renderTableElement(<RuntimeGuardFixture />);
    const expandCollapsedGroups = () => {
      const toggle = [...view.querySelectorAll<HTMLButtonElement>("[data-testid^='group-toggle-']")]
        .find((candidate) => candidate.getAttribute("aria-expanded") === "false");

      if (toggle) {
        act(() => toggle.click());
      }
    };

    expandCollapsedGroups();
    expandCollapsedGroups();
    expandCollapsedGroups();

    expect(view.querySelectorAll("tr[data-comins-row-data-index]")).toHaveLength(2);
    expect(view.querySelectorAll("[data-row-draggable='true']")).toHaveLength(2);
    expect(onLazyLoad).not.toHaveBeenCalled();
    expect(onLoadMore).not.toHaveBeenCalled();

    act(() => ref.current?.setMoveTargetRow(1, 0));
    expect(onChangeData).not.toHaveBeenCalled();
  });

  it("renders one colspan Group Cell and delegates only its content to the custom renderer", () => {
    const onChangeExpandedGroupIds = vi.fn();
    const getGroupRowProps = vi.fn(({ group, isEmpty }) => ({
      className: isEmpty ? "empty-group-row" : undefined,
      style: { backgroundColor: group.id === 31 ? "rgb(209, 213, 219)" : undefined },
    }));
    const renderGroupContent = vi.fn(({ group, groupIndex, isEmpty, rowCount }) => (
      <button data-testid={`custom-group-${group.id}`}>
        {`${groupIndex}:${group.label}:${isEmpty}:${rowCount}`}
      </button>
    ));
    const view = renderTableElement(
      <CominsTable
        columns={columns}
        data={rows}
        getRowId={getPersonRowId}
        rowGrouping={createPersonGrouping({
          expandedGroupIds: [],
          getGroupRowProps,
          onChangeExpandedGroupIds,
          renderGroupContent,
        })}
      />,
    );
    const groupRows = view.querySelectorAll<HTMLElement>("[data-comins-group-row]");

    expect(groupRows).toHaveLength(3);
    groupRows.forEach((groupRow) => {
      expect(groupRow.querySelectorAll(":scope > th, :scope > td")).toHaveLength(1);
      expect(groupRow.querySelector("th")?.getAttribute("colspan")).toBe("2");
      expect(groupRow.querySelector("th")?.getAttribute("scope")).toBe("rowgroup");
    });
    expect(view.querySelector("[data-testid='custom-group-99']")?.textContent).toBe("1:Empty:true:0");
    expect(view.querySelector<HTMLElement>("[data-testid='group-row-31']")?.style.backgroundColor).toBe(
      "rgb(209, 213, 219)",
    );
    expect(view.querySelector("[data-testid='group-row-99']")?.classList).toContain("empty-group-row");

    act(() => {
      view.querySelector<HTMLButtonElement>("[data-testid='custom-group-31']")?.click();
    });
    expect(onChangeExpandedGroupIds).not.toHaveBeenCalled();
    expect(getGroupRowProps).toHaveBeenCalledTimes(3);
    expect(renderGroupContent).toHaveBeenCalledTimes(3);
  });

  it("expands and folds all explicit Groups through dedicated Ref methods", () => {
    const ref = createRef<CominsTableRef<PersonRow>>();

    function GroupRefFixture() {
      const [expandedGroupIds, setExpandedGroupIds] = useState<(string | number)[]>([]);

      return (
        <CominsTable
          columns={columns}
          data={rows}
          getRowId={getPersonRowId}
          ref={ref}
          rowGrouping={createPersonGrouping({
            expandedGroupIds,
            onChangeExpandedGroupIds: setExpandedGroupIds,
          })}
        />
      );
    }

    const view = renderTableElement(<GroupRefFixture />);

    act(() => ref.current?.expandGroups());
    expect(view.querySelectorAll("tr[data-comins-row-data-index]")).toHaveLength(2);

    act(() => ref.current?.foldGroups([31]));
    expect(view.querySelector("[data-testid='row-a']")).toBeNull();
    expect(view.querySelector("[data-testid='row-b']")).not.toBeNull();

    act(() => ref.current?.foldGroups());
    expect(view.querySelectorAll("tr[data-comins-row-data-index]")).toHaveLength(0);
  });

  it("keeps Group model order while Header sorting each Group's Rows", () => {
    type SortGroup = { id: string; label: string };
    type SortRow = { groupId: string; id: string; name: string };
    const sortGroups: SortGroup[] = [
      { id: "b", label: "Group B" },
      { id: "a", label: "Group A" },
    ];
    const sortRows: SortRow[] = [
      { groupId: "b", id: "b-zeta", name: "Zeta" },
      { groupId: "a", id: "a-beta", name: "Beta" },
      { groupId: "b", id: "b-alpha", name: "Alpha" },
    ];
    const view = renderTableElement(
      <CominsTable
        columns={[{ field: "name", label: "Name", sort: true }]}
        data={sortRows}
        getRowId={(row) => row.id}
        rowGrouping={{
          expandedGroupIds: ["b", "a"],
          getGroupId: (group: SortGroup) => group.id,
          getGroupLabel: (group) => group.label,
          getRowGroupId: (row: SortRow) => row.groupId,
          groups: sortGroups,
        }}
      />,
    );
    const getOrder = () => [...view.querySelectorAll("tbody > tr")].map(
      (row) => row.getAttribute("data-testid"),
    );

    act(() => {
      view.querySelector("[data-testid='header-name']")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(getOrder()).toEqual([
      "group-row-b",
      "row-b-alpha",
      "row-b-zeta",
      "group-row-a",
      "row-a-beta",
    ]);

    act(() => {
      view.querySelector("[data-testid='header-name']")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(getOrder()).toEqual([
      "group-row-b",
      "row-b-zeta",
      "row-b-alpha",
      "group-row-a",
      "row-a-beta",
    ]);
  });

  it("moves explicit Groups by stable ID and reports model indexes", () => {
    const onChangeGroups = vi.fn();
    const view = renderTableElement(
      <CominsTable
        columns={columns}
        data={rows}
        getRowId={getPersonRowId}
        rowGrouping={createPersonGrouping({
          groupDraggable: true,
          onChangeGroups,
        })}
      />,
    );
    const source = view.querySelector<HTMLElement>("[data-testid='group-drag-handle-31']")!;
    const target = view.querySelector<HTMLElement>("[data-testid='group-row-42']")!;
    const originalElementFromPoint = document.elementFromPoint;

    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      bottom: 40,
      height: 40,
      left: 0,
      right: 200,
      top: 0,
      width: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => target),
    });

    try {
      act(() => {
        source.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
        window.dispatchEvent(
          createMousePointerEvent("pointermove", { bubbles: true, buttons: 1, clientX: 10, clientY: 30 }),
        );
        window.dispatchEvent(
          createMousePointerEvent("pointerup", { bubbles: true, button: 0, clientX: 10, clientY: 30 }),
        );
      });
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }

    expect(onChangeGroups).toHaveBeenCalledWith(
      [personGroups[1], personGroups[2], personGroups[0]],
      {
        fromIndex: 0,
        groupId: 31,
        reason: "move",
        targetGroupId: 42,
        toIndex: 2,
      },
    );
  });

  it("does not interpret another Table's Row or Group indexes as local drag targets", () => {
    const onChangeData = vi.fn();
    const onChangeGroups = vi.fn();
    const view = renderTableElement(
      <div>
        <CominsTable
          columns={columns}
          data={rows}
          data-testid="ownership-source"
          getRowId={getPersonRowId}
          onChangeData={onChangeData}
          rowGrouping={createPersonGrouping({
            expandedGroupIds: [31, 42],
            groupDraggable: true,
            onChangeGroups,
          })}
          rowProps={{ draggable: true }}
        />
        <CominsTable
          columns={columns}
          data={rows}
          data-testid="ownership-target"
          getRowId={getPersonRowId}
          rowGrouping={createPersonGrouping({ expandedGroupIds: [31, 42] })}
          rowProps={{ draggable: true }}
        />
      </div>,
    );
    const sourceViewport = view.querySelector<HTMLElement>("[data-testid='ownership-source']")!;
    const targetViewport = view.querySelector<HTMLElement>("[data-testid='ownership-target']")!;
    const sourceRowHandle = sourceViewport.querySelector<HTMLElement>("[data-testid='row-drag-handle-a']")!;
    const targetRow = targetViewport.querySelector<HTMLElement>("[data-testid='row-b']")!;
    const sourceGroupHandle = sourceViewport.querySelector<HTMLElement>("[data-testid='group-drag-handle-31']")!;
    const targetGroup = targetViewport.querySelector<HTMLElement>("[data-testid='group-row-42']")!;
    const originalElementFromPoint = document.elementFromPoint;

    try {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: vi.fn(() => targetRow),
      });
      act(() => {
        sourceRowHandle.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
        window.dispatchEvent(
          createMousePointerEvent("pointerup", { bubbles: true, button: 0, clientX: 10, clientY: 20 }),
        );
      });

      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: vi.fn(() => targetGroup),
      });
      act(() => {
        sourceGroupHandle.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
        window.dispatchEvent(
          createMousePointerEvent("pointerup", { bubbles: true, button: 0, clientX: 10, clientY: 20 }),
        );
      });
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }

    expect(onChangeData).not.toHaveBeenCalled();
    expect(onChangeGroups).not.toHaveBeenCalled();
    expect(sourceViewport.closest("[data-comins-table-instance-id]")).not.toBeNull();
    expect(targetViewport.closest("[data-comins-table-instance-id]")).not.toBeNull();
  });

  it("commits a local Row drop when the pointerup lands on its rendered placeholder", () => {
    const onChangeData = vi.fn();
    const onBeforeRowDrag = vi.fn(() => undefined);
    const onRowDrag = vi.fn();
    const onAfterDragRow = vi.fn();
    const view = renderTableElement(
      <CominsTable
        columns={columns}
        data={threeRows}
        getRowId={getPersonRowId}
        onAfterDragRow={onAfterDragRow}
        onBeforeRowDrag={onBeforeRowDrag}
        onChangeData={onChangeData}
        onRowDrag={onRowDrag}
        rowProps={{ draggable: true }}
      />,
    );
    const source = view.querySelector<HTMLElement>("[data-testid='row-drag-handle-c']")!;
    const target = view.querySelector<HTMLElement>("[data-testid='row-a']")!;
    const originalElementFromPoint = document.elementFromPoint;
    let pointElement: Element | null = source;

    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => pointElement),
    });

    try {
      act(() => {
        source.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
      });
      pointElement = target;
      act(() => {
        window.dispatchEvent(
          createMousePointerEvent("pointermove", { bubbles: true, buttons: 1, clientX: 10, clientY: 20 }),
        );
      });
      pointElement = view.querySelector("[data-testid='row-move-placeholder']");
      expect(pointElement).not.toBeNull();
      act(() => {
        window.dispatchEvent(
          createMousePointerEvent("pointerup", { bubbles: true, button: 0, clientX: 10, clientY: 20 }),
        );
      });
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }

    expect(onChangeData).toHaveBeenCalledWith([threeRows[2], threeRows[0], threeRows[1]]);
    expect(onBeforeRowDrag).toHaveBeenCalledOnce();
    expect(onBeforeRowDrag).toHaveBeenCalledWith(expect.objectContaining({
      row: expect.objectContaining({ id: "c" }),
    }));
    expect(onRowDrag).toHaveBeenCalledWith(expect.objectContaining({
      row: expect.objectContaining({ id: "c" }),
      target: expect.objectContaining({ dataIndex: 0, rowId: "a", valid: true }),
    }));
    expect(onAfterDragRow).toHaveBeenCalledOnce();
    expect(onAfterDragRow).toHaveBeenCalledWith(expect.objectContaining({
      reason: "drop",
      result: "moved",
      row: expect.objectContaining({ id: "c" }),
    }));
  });

  it("lets onBeforeRowDrag cancel a Row gesture before listeners and mutations start", () => {
    const onAfterDragRow = vi.fn();
    const onChangeData = vi.fn();
    const onRowDrag = vi.fn();
    const view = renderTableElement(
      <CominsTable
        columns={columns}
        data={threeRows}
        getRowId={getPersonRowId}
        onAfterDragRow={onAfterDragRow}
        onBeforeRowDrag={() => false}
        onChangeData={onChangeData}
        onRowDrag={onRowDrag}
        rowProps={{ draggable: true }}
      />,
    );
    const source = view.querySelector<HTMLElement>("[data-testid='row-drag-handle-c']")!;
    const target = view.querySelector<HTMLElement>("[data-testid='row-a']")!;
    const originalElementFromPoint = document.elementFromPoint;

    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => target),
    });

    try {
      act(() => {
        source.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
        window.dispatchEvent(
          createMousePointerEvent("pointerup", { bubbles: true, button: 0, clientX: 10, clientY: 20 }),
        );
      });
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }

    expect(onChangeData).not.toHaveBeenCalled();
    expect(onRowDrag).not.toHaveBeenCalled();
    expect(onAfterDragRow).not.toHaveBeenCalled();
  });

  it("finishes a started Row gesture exactly once when the pointer is cancelled", () => {
    const onAfterDragRow = vi.fn();
    const onChangeData = vi.fn();
    const view = renderTableElement(
      <CominsTable
        columns={columns}
        data={threeRows}
        getRowId={getPersonRowId}
        onAfterDragRow={onAfterDragRow}
        onChangeData={onChangeData}
        rowProps={{ draggable: true }}
      />,
    );
    const source = view.querySelector<HTMLElement>("[data-testid='row-drag-handle-c']")!;
    const sourceRow = view.querySelector<HTMLElement>("[data-testid='row-c']")!;
    const originalElementFromPoint = document.elementFromPoint;

    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => sourceRow),
    });

    try {
      act(() => {
        source.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
        window.dispatchEvent(createMousePointerEvent("pointercancel", { bubbles: true }));
        window.dispatchEvent(createMousePointerEvent("pointercancel", { bubbles: true }));
      });
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }

    expect(onChangeData).not.toHaveBeenCalled();
    expect(onAfterDragRow).toHaveBeenCalledOnce();
    expect(onAfterDragRow).toHaveBeenCalledWith(expect.objectContaining({
      reason: "pointer-cancel",
      result: "cancelled",
    }));
  });

  it("moves one draggable Row between flat Tables through a shared Coordinator", async () => {
    const onTransfer = vi.fn();

    function CrossTableRowFixture() {
      const [sourceData, setSourceData] = useState([rows[0]!]);
      const [targetData, setTargetData] = useState([rows[1]!]);
      const [coordinator] = useState(() =>
        createCominsTableTransferCoordinator<PersonRow>({
          onTransfer: (result) => {
            onTransfer(result);
            setSourceData(result.source.data);
            setTargetData(result.target.data);
          },
        }),
      );

      return (
        <div>
          <CominsTable
            columns={columns}
            data={sourceData}
            data-testid="transfer-row-source"
            getRowId={getPersonRowId}
            rowProps={{ draggable: true }}
            tableTransfer={{ coordinator, scope: "people", tableId: "source" }}
          />
          <CominsTable
            columns={columns}
            data={targetData}
            data-testid="transfer-row-target"
            getRowId={getPersonRowId}
            rowProps={{ draggable: true }}
            tableTransfer={{ coordinator, scope: "people", tableId: "target" }}
          />
        </div>
      );
    }

    const view = renderTableElement(<CrossTableRowFixture />);
    const sourceViewport = view.querySelector<HTMLElement>("[data-testid='transfer-row-source']")!;
    const targetViewport = view.querySelector<HTMLElement>("[data-testid='transfer-row-target']")!;
    const sourceHandle = sourceViewport.querySelector<HTMLElement>("[data-testid='row-drag-handle-a']")!;
    const targetRow = targetViewport.querySelector<HTMLElement>("[data-testid='row-b']")!;
    const originalElementFromPoint = document.elementFromPoint;

    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => targetRow),
    });

    try {
      act(() => {
        sourceHandle.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
        window.dispatchEvent(
          createMousePointerEvent("pointerup", { bubbles: true, button: 0, clientX: 10, clientY: 20 }),
        );
      });
      await act(async () => new Promise((resolve) => window.requestAnimationFrame(resolve)));
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }

    expect(onTransfer).toHaveBeenCalledTimes(1);
    const result = onTransfer.mock.calls[0]![0] as CominsTableTransferResult<PersonRow>;

    expect(result.source.data).toEqual([]);
    expect(result.target.data).toEqual([rows[0], rows[1]]);
    expect(sourceViewport.querySelector("[data-testid='row-a']")).toBeNull();
    expect(targetViewport.querySelector("[data-testid='row-a']")).not.toBeNull();
    expect(document.activeElement).toBe(targetViewport.querySelector("[data-testid='row-a']"));
  });

  it("reports a duplicate Cross-Table Row and renders non-blocking target feedback", () => {
    const onAfterDragRow = vi.fn();
    const onTransfer = vi.fn();
    const onTransferRejected = vi.fn();
    const coordinator = createCominsTableTransferCoordinator<PersonRow>({
      onTransfer,
      onTransferRejected,
    });
    const view = renderTableElement(
      <div>
        <CominsTable
          columns={columns}
          data={[rows[0]!]}
          data-testid="duplicate-transfer-source"
          getRowId={getPersonRowId}
          onAfterDragRow={onAfterDragRow}
          rowProps={{ draggable: true }}
          tableTransfer={{ coordinator, scope: "people", tableId: "source" }}
        />
        <CominsTable
          columns={columns}
          data={[{ ...rows[0]!, name: "Target Alpha" }]}
          data-testid="duplicate-transfer-target"
          getRowId={getPersonRowId}
          rowProps={{ draggable: true }}
          tableTransfer={{
            coordinator,
            rejectionFeedback: {
              duration: 10000,
              renderTooltip: (rejection) => (
                <>
                  <strong>Duplicate ID</strong>
                  <span>{`custom:${String(rejection.conflict.kind === "row" ? rejection.conflict.rowId : rejection.conflict.groupId)}`}</span>
                </>
              ),
            },
            scope: "people",
            tableId: "target",
          }}
        />
      </div>,
    );
    const source = view.querySelector<HTMLElement>(
      "[data-testid='duplicate-transfer-source'] [data-testid='row-drag-handle-a']",
    )!;
    const target = view.querySelector<HTMLElement>(
      "[data-testid='duplicate-transfer-target'] [data-testid='row-a']",
    )!;
    const targetTable = view.querySelector<HTMLElement>(
      "[data-comins-transfer-table-id='target']",
    )!;
    const originalElementFromPoint = document.elementFromPoint;

    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => target),
    });

    try {
      act(() => {
        source.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
        window.dispatchEvent(
          createMousePointerEvent("pointerup", { bubbles: true, button: 0, clientX: 24, clientY: 36 }),
        );
      });
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }

    expect(onTransfer).not.toHaveBeenCalled();
    expect(onTransferRejected).toHaveBeenCalledWith(expect.objectContaining({
      kind: "row",
      reason: "duplicate-id",
      sourceTableId: "source",
      targetTableId: "target",
    }));
    expect(onAfterDragRow).toHaveBeenCalledOnce();
    expect(onAfterDragRow).toHaveBeenCalledWith(expect.objectContaining({
      reason: "duplicate-id",
      result: "rejected",
      target: expect.objectContaining({ rowId: "a", tableId: "target", valid: true }),
    }));
    expect(view.querySelector("[data-testid='transfer-rejection-tooltip']")?.textContent)
      .toContain("Duplicate IDcustom:a");
    expect(targetTable.dataset.cominsTransferRejected).toBe("true");
  });

  it("lets the target reject a Cross-Table Row before conflict resolution", () => {
    const canTransfer = vi.fn(() => false);
    const onTransfer = vi.fn();
    const resolveConflict = vi.fn(() => "overwrite" as const);
    const coordinator = createCominsTableTransferCoordinator<PersonRow>({ onTransfer });
    const view = renderTableElement(
      <div>
        <CominsTable
          columns={columns}
          data={[rows[0]!]}
          data-testid="guarded-transfer-source"
          getRowId={getPersonRowId}
          rowProps={{ draggable: true }}
          tableTransfer={{ coordinator, scope: "people", tableId: "source" }}
        />
        <CominsTable
          columns={columns}
          data={[rows[0]!]}
          data-testid="guarded-transfer-target"
          getRowId={getPersonRowId}
          rowProps={{ draggable: true }}
          tableTransfer={{
            canTransfer,
            coordinator,
            resolveConflict,
            scope: "people",
            tableId: "target",
          }}
        />
      </div>,
    );
    const source = view.querySelector<HTMLElement>(
      "[data-testid='guarded-transfer-source'] [data-testid='row-drag-handle-a']",
    )!;
    const target = view.querySelector<HTMLElement>(
      "[data-testid='guarded-transfer-target'] [data-testid='row-a']",
    )!;
    const originalElementFromPoint = document.elementFromPoint;

    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => target),
    });

    try {
      act(() => {
        source.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
        window.dispatchEvent(
          createMousePointerEvent("pointerup", { bubbles: true, button: 0, clientX: 10, clientY: 20 }),
        );
      });
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }

    expect(canTransfer).toHaveBeenCalledWith(expect.objectContaining({
      kind: "row",
      sourceTableId: "source",
      targetTableId: "target",
    }));
    expect(resolveConflict).not.toHaveBeenCalled();
    expect(onTransfer).not.toHaveBeenCalled();
  });

  it("moves a Group bundle and preserves a different empty source Group", () => {
    const onTransfer = vi.fn();

    function CrossTableGroupFixture() {
      const [sourceData, setSourceData] = useState([rows[0]!]);
      const [sourceGroups, setSourceGroups] = useState([personGroups[0]!, personGroups[1]!]);
      const [targetData, setTargetData] = useState([rows[1]!]);
      const [targetGroups, setTargetGroups] = useState([personGroups[2]!]);
      const [coordinator] = useState(() =>
        createCominsTableTransferCoordinator<PersonRow, PersonGroup>({
          onTransfer: (result) => {
            onTransfer(result);
            setSourceData(result.source.data);
            setSourceGroups(result.source.groups ?? []);
            setTargetData(result.target.data);
            setTargetGroups(result.target.groups ?? []);
          },
        }),
      );

      return (
        <div>
          <CominsTable
            columns={columns}
            data={sourceData}
            data-testid="transfer-group-source"
            getRowId={getPersonRowId}
            rowGrouping={createPersonGrouping({ groupDraggable: true, groups: sourceGroups })}
            tableTransfer={{ coordinator, scope: "people", tableId: "source" }}
          />
          <CominsTable
            columns={columns}
            data={targetData}
            data-testid="transfer-group-target"
            getRowId={getPersonRowId}
            rowGrouping={createPersonGrouping({ groups: targetGroups })}
            tableTransfer={{ coordinator, scope: "people", tableId: "target" }}
          />
        </div>
      );
    }

    const view = renderTableElement(<CrossTableGroupFixture />);
    const sourceViewport = view.querySelector<HTMLElement>("[data-testid='transfer-group-source']")!;
    const targetViewport = view.querySelector<HTMLElement>("[data-testid='transfer-group-target']")!;
    const sourceHandle = sourceViewport.querySelector<HTMLElement>("[data-testid='group-drag-handle-31']")!;
    const targetGroup = targetViewport.querySelector<HTMLElement>("[data-testid='group-row-42']")!;
    const originalElementFromPoint = document.elementFromPoint;

    vi.spyOn(targetGroup, "getBoundingClientRect").mockReturnValue({
      bottom: 40,
      height: 40,
      left: 0,
      right: 200,
      top: 0,
      width: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => targetGroup),
    });

    try {
      act(() => {
        sourceHandle.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
        window.dispatchEvent(
          createMousePointerEvent("pointerup", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
      });
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }

    expect(onTransfer).toHaveBeenCalledTimes(1);
    const result = onTransfer.mock.calls[0]![0] as CominsTableTransferResult<PersonRow, PersonGroup>;

    expect(result.source.groups).toEqual([personGroups[1]]);
    expect(result.source.data).toEqual([]);
    expect(result.target.groups).toEqual([personGroups[0], personGroups[2]]);
    expect(result.target.data).toEqual([rows[1], rows[0]]);
    expect(sourceViewport.querySelector("[data-testid='group-row-99']")).not.toBeNull();
    expect(sourceViewport.querySelector("[data-testid='group-row-31']")).toBeNull();
    expect(targetViewport.querySelector("[data-testid='group-row-31']")).not.toBeNull();
  });

  it("moves an existing draggable Row into a collapsed Group and restores disclosure focus", () => {
    const onChangeData = vi.fn();

    function CrossGroupRowDragFixture() {
      const [data, setData] = useState(rows);

      return (
        <CominsTable
          columns={columns}
          data={data}
          getRowId={getPersonRowId}
          onChangeData={(nextData) => {
            onChangeData(nextData);
            setData(nextData);
          }}
          rowGrouping={createPersonGrouping({
            expandedGroupIds: [31],
            onChangeExpandedGroupIds: () => undefined,
            setRowGroupId: ({ row, toGroupId }) => ({ ...row, age: Number(toGroupId) }),
          })}
          rowProps={{ draggable: true }}
        />
      );
    }

    const view = renderTableElement(<CrossGroupRowDragFixture />);
    const source = view.querySelector<HTMLElement>("[data-testid='row-drag-handle-a']")!;
    const sourceRow = source.closest<HTMLElement>("tr")!;
    const target = view.querySelector<HTMLElement>("[data-testid='group-row-99']")!;
    const targetDisclosure = target.querySelector<HTMLButtonElement>("[data-testid='group-toggle-99']")!;
    const originalElementFromPoint = document.elementFromPoint;

    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => target),
    });

    try {
      act(() => {
        sourceRow.focus();
        source.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
        window.dispatchEvent(
          createMousePointerEvent("pointerup", { bubbles: true, button: 0, clientX: 10, clientY: 20 }),
        );
      });
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }

    expect(onChangeData).toHaveBeenCalledTimes(1);
    expect(onChangeData).toHaveBeenCalledWith([
      rows[1],
      { ...rows[0], age: 99 },
    ]);
    expect(view.querySelectorAll("tr[data-comins-row-data-index]")).toHaveLength(0);
    expect(document.activeElement).toBe(targetDisclosure);
  });

  it("fails closed for malformed untyped grouping control values", () => {
    const ordinary = renderTable({ rowGrouping: null } as unknown as Partial<CominsTableProps<PersonRow>>);

    expect(ordinary.querySelectorAll("tr[data-comins-row-data-index]")).toHaveLength(2);

    act(() => root?.unmount());
    root = undefined;
    ordinary.remove();
    container = undefined;

    const grouped = renderTable({
      rowGrouping: {
        getGroupId: getPersonGroupId,
        getRowGroupId: getPersonRowGroupId,
        groups: personGroups,
        expandedGroupIds: "invalid",
        onChangeExpandedGroupIds: true,
      },
    } as unknown as Partial<CominsTableProps<PersonRow>>);

    expect(grouped.querySelectorAll("[data-comins-group-row]")).toHaveLength(3);
    expect(grouped.querySelector<HTMLButtonElement>("[data-testid^='group-toggle-']")?.disabled).toBe(true);
  });
});

function renderTable(props: Partial<CominsTableProps<PersonRow>> = {}) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(<CominsTable columns={columns} data={rows} getRowId={(row) => row.id} {...props} />);
  });

  return container;
}

function renderTableElement(element: React.ReactElement) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(element);
  });

  return container;
}

function installTestResizeObserver(height: number, width = 800) {
  const original = globalThis.ResizeObserver;

  class TestResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {}

    disconnect() {}

    observe(target: Element) {
      this.callback(
        [
          {
            contentRect: { height, width },
            target,
          } as ResizeObserverEntry,
        ],
        this as unknown as ResizeObserver,
      );
    }

    unobserve() {}
  }

  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    value: TestResizeObserver,
  });

  return () => {
    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      value: original,
    });
  };
}

function installControllableResizeObserver() {
  const original = globalThis.ResizeObserver;
  const observers: Array<{
    callback: ResizeObserverCallback;
    disconnectCount: number;
    observed: Set<Element>;
  }> = [];

  class TestResizeObserver {
    readonly record: (typeof observers)[number];

    constructor(private readonly callback: ResizeObserverCallback) {
      this.record = {
        callback,
        disconnectCount: 0,
        observed: new Set<Element>(),
      };
      observers.push(this.record);
    }

    disconnect() {
      this.record.disconnectCount += 1;
      this.record.observed.clear();
    }

    observe(target: Element) {
      this.record.observed.add(target);
    }

    unobserve(target: Element) {
      this.record.observed.delete(target);
    }
  }

  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    value: TestResizeObserver,
  });

  const emitBatch = (measurements: ReadonlyArray<{ blockSize: number; element: Element }>) => {
    const observer = observers.find((candidate) =>
      measurements.every(({ element }) => candidate.observed.has(element)),
    );

    if (!observer) {
      throw new Error("Expected the elements to be observed by one observer");
    }

    observer.callback(
      measurements.map(({ blockSize, element }) => {
        const rect = element.getBoundingClientRect();

        return {
          borderBoxSize: [{ blockSize, inlineSize: rect.width }],
          contentRect: { height: blockSize, width: rect.width },
          target: element,
        } as unknown as ResizeObserverEntry;
      }),
      {} as ResizeObserver,
    );
  };
  const emit = (element: Element, blockSize: number) =>
    emitBatch([{ blockSize, element }]);

  return {
    emit,
    emitBatch,
    observers,
    restore: () => {
      Object.defineProperty(globalThis, "ResizeObserver", {
        configurable: true,
        value: original,
      });
    },
  };
}

function setElementRect(element: Element, width: number, height: number) {
  return vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    bottom: height,
    height,
    left: 0,
    right: width,
    top: 0,
    width,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
}

function pressControlKey(element: Element, key: "c" | "v") {
  act(() => {
    element.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        ctrlKey: true,
        key,
      }),
    );
  });
}

function createMousePointerEvent(
  type: "pointerdown" | "pointermove" | "pointerup",
  init: MouseEventInit,
) {
  const event = new MouseEvent(type, init);

  Object.defineProperty(event, "pointerType", { value: "mouse" });

  return event;
}

describe("column filtering interaction contract", () => {
  const filterColumns = [
    { field: "name", filter: { kind: "text" as const }, label: "Name", sort: true },
    { field: "age", filter: { kind: "number" as const }, label: "Age", sort: true },
  ];

  function ControlledFilteringTable({
    onChangeSortModel,
  }: {
    onChangeSortModel?: CominsTableProps<PersonRow>["onChangeSortModel"];
  }) {
    const [model, setModel] = useState<CominsColumnFilterModel>([]);
    const [openColumnId, setOpenColumnId] = useState<string | null>(null);

    return (
      <CominsTable
        columnFiltering={{
          model,
          onChangeModel: setModel,
          onChangeOpenColumnId: setOpenColumnId,
          openColumnId,
        }}
        columns={filterColumns}
        data={rows}
        getRowId={getPersonRowId}
        onChangeSortModel={onChangeSortModel}
      />
    );
  }

  it("keeps the Header control fully controlled and isolated from sorting", () => {
    const onChangeSortModel = vi.fn();
    const view = renderTableElement(<ControlledFilteringTable onChangeSortModel={onChangeSortModel} />);
    const trigger = view.querySelector<HTMLButtonElement>("[data-testid='column-filter-trigger-name']")!;

    act(() => trigger.click());

    const input = view.querySelector<HTMLInputElement>("[data-testid='column-filter-value-name']")!;

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(view.querySelector("[data-testid='column-filter-popover-name']")).not.toBeNull();
    expect(onChangeSortModel).not.toHaveBeenCalled();

    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "beta");
      input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(view.querySelector("[data-testid='row-a']")).toBeNull();
    expect(view.querySelector("[data-testid='row-b']")).not.toBeNull();
    expect(trigger.dataset.active).toBe("true");
    expect(onChangeSortModel).not.toHaveBeenCalled();

    act(() => {
      view.querySelector<HTMLButtonElement>("[data-testid='column-filter-clear-name']")?.click();
    });

    expect(view.querySelector("[data-testid='row-a']")).not.toBeNull();
    expect(view.querySelector("[data-testid='row-b']")).not.toBeNull();
    expect(trigger.dataset.active).toBeUndefined();
  });

  it("closes on Escape and outside pointer input, returning focus on Escape", () => {
    const view = renderTableElement(<ControlledFilteringTable />);
    const trigger = view.querySelector<HTMLButtonElement>("[data-testid='column-filter-trigger-name']")!;

    act(() => trigger.click());
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" })));

    expect(view.querySelector("[data-testid='column-filter-popover-name']")).toBeNull();
    expect(document.activeElement).toBe(trigger);

    act(() => trigger.click());
    act(() => document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true })));

    expect(view.querySelector("[data-testid='column-filter-popover-name']")).toBeNull();
  });

  it("exposes active read-only filters without opening an editable popover", () => {
    const view = renderTableElement(
      <CominsTable
        columnFiltering={{ model: [{ columnId: "name", operator: "contains", value: "alpha" }] }}
        columns={filterColumns}
        data={rows}
        getRowId={getPersonRowId}
      />,
    );
    const trigger = view.querySelector<HTMLButtonElement>("[data-testid='column-filter-trigger-name']")!;

    expect(trigger.disabled).toBe(true);
    expect(trigger.dataset.active).toBe("true");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps an active comparison while a between range draft is incomplete", () => {
    function ActiveRangeFilteringTable() {
      const [model, setModel] = useState<CominsColumnFilterModel>([
        { columnId: "age", operator: "equals", value: 31 },
      ]);

      return (
        <>
          <output data-testid="active-range-model">{JSON.stringify(model)}</output>
          <CominsTable
            columnFiltering={{
              model,
              onChangeModel: setModel,
              onChangeOpenColumnId: () => undefined,
              openColumnId: "age",
            }}
            columns={filterColumns}
            data={rows}
            getRowId={getPersonRowId}
          />
        </>
      );
    }

    const view = renderTableElement(<ActiveRangeFilteringTable />);
    const operator = view.querySelector<HTMLSelectElement>("[data-testid='column-filter-operator-age']")!;

    expect(view.querySelector("[data-testid='row-a']")).not.toBeNull();
    expect(view.querySelector("[data-testid='row-b']")).toBeNull();

    act(() => {
      operator.value = "between";
      operator.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(operator.value).toBe("between");
    expect(view.querySelector("[data-testid='column-filter-value-to-age']")).not.toBeNull();
    expect(view.querySelector("[data-testid='active-range-model']")?.textContent).toContain('"operator":"equals"');

    const valueTo = view.querySelector<HTMLInputElement>("[data-testid='column-filter-value-to-age']")!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(valueTo, "42");
      valueTo.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
      valueTo.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(view.querySelector("[data-testid='active-range-model']")?.textContent).toContain('"operator":"between"');
    expect(view.querySelector("[data-testid='row-a']")).not.toBeNull();
    expect(view.querySelector("[data-testid='row-b']")).not.toBeNull();
  });

  it("derives visible Rows and Summary from the controlled filter model", () => {
    const renderFiltered = (value: string) => (
      <CominsTable
        columnFiltering={{ model: [{ columnId: "name", operator: "contains", value }] }}
        columns={filterColumns}
        data={rows}
        getRowId={getPersonRowId}
        summary={{ columns: { age: "sum" } }}
      />
    );
    const view = renderTableElement(renderFiltered("alp"));

    expect(view.querySelectorAll("tr[data-comins-row-data-index]")).toHaveLength(1);
    expect(view.querySelector("[data-testid='row-a']")).not.toBeNull();
    expect(view.querySelector("[data-testid='row-b']")).toBeNull();
    expect(view.querySelector("[data-testid='summary-cell-age']")?.textContent).toBe("31");

    act(() => root?.render(renderFiltered("beta")));

    expect(view.querySelector("[data-testid='row-a']")).toBeNull();
    expect(view.querySelector("[data-testid='row-b']")).not.toBeNull();
    expect(view.querySelector("[data-testid='summary-cell-age']")?.textContent).toBe("42");
  });

  it("keeps every explicit Group while filtering membership, counts, and aggregates", () => {
    const view = renderTableElement(
      <CominsTable
        columnFiltering={{ model: [{ columnId: "name", operator: "contains", value: "alpha" }] }}
        columns={filterColumns}
        data={rows}
        getRowId={getPersonRowId}
        rowGrouping={createPersonGrouping({
          aggregations: { age: "sum" },
          expandedGroupIds: [31, 42, 99],
        })}
      />,
    );

    expect(view.querySelectorAll("[data-comins-group-row]")).toHaveLength(3);
    expect(view.querySelector("[data-testid='group-row-31']")?.textContent).toContain("1 Rows");
    expect(view.querySelector("[data-testid='group-row-31']")?.textContent).toContain("31");
    expect(view.querySelector("[data-testid='group-row-42']")?.textContent).toContain("0 Rows");
    expect(view.querySelector("[data-testid='group-row-99']")?.textContent).toContain("0 Rows");
    expect(view.querySelectorAll("tr[data-comins-row-data-index]")).toHaveLength(1);
    expect(view.querySelector("[data-testid='row-a']")).not.toBeNull();
  });

  it("clamps an out-of-range filtered page to the final effective page", () => {
    const view = renderTableElement(
      <CominsTable
        columnFiltering={{ model: [{ columnId: "name", operator: "contains", value: "a" }] }}
        columns={filterColumns}
        data={rows}
        getRowId={getPersonRowId}
        pagination={{ pageIndex: 99, pageSize: 1 }}
      />,
    );

    expect(view.querySelectorAll("tr[data-comins-row-data-index]")).toHaveLength(1);
    expect(view.querySelector("[data-testid='row-b']")).not.toBeNull();
  });

  it("keeps loading and Row movement inert for malformed untyped filtered input", () => {
    const onLazyLoad = vi.fn();
    const onLoadMore = vi.fn();
    const ref = createRef<CominsTableRef<PersonRow>>();
    const view = renderTableElement(
      <CominsTable
        {...({
          columnFiltering: { model: [] },
          columns: filterColumns,
          data: rows,
          getRowId: getPersonRowId,
          hasMoreRows: true,
          infiniteScroll: true,
          lazyLoad: true,
          onLazyLoad,
          onLoadMore,
          ref,
          rowProps: { draggable: true },
        } as unknown as CominsTableProps<PersonRow> & React.RefAttributes<CominsTableRef<PersonRow>>)}
      />,
    );

    expect(view.querySelectorAll("[data-row-draggable='true']")).toHaveLength(0);
    expect(onLazyLoad).not.toHaveBeenCalled();
    expect(onLoadMore).not.toHaveBeenCalled();
    act(() => ref.current?.setMoveTargetRow(1, 0));
    expect(view.querySelector("[data-testid='row-a']")).not.toBeNull();
  });
});

describe("comins-table keyboard interaction", () => {
  it("renders summary values from all controlled rows before pagination", () => {
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        pagination={{ pageIndex: 0, pageSize: 1 }}
        summary={{ columns: { age: "sum" } }}
      />,
    );

    expect(element.querySelector("[data-testid='summary-cell-age']")?.textContent).toBe("73");
  });

  it("renders summary row and cell styling with visible-column colSpan", () => {
    const element = renderTableElement(
      <CominsTable
        columns={[
          { field: "name", id: "label", label: "Label" },
          { field: "name", id: "name", label: "Name" },
          { field: "age", id: "age", label: "Age" },
        ]}
        data={rows}
        getRowId={(row) => row.id}
        summary={{
          className: "summary-row-custom",
          columns: {
            age: "sum",
            label: {
              aggregate: "count",
              className: "summary-cell-custom",
              colSpan: 2,
              format: ({ value }) => `Rows ${String(value)}`,
              style: { textAlign: "center" },
            },
          },
          style: { fontWeight: 800 },
        }}
      />,
    );
    const summaryRow = element.querySelector<HTMLTableRowElement>(".comins-table__summary-row");
    const labelCell = element.querySelector<HTMLTableCellElement>("[data-testid='summary-cell-label']");

    expect(summaryRow?.className).toContain("summary-row-custom");
    expect(summaryRow?.style.fontWeight).toBe("800");
    expect(labelCell?.className).toContain("summary-cell-custom");
    expect(labelCell?.style.textAlign).toBe("center");
    expect(labelCell?.colSpan).toBe(2);
    expect(labelCell?.textContent).toBe("Rows 2");
    expect(element.querySelector("[data-testid='summary-cell-name']")).toBeNull();
    expect(element.querySelector("[data-testid='summary-cell-age']")?.textContent).toBe("73");
  });

  it("applies the shared COMINS typography class and 12px base text class", () => {
    const element = renderTable();
    const table = element.querySelector(".comins-table");

    expect(table?.className).toContain("comins-typography-base");
    expect(table?.className).toContain("text-[length:var(--comins-font-size-base,12px)]");
  });

  it("renders the redesigned field and label column API", () => {
    const element = renderTableElement(
      <CominsTable columns={apiColumns} data={apiRows} getRowId={(row) => row.id} />,
    );

    expect(element.querySelector("[data-testid='header-name']")?.textContent).toContain("Name");
    expect(element.querySelector("[data-testid='header-profile.age']")?.textContent).toContain("Profile Age");
    expect(element.querySelector("[data-testid='cell-a-name']")?.textContent).toBe("Alpha");
    expect(element.querySelector("[data-testid='cell-a-profile.age']")?.textContent).toBe("31");
  });

  it("accepts buffer-size and uses a practical default virtualized row buffer", () => {
    const defaultProps: CominsTableProps<PersonRow> = {
      columns,
      data: manyRows,
      getRowId: (row) => row.id,
      rowHeight: 20,
      virtualized: true,
    };
    const customProps: CominsTableProps<PersonRow> = {
      ...defaultProps,
      "buffer-size": 30,
    };

    const defaultElement = renderTableElement(<CominsTable {...defaultProps} />);
    const defaultRows = defaultElement.querySelectorAll("tbody tr[data-comins-row-data-index]");

    expect(defaultRows.length).toBeGreaterThanOrEqual(17);
    expect(defaultRows.length).toBeLessThanOrEqual(27);

    act(() => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;

    const customElement = renderTableElement(<CominsTable {...customProps} />);
    const customRows = customElement.querySelectorAll("tbody tr[data-comins-row-data-index]");

    expect(customRows.length).toBe(42);
  });

  it("keeps a fixed detail owner mounted when the virtual viewport starts inside its detail", () => {
    const detailRows = manyRows.slice(0, 100);
    const renderProps = (expandedRowIds: readonly string[]) => (
      <CominsTable
        buffer-size={2}
        columns={columns}
        data={detailRows}
        data-testid="fixed-detail-viewport"
        expandedRowIds={expandedRowIds}
        getRowDetailHeight={() => 300}
        getRowId={(row) => row.id}
        onChangeExpandedRowIds={() => undefined}
        renderRowDetail={({ row }) => <span>{`Detail ${row.id}`}</span>}
        rowHeight={36}
        virtualized
      />
    );
    const element = renderTableElement(renderProps(["row-20"]));
    const viewport = element.querySelector<HTMLElement>("[data-testid='fixed-detail-viewport']")!;
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });

    try {
      Object.defineProperties(viewport, {
        clientHeight: { configurable: true, value: 180 },
        scrollHeight: { configurable: true, value: 3900 },
        scrollTop: { configurable: true, value: 800, writable: true },
      });

      act(() => {
        viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      });

      expect(element.querySelector("[data-testid='row-row-20']")).not.toBeNull();
      expect(element.querySelector("[data-detail-for='row-20']")).not.toBeNull();
      expect(
        element.querySelector<HTMLElement>(".comins-table__body-virtual-sizer")?.style.height,
      ).toBe("3900px");
      expect(element.querySelectorAll("tbody tr[data-comins-row-data-index]").length).toBeLessThanOrEqual(16);

      act(() => {
        root?.render(renderProps([]));
      });

      expect(
        element.querySelector<HTMLElement>(".comins-table__body-virtual-sizer")?.style.height,
      ).toBe("3600px");
    } finally {
      requestAnimationFrame.mockRestore();
    }
  });

  it("captures the pre-collapse anchor before a browser-like bottom clamp", () => {
    const detailRows = manyRows.slice(0, 100);
    const renderProps = (expandedRowIds: readonly string[]) => (
      <CominsTable
        buffer-size={2}
        columns={columns}
        data={detailRows}
        data-testid="bottom-clamp-detail-viewport"
        expandedRowIds={expandedRowIds}
        getRowDetailHeight={() => 300}
        getRowId={(row) => row.id}
        onChangeExpandedRowIds={() => undefined}
        renderRowDetail={({ row }) => <span>{`Detail ${row.id}`}</span>}
        rowHeight={36}
        virtualized
      />
    );
    const restoreResizeObserver = installTestResizeObserver(180);
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });

    try {
      const element = renderTableElement(renderProps(["row-90"]));
      const viewport = element.querySelector<HTMLElement>("[data-testid='bottom-clamp-detail-viewport']")!;
      const sizer = element.querySelector<HTMLElement>(".comins-table__body-virtual-sizer")!;
      let assignedScrollTop = 3700;

      Object.defineProperties(viewport, {
        clientHeight: { configurable: true, value: 180 },
        scrollHeight: {
          configurable: true,
          get: () => Number.parseFloat(sizer.style.height),
        },
        scrollTop: {
          configurable: true,
          get: () =>
            Math.min(
              assignedScrollTop,
              Math.max(0, Number.parseFloat(sizer.style.height) - 180),
            ),
          set: (value: number) => {
            assignedScrollTop = value;
          },
        },
      });

      act(() => {
        viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      });
      act(() => {
        root?.render(renderProps([]));
      });

      expect(viewport.scrollTop).toBe(3400);
      expect(
        element.querySelector<HTMLElement>(".comins-table__body-table")?.style.transform,
      ).toBe("translate3d(0, 3312px, 0)");
      expect(element.querySelector("[data-testid='row-row-94']")).not.toBeNull();
    } finally {
      requestAnimationFrame.mockRestore();
      restoreResizeObserver();
    }
  });

  it("uses the previous owner when a mixed-to-fixed anchor is removed", () => {
    const detailRows = manyRows.slice(0, 100);
    const withoutAnchor = detailRows.filter((row) => row.id !== "row-50");
    const renderProps = (data: readonly PersonRow[], expandedRowIds: readonly string[]) => (
      <CominsTable
        buffer-size={2}
        columns={columns}
        data={data}
        data-testid="removed-anchor-detail-viewport"
        expandedRowIds={expandedRowIds}
        getRowDetailHeight={() => 300}
        getRowId={(row) => row.id}
        onChangeExpandedRowIds={() => undefined}
        renderRowDetail={({ row }) => <span>{`Detail ${row.id}`}</span>}
        rowHeight={36}
        virtualized
      />
    );
    const restoreResizeObserver = installTestResizeObserver(180);
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });

    try {
      const element = renderTableElement(renderProps(detailRows, ["row-20"]));
      const viewport = element.querySelector<HTMLElement>("[data-testid='removed-anchor-detail-viewport']")!;

      Object.defineProperties(viewport, {
        clientHeight: { configurable: true, value: 180 },
        scrollHeight: { configurable: true, value: 3900 },
        scrollTop: { configurable: true, value: 2112, writable: true },
      });

      act(() => {
        viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      });
      act(() => {
        root?.render(renderProps(withoutAnchor, []));
      });

      expect(viewport.scrollTop).toBe(1776);
      expect(
        element.querySelector<HTMLElement>(".comins-table__body-table")?.style.transform,
      ).toBe("translate3d(0, 1692px, 0)");
      expect(element.querySelector("[data-testid='row-row-49']")).not.toBeNull();
    } finally {
      requestAnimationFrame.mockRestore();
      restoreResizeObserver();
    }
  });

  it("uses the next owner when a mixed-to-fixed anchor and all previous owners are removed", () => {
    const detailRows = manyRows.slice(0, 100);
    const afterAnchor = detailRows.filter((_row, index) => index > 50);
    const renderProps = (data: readonly PersonRow[], expandedRowIds: readonly string[]) => (
      <CominsTable
        buffer-size={2}
        columns={columns}
        data={data}
        data-testid="next-anchor-detail-viewport"
        expandedRowIds={expandedRowIds}
        getRowDetailHeight={() => 300}
        getRowId={(row) => row.id}
        onChangeExpandedRowIds={() => undefined}
        renderRowDetail={({ row }) => <span>{`Detail ${row.id}`}</span>}
        rowHeight={36}
        virtualized
      />
    );
    const restoreResizeObserver = installTestResizeObserver(180);
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });

    try {
      const element = renderTableElement(renderProps(detailRows, ["row-20"]));
      const viewport = element.querySelector<HTMLElement>("[data-testid='next-anchor-detail-viewport']")!;

      Object.defineProperties(viewport, {
        clientHeight: { configurable: true, value: 180 },
        scrollHeight: { configurable: true, value: 3900 },
        scrollTop: { configurable: true, value: 2112, writable: true },
      });

      act(() => {
        viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      });
      act(() => {
        root?.render(renderProps(afterAnchor, []));
      });

      expect(viewport.scrollTop).toBe(12);
      expect(
        element.querySelector<HTMLElement>(".comins-table__body-table")?.style.transform,
      ).toBe("translate3d(0, 0px, 0)");
      expect(element.querySelector("[data-testid='row-row-51']")).not.toBeNull();
    } finally {
      requestAnimationFrame.mockRestore();
      restoreResizeObserver();
    }
  });

  it("creates no Detail measurement observer when Row Detail is disabled", () => {
    const resize = installControllableResizeObserver();

    try {
      const element = renderTableElement(
        <CominsTable
          columns={columns}
          data={rows}
          data-testid="no-detail-measurement-viewport"
          getRowId={(row) => row.id}
          virtualized
        />,
      );
      const viewport = element.querySelector("[data-testid='no-detail-measurement-viewport']")!;

      expect(resize.observers).toHaveLength(1);
      expect([...resize.observers[0]!.observed]).toEqual([viewport]);
    } finally {
      resize.restore();
    }
  });

  it("creates no Detail measurement observer for fixed heights", () => {
    const resize = installControllableResizeObserver();

    try {
      const element = renderTableElement(
        <CominsTable
          columns={columns}
          data={rows}
          data-testid="fixed-measurement-viewport"
          expandedRowIds={["a"]}
          getRowDetailHeight={() => 300}
          getRowId={(row) => row.id}
          onChangeExpandedRowIds={() => undefined}
          renderRowDetail={({ row }) => <span>{row.data.name}</span>}
          virtualized
        />,
      );
      const viewport = element.querySelector("[data-testid='fixed-measurement-viewport']")!;

      expect(resize.observers).toHaveLength(1);
      expect([...resize.observers[0]!.observed]).toEqual([viewport]);
    } finally {
      resize.restore();
    }
  });

  it("uses one shared Detail observer for mounted automatic content blocks", () => {
    const resize = installControllableResizeObserver();

    try {
      const element = renderTableElement(
        <CominsTable
          columns={columns}
          data={rows}
          data-testid="auto-measurement-viewport"
          expandedRowIds={["a", "b", "missing"]}
          getRowDetailHeight={() => "auto"}
          getRowId={(row) => row.id}
          onChangeExpandedRowIds={() => undefined}
          renderRowDetail={({ row }) => <span>{row.data.name}</span>}
        />,
      );
      const first = element.querySelector("[data-testid='row-detail-content-a']")!;
      const second = element.querySelector("[data-testid='row-detail-content-b']")!;
      const missing = element.querySelector("[data-testid='row-detail-content-missing']");
      const detailObserver = resize.observers.find((observer) => observer.observed.has(first));

      expect(resize.observers).toHaveLength(2);
      expect(missing).toBeNull();
      expect([...detailObserver!.observed]).toEqual([first, second]);
    } finally {
      resize.restore();
    }
  });

  it("disconnects an idle Detail observer and creates one again for a later automatic Detail", () => {
    const resize = installControllableResizeObserver();
    const renderProps = (expandedRowIds: readonly string[]) => (
      <CominsTable
        columns={columns}
        data={rows}
        data-testid="detail-reregister-viewport"
        expandedRowIds={expandedRowIds}
        getRowDetailHeight={() => "auto"}
        getRowId={(row) => row.id}
        onChangeExpandedRowIds={() => undefined}
        renderRowDetail={({ row }) => <span>{row.data.name}</span>}
      />
    );

    try {
      const element = renderTableElement(renderProps(["a"]));
      const first = element.querySelector("[data-testid='row-detail-content-a']")!;
      const firstDetailObserver = resize.observers.find((observer) => observer.observed.has(first))!;

      act(() => root?.render(renderProps([])));

      expect(firstDetailObserver.disconnectCount).toBe(1);
      expect(firstDetailObserver.observed.size).toBe(0);

      act(() => root?.render(renderProps(["b"])));

      const second = element.querySelector("[data-testid='row-detail-content-b']")!;
      const secondDetailObserver = resize.observers.find(
        (observer) => observer !== firstDetailObserver && observer.observed.has(second),
      );

      expect(secondDetailObserver).toBeDefined();
      expect(resize.observers).toHaveLength(3);
    } finally {
      resize.restore();
    }
  });

  it("replaces the automatic Detail estimate with a 420px observation", () => {
    const resize = installControllableResizeObserver();

    try {
      const element = renderTableElement(
        <CominsTable
          columns={columns}
          data={rows}
          data-testid="measured-detail-viewport"
          estimatedRowDetailHeight={300}
          expandedRowIds={["a"]}
          getRowDetailHeight={() => "auto"}
          getRowId={(row) => row.id}
          onChangeExpandedRowIds={() => undefined}
          renderRowDetail={({ row }) => <span>{row.data.name}</span>}
          rowHeight={36}
          virtualized
        />,
      );
      const viewport = element.querySelector("[data-testid='measured-detail-viewport']")!;
      const content = element.querySelector("[data-testid='row-detail-content-a']")!;
      const sizer = element.querySelector<HTMLElement>(".comins-table__body-virtual-sizer")!;

      setElementRect(viewport, 800, 180);
      setElementRect(content, 800, 300);

      act(() => resize.emit(viewport, 180));
      expect(sizer.style.height).toBe("372px");

      act(() => resize.emit(content, 420));
      expect(sizer.style.height).toBe("492px");
    } finally {
      resize.restore();
    }
  });

  it("drops automatic Detail measurements when stable data receives new Row ids", () => {
    const resize = installControllableResizeObserver();
    const detailRows = rows;
    const renderProps = (getRowId: (row: PersonRow, index: number) => string) => (
      <CominsTable
        columns={columns}
        data={detailRows}
        data-testid="remapped-detail-viewport"
        estimatedRowDetailHeight={300}
        expandedRowIds={["a"]}
        getRowDetailHeight={() => "auto"}
        getRowId={getRowId}
        onChangeExpandedRowIds={() => undefined}
        renderRowDetail={({ row }) => <span>{row.data.name}</span>}
        rowHeight={36}
        virtualized
      />
    );

    try {
      const element = renderTableElement(renderProps((row) => row.id));
      const viewport = element.querySelector("[data-testid='remapped-detail-viewport']")!;
      const firstContent = element.querySelector("[data-testid='row-detail-content-a']")!;
      const sizer = element.querySelector<HTMLElement>(".comins-table__body-virtual-sizer")!;

      setElementRect(viewport, 800, 180);
      setElementRect(firstContent, 800, 300);
      act(() => resize.emit(viewport, 180));
      act(() => resize.emit(firstContent, 420));
      expect(sizer.style.height).toBe("492px");

      act(() => {
        root?.render(renderProps((row) => row.id));
      });

      expect(sizer.style.height).toBe("492px");

      act(() => {
        root?.render(renderProps((_row, index) => (index === 0 ? "c" : "a")));
      });

      expect(element.querySelector("[data-testid='row-detail-content-a']")?.textContent).toBe("Beta");
      expect(sizer.style.height).toBe("372px");
    } finally {
      resize.restore();
    }
  });

  it("updates 100,000-row automatic Detail measurements without rebuilding the height index", () => {
    const resize = installControllableResizeObserver();
    const heightIndexBuild = vi.spyOn(CominsHeightIndex, "from");
    const heightIndexUpdate = vi.spyOn(CominsHeightIndex.prototype, "updateHeight");
    const detailRows = Array.from({ length: 100_000 }, (_value, index) => ({
      age: index,
      id: `row-${index}`,
      name: `Row ${index}`,
    }));
    const getRowDetailHeight = () => "auto" as const;
    const getRowId = (row: PersonRow) => row.id;
    const onChangeExpandedRowIds = () => undefined;
    const renderRowDetail = ({ row }: { row: { data: PersonRow } }) => (
      <span>{row.data.name}</span>
    );
    const renderProps = (expandedRowIds: readonly string[]) => (
      <CominsTable
        columns={columns}
        data={detailRows}
        data-testid="incremental-detail-height-viewport"
        expandedRowIds={expandedRowIds}
        getRowDetailHeight={getRowDetailHeight}
        getRowId={getRowId}
        onChangeExpandedRowIds={onChangeExpandedRowIds}
        renderRowDetail={renderRowDetail}
        rowHeight={36}
        virtualized
      />
    );

    try {
      const element = renderTableElement(renderProps(["row-0", "row-1"]));
      const viewport = element.querySelector(
        "[data-testid='incremental-detail-height-viewport']",
      )!;
      const first = element.querySelector("[data-testid='row-detail-content-row-0']")!;
      const second = element.querySelector("[data-testid='row-detail-content-row-1']")!;

      setElementRect(viewport, 800, 180);
      setElementRect(first, 800, 36);
      setElementRect(second, 800, 36);
      act(() => resize.emit(viewport, 180));

      const activeHeightIndex = heightIndexBuild.mock.results.at(-1)?.value;

      expect(activeHeightIndex).toBeInstanceOf(CominsHeightIndex);
      expect(activeHeightIndex?.getTotalHeight()).toBe(3_600_072);
      heightIndexBuild.mockClear();
      heightIndexUpdate.mockClear();

      act(() => {
        resize.emitBatch([
          { blockSize: 420, element: first },
          { blockSize: 180, element: second },
        ]);
      });
      act(() => {
        resize.emitBatch([
          { blockSize: 460, element: first },
          { blockSize: 220, element: second },
        ]);
      });

      expect(heightIndexBuild).not.toHaveBeenCalled();
      expect(heightIndexUpdate).toHaveBeenCalledTimes(4);
      expect(heightIndexUpdate.mock.calls).toEqual([
        [0, 456],
        [1, 216],
        [0, 496],
        [1, 256],
      ]);
      expect(activeHeightIndex?.getTotalHeight()).toBe(3_600_680);

      act(() => root?.render(renderProps(["row-0"])));

      expect(heightIndexBuild).toHaveBeenCalledTimes(1);
      expect(heightIndexBuild.mock.results[0]?.value.getTotalHeight()).toBe(3_600_460);
    } finally {
      heightIndexUpdate.mockRestore();
      heightIndexBuild.mockRestore();
      resize.restore();
    }
  });

  it("keeps Detail observer inputs on one committed snapshot while a concurrent render suspends", () => {
    const resize = installControllableResizeObserver();
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });
    const suspended = new Promise<void>(() => undefined);
    let renderSuspendedCandidate: (() => void) | undefined;
    let commitCandidate: (() => void) | undefined;
    let suspendedCandidateRenderCount = 0;

    function SuspendAfterTable({ active }: { active: boolean }) {
      if (active) {
        suspendedCandidateRenderCount += 1;
        throw suspended;
      }

      return null;
    }

    function ConcurrentHarness() {
      const [revision, setRevision] = useState(0);
      const candidate = revision > 0;

      renderSuspendedCandidate = () => setRevision(1);
      commitCandidate = () => setRevision(2);

      return (
        <Suspense fallback={<div data-testid="observer-snapshot-fallback" />}>
          <CominsTable
            columns={columns}
            data={manyRows}
            data-testid="observer-snapshot-viewport"
            estimatedRowDetailHeight={300}
            expandedRowIds={candidate ? ["row-0", "row-1"] : ["row-0"]}
            getRowDetailHeight={() => "auto"}
            getRowId={(row) => row.id}
            onChangeExpandedRowIds={() => undefined}
            renderRowDetail={({ row }) => <span>{row.data.name}</span>}
            rowHeight={candidate ? 60 : 36}
            virtualized
          />
          <SuspendAfterTable active={revision === 1} />
        </Suspense>
      );
    }

    try {
      const element = renderTableElement(
        <StrictMode>
          <ConcurrentHarness />
        </StrictMode>,
      );
      const viewport = element.querySelector<HTMLElement>(
        "[data-testid='observer-snapshot-viewport']",
      )!;
      const content = element.querySelector<HTMLElement>(
        "[data-testid='row-detail-content-row-0']",
      )!;
      const sizer = element.querySelector<HTMLElement>(
        ".comins-table__body-virtual-sizer",
      )!;
      let assignedScrollTop = 600;
      let detailWidth = 800;
      let viewportHeight = 432;
      let viewportWidth = 800;

      vi.spyOn(content, "getBoundingClientRect").mockImplementation(() => ({
        bottom: 300,
        height: 300,
        left: 0,
        right: detailWidth,
        top: 0,
        width: detailWidth,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }));
      vi.spyOn(viewport, "getBoundingClientRect").mockImplementation(() => ({
        bottom: viewportHeight,
        height: viewportHeight,
        left: 0,
        right: viewportWidth,
        top: 0,
        width: viewportWidth,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }));
      Object.defineProperties(viewport, {
        clientHeight: { configurable: true, value: 0 },
        scrollHeight: {
          configurable: true,
          get: () => Number.parseFloat(sizer.style.height),
        },
        scrollTop: {
          configurable: true,
          get: () => assignedScrollTop,
          set: (value: number) => {
            assignedScrollTop = value;
          },
        },
      });

      act(() => {
        resize.emit(viewport, viewportHeight);
        viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      });
      expect(sizer.style.height).toBe("7500px");

      viewportHeight = 720;
      viewportWidth = 500;
      act(() => {
        startTransition(() => {
          resize.emit(viewport, viewportHeight);
          renderSuspendedCandidate?.();
        });
      });

      expect(suspendedCandidateRenderCount).toBeGreaterThan(0);
      expect(element.querySelector("[data-testid='observer-snapshot-fallback']")).toBeNull();
      expect(element.querySelector("[data-testid='row-detail-content-row-1']")).toBeNull();

      detailWidth = 500;
      act(() => resize.emit(content, 420));

      expect(viewport.scrollTop).toBe(600);
      expect(sizer.style.height).toBe("7500px");

      detailWidth = 800;
      act(() => resize.emit(content, 420));

      expect(viewport.scrollTop).toBe(720);
      expect(sizer.style.height).toBe("7620px");

      act(() => commitCandidate?.());

      act(() => resize.emit(viewport, viewportHeight));

      const committedCandidateContent = element.querySelector<HTMLElement>(
        "[data-testid='row-detail-content-row-0']",
      )!;
      const committedCandidateSizer = element.querySelector<HTMLElement>(
        ".comins-table__body-virtual-sizer",
      )!;

      setElementRect(committedCandidateContent, 500, 300);
      expect(committedCandidateSizer.style.height).toBe("12600px");

      act(() => resize.emit(committedCandidateContent, 241));
      expect(committedCandidateSizer.style.height).toBe("12541px");
    } finally {
      requestAnimationFrame.mockRestore();
      resize.restore();
    }
  });

  it("keeps capped Detail anchors on the committed viewport while a candidate suspends", () => {
    const resize = installControllableResizeObserver();
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });
    const detailRows = Array.from({ length: 50_000 }, (_value, index) => ({
      age: index,
      id: `row-${index}`,
      name: `Row ${index}`,
    }));
    const suspended = new Promise<void>(() => undefined);
    let renderSuspendedCandidate: (() => void) | undefined;
    let suspendedCandidateRenderCount = 0;

    function SuspendAfterTable({ active }: { active: boolean }) {
      if (active) {
        suspendedCandidateRenderCount += 1;
        throw suspended;
      }

      return null;
    }

    function ConcurrentHarness() {
      const [revision, setRevision] = useState(0);

      renderSuspendedCandidate = () => setRevision(1);

      return (
        <Suspense fallback={<div data-testid="capped-observer-snapshot-fallback" />}>
          <CominsTable
            columns={columns}
            data={detailRows}
            data-testid="capped-observer-snapshot-viewport"
            estimatedRowDetailHeight={300}
            expandedRowIds={["row-25004"]}
            getRowDetailHeight={() => "auto"}
            getRowId={(row) => row.id}
            onChangeExpandedRowIds={() => undefined}
            renderRowDetail={({ row }) => <span>{row.data.name}</span>}
            rowHeight={36}
            virtualized
          />
          <SuspendAfterTable active={revision === 1} />
        </Suspense>
      );
    }

    try {
      const element = renderTableElement(
        <StrictMode>
          <ConcurrentHarness />
        </StrictMode>,
      );
      const viewport = element.querySelector<HTMLElement>(
        "[data-testid='capped-observer-snapshot-viewport']",
      )!;
      const sizer = element.querySelector<HTMLElement>(
        ".comins-table__body-virtual-sizer",
      )!;
      let assignedScrollTop = 750_000;
      let viewportHeight = 432;

      vi.spyOn(viewport, "getBoundingClientRect").mockImplementation(() => ({
        bottom: viewportHeight,
        height: viewportHeight,
        left: 0,
        right: 800,
        top: 0,
        width: 800,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }));
      Object.defineProperties(viewport, {
        clientHeight: { configurable: true, value: 0 },
        scrollHeight: {
          configurable: true,
          get: () => Number.parseFloat(sizer.style.height),
        },
        scrollTop: {
          configurable: true,
          get: () => assignedScrollTop,
          set: (value: number) => {
            assignedScrollTop = value;
          },
        },
      });

      act(() => {
        resize.emit(viewport, viewportHeight);
        viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      });

      expect(sizer.style.height).toBe("1500000px");

      const content = element.querySelector<HTMLElement>(
        "[data-testid='row-detail-content-row-25004']",
      )!;

      setElementRect(content, 800, 300);
      viewportHeight = 50_000;
      act(() => {
        startTransition(() => {
          resize.emit(viewport, viewportHeight);
          renderSuspendedCandidate?.();
        });
      });

      expect(suspendedCandidateRenderCount).toBeGreaterThan(0);
      expect(element.querySelector("[data-testid='capped-observer-snapshot-fallback']")).toBeNull();

      act(() => resize.emit(content, 420));

      expect(viewport.scrollTop).toBeCloseTo(749_950, 1);
      expect(sizer.style.height).toBe("1500000px");
    } finally {
      requestAnimationFrame.mockRestore();
      resize.restore();
    }
  });

  it("ignores automatic Detail measurement deltas smaller than 0.5px", () => {
    const resize = installControllableResizeObserver();

    try {
      const element = renderTableElement(
        <CominsTable
          columns={columns}
          data={rows}
          data-testid="detail-delta-viewport"
          expandedRowIds={["a"]}
          getRowDetailHeight={() => "auto"}
          getRowId={(row) => row.id}
          onChangeExpandedRowIds={() => undefined}
          renderRowDetail={({ row }) => <span>{row.data.name}</span>}
          rowHeight={36}
          virtualized
        />,
      );
      const viewport = element.querySelector("[data-testid='detail-delta-viewport']")!;
      const content = element.querySelector("[data-testid='row-detail-content-a']")!;
      const sizer = element.querySelector<HTMLElement>(".comins-table__body-virtual-sizer")!;

      setElementRect(viewport, 800, 180);
      setElementRect(content, 800, 300);

      act(() => resize.emit(viewport, 180));
      act(() => resize.emit(content, 420));
      act(() => resize.emit(content, 420.25));

      expect(sizer.style.height).toBe("492px");
    } finally {
      resize.restore();
    }
  });

  it("uses the estimate after Detail width changes until a matching observation arrives", () => {
    const resize = installControllableResizeObserver();
    const ref = createRef<CominsTableRef<PersonRow>>();
    const fixedColumns = [
      { field: "name", label: "Name", width: 400 },
      { field: "age", label: "Age", width: 400 },
    ] as const;

    try {
      const element = renderTableElement(
        <CominsTable
          columns={fixedColumns}
          data={rows}
          data-testid="detail-width-viewport"
          estimatedRowDetailHeight={300}
          expandedRowIds={["a"]}
          getRowDetailHeight={() => "auto"}
          getRowId={(row) => row.id}
          onChangeExpandedRowIds={() => undefined}
          ref={ref}
          renderRowDetail={({ row }) => <span>{row.data.name}</span>}
          rowHeight={36}
          virtualized
        />,
      );
      const viewport = element.querySelector("[data-testid='detail-width-viewport']")!;
      const content = element.querySelector("[data-testid='row-detail-content-a']")!;
      const sizer = element.querySelector<HTMLElement>(".comins-table__body-virtual-sizer")!;
      let detailWidth = 800;

      setElementRect(viewport, 500, 180);
      vi.spyOn(content, "getBoundingClientRect").mockImplementation(() => ({
        bottom: 300,
        height: 300,
        left: 0,
        right: detailWidth,
        top: 0,
        width: detailWidth,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }));

      act(() => resize.emit(viewport, 180));
      act(() => resize.emit(content, 420));
      expect(sizer.style.height).toBe("492px");

      detailWidth = 500;
      act(() => {
        ref.current?.setColumnLayout({
          columns: { age: { hidden: true }, name: { width: 400 } },
        });
      });
      expect(sizer.style.height).toBe("372px");

      act(() => resize.emit(content, 360));
      expect(sizer.style.height).toBe("432px");
    } finally {
      resize.restore();
    }
  });

  it("disconnects the Detail observer and releases observed elements on unmount", () => {
    const resize = installControllableResizeObserver();

    try {
      const element = renderTableElement(
        <CominsTable
          columns={columns}
          data={rows}
          data-testid="detail-cleanup-viewport"
          expandedRowIds={["a"]}
          getRowDetailHeight={() => "auto"}
          getRowId={(row) => row.id}
          onChangeExpandedRowIds={() => undefined}
          renderRowDetail={({ row }) => <span>{row.data.name}</span>}
          virtualized
        />,
      );
      const content = element.querySelector("[data-testid='row-detail-content-a']")!;
      const detailObserver = resize.observers.find((observer) => observer.observed.has(content))!;

      expect(detailObserver.observed.has(content)).toBe(true);

      act(() => root?.unmount());
      root = undefined;

      expect(detailObserver.disconnectCount).toBe(1);
      expect(detailObserver.observed.size).toBe(0);
    } finally {
      resize.restore();
    }
  });

  it("measures automatic Detail content once after mount without ResizeObserver", () => {
    const original = globalThis.ResizeObserver;
    let detailMeasurements = 0;
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
      if (this.classList.contains("comins-table__detail-content")) {
        detailMeasurements += 1;
        return {
          bottom: 420,
          height: 420,
          left: 0,
          right: 800,
          top: 0,
          width: 800,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        };
      }

      return {
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        top: 0,
        width: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };
    });

    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      value: undefined,
    });

    try {
      const element = renderTableElement(
        <CominsTable
          columns={[
            { field: "name", label: "Name", width: 400 },
            { field: "age", label: "Age", width: 400 },
          ]}
          data={rows}
          expandedRowIds={["a"]}
          getRowDetailHeight={() => "auto"}
          getRowId={(row) => row.id}
          onChangeExpandedRowIds={() => undefined}
          renderRowDetail={({ row }) => <span>{row.data.name}</span>}
          rowHeight={36}
          virtualized
        />,
      );

      expect(detailMeasurements).toBe(1);
      expect(
        element.querySelector<HTMLElement>(".comins-table__body-virtual-sizer")?.style.height,
      ).toBe("492px");
    } finally {
      rect.mockRestore();
      Object.defineProperty(globalThis, "ResizeObserver", {
        configurable: true,
        value: original,
      });
    }
  });

  it("preserves the first visible slot while an earlier automatic Detail grows", () => {
    const resize = installControllableResizeObserver();
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });

    try {
      const element = renderTableElement(
        <CominsTable
          buffer-size={30}
          columns={columns}
          data={manyRows.slice(0, 30)}
          data-testid="detail-anchor-viewport"
          estimatedRowDetailHeight={300}
          expandedRowIds={["row-0"]}
          getRowDetailHeight={() => "auto"}
          getRowId={(row) => row.id}
          onChangeExpandedRowIds={() => undefined}
          renderRowDetail={({ row }) => <span>{row.data.name}</span>}
          rowHeight={36}
          virtualized
        />,
      );
      const viewport = element.querySelector<HTMLElement>("[data-testid='detail-anchor-viewport']")!;
      const content = element.querySelector("[data-testid='row-detail-content-row-0']")!;
      const sizer = element.querySelector<HTMLElement>(".comins-table__body-virtual-sizer")!;
      let assignedScrollTop = 600;

      setElementRect(viewport, 800, 180);
      setElementRect(content, 800, 300);
      Object.defineProperties(viewport, {
        clientHeight: { configurable: true, value: 180 },
        scrollHeight: {
          configurable: true,
          get: () => Number.parseFloat(sizer.style.height),
        },
        scrollTop: {
          configurable: true,
          get: () => assignedScrollTop,
          set: (value: number) => {
            assignedScrollTop = value;
          },
        },
      });

      act(() => resize.emit(viewport, 180));
      act(() => {
        viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      });
      act(() => resize.emit(content, 420));

      expect(viewport.scrollTop).toBe(720);
    } finally {
      requestAnimationFrame.mockRestore();
      resize.restore();
    }
  });

  it("applies the latest automatic Detail height from repeated observer batches", () => {
    const resize = installControllableResizeObserver();
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });

    try {
      const element = renderTableElement(
        <CominsTable
          buffer-size={30}
          columns={columns}
          data={manyRows.slice(0, 30)}
          data-testid="detail-batch-viewport"
          estimatedRowDetailHeight={300}
          expandedRowIds={["row-0"]}
          getRowDetailHeight={() => "auto"}
          getRowId={(row) => row.id}
          onChangeExpandedRowIds={() => undefined}
          renderRowDetail={({ row }) => <span>{row.data.name}</span>}
          rowHeight={36}
          virtualized
        />,
      );
      const viewport = element.querySelector<HTMLElement>(
        "[data-testid='detail-batch-viewport']",
      )!;
      const content = element.querySelector(
        "[data-testid='row-detail-content-row-0']",
      )!;
      const sizer = element.querySelector<HTMLElement>(
        ".comins-table__body-virtual-sizer",
      )!;
      let assignedScrollTop = 600;

      setElementRect(viewport, 800, 180);
      setElementRect(content, 800, 300);
      Object.defineProperties(viewport, {
        clientHeight: { configurable: true, value: 180 },
        scrollHeight: {
          configurable: true,
          get: () => Number.parseFloat(sizer.style.height),
        },
        scrollTop: {
          configurable: true,
          get: () => assignedScrollTop,
          set: (value: number) => {
            assignedScrollTop = value;
          },
        },
      });

      act(() => resize.emit(viewport, 180));
      act(() => {
        viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      });
      act(() => {
        resize.emit(content, 360);
        resize.emit(content, 420);
      });

      expect(viewport.scrollTop).toBe(720);
      expect(sizer.style.height).toBe("1500px");
    } finally {
      requestAnimationFrame.mockRestore();
      resize.restore();
    }
  });

  it("re-anchors a width-invalidated automatic Detail after matching remeasurement", () => {
    const resize = installControllableResizeObserver();
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });
    const ref = createRef<CominsTableRef<PersonRow>>();
    const fixedColumns = [
      { field: "name", label: "Name", width: 400 },
      { field: "age", label: "Age", width: 400 },
    ] as const;

    try {
      const element = renderTableElement(
        <CominsTable
          buffer-size={30}
          columns={fixedColumns}
          data={manyRows.slice(0, 30)}
          data-testid="detail-width-anchor-viewport"
          estimatedRowDetailHeight={300}
          expandedRowIds={["row-0"]}
          getRowDetailHeight={() => "auto"}
          getRowId={(row) => row.id}
          onChangeExpandedRowIds={() => undefined}
          ref={ref}
          renderRowDetail={({ row }) => <span>{row.data.name}</span>}
          rowHeight={36}
          virtualized
        />,
      );
      const viewport = element.querySelector<HTMLElement>(
        "[data-testid='detail-width-anchor-viewport']",
      )!;
      const content = element.querySelector(
        "[data-testid='row-detail-content-row-0']",
      )!;
      const sizer = element.querySelector<HTMLElement>(
        ".comins-table__body-virtual-sizer",
      )!;
      let assignedScrollTop = 600;
      let detailWidth = 800;

      setElementRect(viewport, 500, 180);
      vi.spyOn(content, "getBoundingClientRect").mockImplementation(() => ({
        bottom: 300,
        height: 300,
        left: 0,
        right: detailWidth,
        top: 0,
        width: detailWidth,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }));
      Object.defineProperties(viewport, {
        clientHeight: { configurable: true, value: 180 },
        scrollHeight: {
          configurable: true,
          get: () => Number.parseFloat(sizer.style.height),
        },
        scrollTop: {
          configurable: true,
          get: () => assignedScrollTop,
          set: (value: number) => {
            assignedScrollTop = value;
          },
        },
      });

      act(() => resize.emit(viewport, 180));
      act(() => {
        viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      });
      act(() => resize.emit(content, 420));
      expect(viewport.scrollTop).toBe(720);

      detailWidth = 500;
      act(() => {
        ref.current?.setColumnLayout({
          columns: { age: { hidden: true }, name: { width: 400 } },
        });
      });
      expect(viewport.scrollTop).toBe(600);

      act(() => resize.emit(content, 360));
      expect(viewport.scrollTop).toBe(660);
    } finally {
      requestAnimationFrame.mockRestore();
      resize.restore();
    }
  });

  it("lets a user scroll replace the active automatic Detail anchor transaction", () => {
    const resize = installControllableResizeObserver();
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });

    try {
      const element = renderTableElement(
        <CominsTable
          buffer-size={30}
          columns={columns}
          data={manyRows}
          data-testid="detail-user-scroll-viewport"
          estimatedRowDetailHeight={300}
          expandedRowIds={["row-0"]}
          getRowDetailHeight={() => "auto"}
          getRowId={(row) => row.id}
          onChangeExpandedRowIds={() => undefined}
          renderRowDetail={({ row }) => <span>{row.data.name}</span>}
          rowHeight={36}
          virtualized
        />,
      );
      const viewport = element.querySelector<HTMLElement>(
        "[data-testid='detail-user-scroll-viewport']",
      )!;
      const content = element.querySelector(
        "[data-testid='row-detail-content-row-0']",
      )!;
      const sizer = element.querySelector<HTMLElement>(
        ".comins-table__body-virtual-sizer",
      )!;
      let assignedScrollTop = 600;

      setElementRect(viewport, 800, 180);
      setElementRect(content, 800, 300);
      Object.defineProperties(viewport, {
        clientHeight: { configurable: true, value: 180 },
        scrollHeight: {
          configurable: true,
          get: () => Number.parseFloat(sizer.style.height),
        },
        scrollTop: {
          configurable: true,
          get: () => assignedScrollTop,
          set: (value: number) => {
            assignedScrollTop = value;
          },
        },
      });

      act(() => resize.emit(viewport, 180));
      act(() => {
        viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      });
      act(() => resize.emit(content, 420));
      expect(viewport.scrollTop).toBe(720);

      assignedScrollTop = 1_500;
      act(() => {
        viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      });
      act(() => resize.emit(content, 480));

      expect(viewport.scrollTop).toBe(1_560);
      expect(
        element.querySelector("[data-testid='row-row-45']"),
      ).not.toBeNull();
    } finally {
      requestAnimationFrame.mockRestore();
      resize.restore();
    }
  });

  it("keeps a same-batch user scroll when an automatic Detail measurement is pending", () => {
    const resize = installControllableResizeObserver();
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });

    try {
      const element = renderTableElement(
        <CominsTable
          buffer-size={30}
          columns={columns}
          data={manyRows}
          data-testid="detail-pending-user-scroll-viewport"
          estimatedRowDetailHeight={300}
          expandedRowIds={["row-0"]}
          getRowDetailHeight={() => "auto"}
          getRowId={(row) => row.id}
          onChangeExpandedRowIds={() => undefined}
          renderRowDetail={({ row }) => <span>{row.data.name}</span>}
          rowHeight={36}
          virtualized
        />,
      );
      const viewport = element.querySelector<HTMLElement>(
        "[data-testid='detail-pending-user-scroll-viewport']",
      )!;
      const content = element.querySelector(
        "[data-testid='row-detail-content-row-0']",
      )!;
      const sizer = element.querySelector<HTMLElement>(
        ".comins-table__body-virtual-sizer",
      )!;
      let assignedScrollTop = 600;

      setElementRect(viewport, 800, 180);
      setElementRect(content, 800, 300);
      Object.defineProperties(viewport, {
        clientHeight: { configurable: true, value: 180 },
        scrollHeight: {
          configurable: true,
          get: () => Number.parseFloat(sizer.style.height),
        },
        scrollTop: {
          configurable: true,
          get: () => assignedScrollTop,
          set: (value: number) => {
            assignedScrollTop = value;
          },
        },
      });

      act(() => resize.emit(viewport, 180));
      act(() => {
        viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      });
      act(() => resize.emit(content, 420));
      expect(viewport.scrollTop).toBe(720);

      act(() => {
        resize.emit(content, 480);
        assignedScrollTop = 1_500;
        viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      });

      expect(viewport.scrollTop).toBe(1_500);
      expect(element.querySelector("[data-testid='row-row-60']")).not.toBeNull();
    } finally {
      requestAnimationFrame.mockRestore();
      resize.restore();
    }
  });

  it("keeps a user scroll when a newer Detail revision arrives during correction", () => {
    const resize = installControllableResizeObserver();
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });
    let interruptNextCorrection = false;

    try {
      const element = renderTableElement(
        <CominsTable
          buffer-size={30}
          columns={columns}
          data={manyRows}
          data-testid="detail-newer-revision-viewport"
          estimatedRowDetailHeight={300}
          expandedRowIds={["row-0"]}
          getRowDetailHeight={() => "auto"}
          getRowId={(row) => row.id}
          onChangeExpandedRowIds={() => undefined}
          renderRowDetail={({ row }) => <span>{row.data.name}</span>}
          rowHeight={36}
          virtualized
        />,
      );
      const viewport = element.querySelector<HTMLElement>(
        "[data-testid='detail-newer-revision-viewport']",
      )!;
      const content = element.querySelector(
        "[data-testid='row-detail-content-row-0']",
      )!;
      const sizer = element.querySelector<HTMLElement>(
        ".comins-table__body-virtual-sizer",
      )!;
      let assignedScrollTop = 600;

      setElementRect(viewport, 800, 180);
      setElementRect(content, 800, 300);
      Object.defineProperties(viewport, {
        clientHeight: { configurable: true, value: 180 },
        scrollHeight: {
          configurable: true,
          get: () => Number.parseFloat(sizer.style.height),
        },
        scrollTop: {
          configurable: true,
          get: () => assignedScrollTop,
          set: (value: number) => {
            if (interruptNextCorrection) {
              interruptNextCorrection = false;
              resize.emit(content, 540);
              assignedScrollTop = 1_500;
              viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
              return;
            }

            assignedScrollTop = value;
          },
        },
      });

      act(() => resize.emit(viewport, 180));
      act(() => {
        viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      });
      act(() => resize.emit(content, 420));
      expect(viewport.scrollTop).toBe(720);

      interruptNextCorrection = true;
      act(() => resize.emit(content, 480));

      expect(viewport.scrollTop).toBe(1_500);

      act(() => resize.emit(content, 600));
      expect(viewport.scrollTop).toBe(1_560);
    } finally {
      requestAnimationFrame.mockRestore();
      resize.restore();
    }
  });

  it("clamps an automatic Detail shrink at the mixed viewport bottom", () => {
    const resize = installControllableResizeObserver();
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });

    try {
      const element = renderTableElement(
        <CominsTable
          buffer-size={10}
          columns={columns}
          data={manyRows.slice(0, 100)}
          data-testid="detail-bottom-clamp-viewport"
          expandedRowIds={["row-90"]}
          getRowDetailHeight={() => "auto"}
          getRowId={(row) => row.id}
          onChangeExpandedRowIds={() => undefined}
          renderRowDetail={({ row }) => <span>{row.data.name}</span>}
          rowHeight={36}
          virtualized
        />,
      );
      const viewport = element.querySelector<HTMLElement>(
        "[data-testid='detail-bottom-clamp-viewport']",
      )!;
      const sizer = element.querySelector<HTMLElement>(
        ".comins-table__body-virtual-sizer",
      )!;
      let assignedScrollTop = 3_720;

      setElementRect(viewport, 800, 180);
      Object.defineProperties(viewport, {
        clientHeight: { configurable: true, value: 180 },
        scrollHeight: {
          configurable: true,
          get: () => Number.parseFloat(sizer.style.height),
        },
        scrollTop: {
          configurable: true,
          get: () =>
            Math.min(
              assignedScrollTop,
              Math.max(
                0,
                Number.parseFloat(sizer.style.height) - 180,
              ),
            ),
          set: (value: number) => {
            assignedScrollTop = value;
          },
        },
      });

      act(() => resize.emit(viewport, 180));
      act(() => {
        viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      });

      const content = element.querySelector(
        "[data-testid='row-detail-content-row-90']",
      )!;
      setElementRect(content, 800, 300);

      act(() => resize.emit(content, 420));
      expect(viewport.scrollTop).toBe(3_840);

      act(() => resize.emit(content, 100));
      expect(viewport.scrollTop).toBe(3_520);
      expect(viewport.scrollTop).toBe(
        viewport.scrollHeight - viewport.clientHeight,
      );
      expect(element.querySelector("[data-testid='row-row-99']")).not.toBeNull();
    } finally {
      requestAnimationFrame.mockRestore();
      resize.restore();
    }
  });

  it("preserves a compressed mixed-row anchor when browser scrollTop assignments are integer-quantized", () => {
    const resize = installControllableResizeObserver();
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });
    const compressedRows: PersonRow[] = Array.from(
      { length: 100_000 },
      (_value, index) => ({
        age: index,
        id: `compressed-row-${index}`,
        name: `Compressed Row ${index}`,
      }),
    );

    try {
      const element = renderTableElement(
        <CominsTable
          buffer-size={30}
          columns={columns}
          data={compressedRows}
          data-testid="compressed-detail-anchor-viewport"
          expandedRowIds={["compressed-row-49995"]}
          getRowDetailHeight={() => "auto"}
          getRowId={(row) => row.id}
          onChangeExpandedRowIds={() => undefined}
          renderRowDetail={({ row }) => <span>{row.data.name}</span>}
          rowHeight={36}
          virtualized
        />,
      );
      const viewport = element.querySelector<HTMLElement>(
        "[data-testid='compressed-detail-anchor-viewport']",
      )!;
      const sizer = element.querySelector<HTMLElement>(
        ".comins-table__body-virtual-sizer",
      )!;
      let assignedScrollTop = 749_950;

      setElementRect(viewport, 800, 463);
      Object.defineProperties(viewport, {
        clientHeight: { configurable: true, value: 463 },
        scrollHeight: {
          configurable: true,
          get: () => Number.parseFloat(sizer.style.height),
        },
        scrollTop: {
          configurable: true,
          get: () => assignedScrollTop,
          set: (value: number) => {
            assignedScrollTop = Math.round(value);
          },
        },
      });

      act(() => resize.emit(viewport, 463));
      act(() => {
        viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      });

      const content = element.querySelector(
        "[data-testid='row-detail-content-compressed-row-49995']",
      )!;
      setElementRect(content, 800, 103);

      const getAnchorViewportOffset = (detailHeight: number) => {
        const table = element.querySelector<HTMLElement>(
          ".comins-table__body-table",
        )!;
        const firstOwner = element.querySelector<HTMLElement>(
          "tr[data-comins-row-data-index]",
        )!;
        const firstIndex = Number(
          firstOwner.dataset.cominsRowDataIndex,
        );
        const transformMatch = table.style.transform.match(
          /translate3d\(0, ([\d.-]+)px, 0\)/,
        );
        const renderOffset = Number(transformMatch?.[1] ?? 0);
        const detailBeforeAnchor =
          firstIndex <= 49_995 && 49_995 < 50_000
            ? detailHeight
            : 0;

        return (
          renderOffset +
          (50_000 - firstIndex) * 36 +
          detailBeforeAnchor -
          viewport.scrollTop
        );
      };

      act(() => resize.emit(content, 103));
      const before = getAnchorViewportOffset(103);

      act(() => resize.emit(content, 211));
      const after = getAnchorViewportOffset(211);

      expect(Math.abs(after - before)).toBeLessThanOrEqual(1);
    } finally {
      requestAnimationFrame.mockRestore();
      resize.restore();
    }
  });

  it("calls onLoadMore once when infinite scroll reaches the bottom threshold", () => {
    const onLoadMore = vi.fn();
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={manyRows.slice(0, 20)}
        data-testid="infinite-scroll-viewport"
        getRowId={(row) => row.id}
        hasMoreRows
        infiniteScroll
        infiniteScrollThreshold={80}
        onLoadMore={onLoadMore}
        pagination={{ pageIndex: 0, pageSize: 20 }}
      />,
    );
    const viewport = element.querySelector<HTMLElement>("[data-testid='infinite-scroll-viewport']")!;

    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, value: 610, writable: true },
    });

    act(() => {
      viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    expect(onLoadMore).toHaveBeenCalledTimes(0);

    viewport.scrollTop = 650;
    act(() => {
      viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    act(() => {
      viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("blocks infinite load requests while loading or exhausted and renders a loading row", () => {
    const onLoadMore = vi.fn();
    const loadingElement = renderTableElement(
      <CominsTable
        columns={columns}
        data={manyRows.slice(0, 20)}
        data-testid="infinite-scroll-viewport"
        getRowId={(row) => row.id}
        hasMoreRows
        infiniteScroll
        loadingMore
        onLoadMore={onLoadMore}
        pagination={{ pageIndex: 0, pageSize: 20 }}
      />,
    );
    const loadingViewport = loadingElement.querySelector<HTMLElement>("[data-testid='infinite-scroll-viewport']")!;

    expect(loadingElement.querySelector("[data-testid='data-table-infinite-loading-row']")).not.toBeNull();

    Object.defineProperties(loadingViewport, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, value: 900, writable: true },
    });

    act(() => {
      loadingViewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    expect(onLoadMore).toHaveBeenCalledTimes(0);

    act(() => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;

    const exhaustedElement = renderTableElement(
      <CominsTable
        columns={columns}
        data={manyRows.slice(0, 20)}
        data-testid="infinite-scroll-viewport"
        getRowId={(row) => row.id}
        hasMoreRows={false}
        infiniteScroll
        onLoadMore={onLoadMore}
        pagination={{ pageIndex: 0, pageSize: 20 }}
      />,
    );
    const exhaustedViewport = exhaustedElement.querySelector<HTMLElement>("[data-testid='infinite-scroll-viewport']")!;

    Object.defineProperties(exhaustedViewport, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, value: 900, writable: true },
    });

    act(() => {
      exhaustedViewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    expect(onLoadMore).toHaveBeenCalledTimes(0);
  });

  it("requests initial lazy rows while rendering only controlled data and loading state", async () => {
    let resolveLazyLoad: (() => void) | undefined;
    const onLazyLoad = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveLazyLoad = () => resolve();
        }),
    );
    const renderLazyTable = (data: readonly PersonRow[], loading: boolean) => (
      <CominsTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        lazyLoad
        lazyLoadBatchSize={2}
        loading={loading}
        onLazyLoad={onLazyLoad}
        pagination={{ pageIndex: 0, pageSize: 2 }}
        skeletonRowCount={2}
      />
    );
    const element = renderTableElement(renderLazyTable([], true));

    expect(onLazyLoad).toHaveBeenCalledTimes(1);
    expect(onLazyLoad).toHaveBeenLastCalledWith(
      expect.objectContaining({ limit: 2, offset: 0, reason: "initial" }),
    );
    expect(onLazyLoad.mock.calls[0]?.[0].signal).toBeInstanceOf(AbortSignal);
    expect(element.querySelectorAll("[data-testid='loading-skeleton-row']")).toHaveLength(2);

    await act(async () => {
      resolveLazyLoad?.();
    });

    expect(element.querySelector("[data-testid='row-a']")).toBeNull();

    act(() => {
      root?.render(renderLazyTable(rows, false));
    });

    expect(element.querySelector("[data-testid='row-a']")).not.toBeNull();
    expect(element.querySelector("[data-testid='row-b']")).not.toBeNull();
    expect(element.querySelector("[data-testid='loading-skeleton-row']")).toBeNull();
  });

  it("does not restart the initial lazy request when an inline callback changes identity", () => {
    const onLazyLoad = vi.fn();

    function InlineLazyTable() {
      const [revision, setRevision] = useState(0);

      return (
        <CominsTable
          columns={columns}
          data={[]}
          getRowId={(row) => row.id}
          lazyLoad
          onLazyLoad={(request) => {
            onLazyLoad(request);

            if (revision === 0) {
              setRevision(1);
            }
          }}
          pagination={{ pageIndex: 0, pageSize: 2 }}
        />
      );
    }

    renderTableElement(<InlineLazyTable />);

    expect(onLazyLoad).toHaveBeenCalledTimes(1);
    expect(onLazyLoad).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 0, reason: "initial" }),
    );
    expect(onLazyLoad.mock.calls[0]?.[0].signal.aborted).toBe(false);
  });

  it("requests controlled lazy appends with data length offsets and blocks duplicates while pending", async () => {
    let resolveInitial: (() => void) | undefined;
    let resolveAppend: (() => void) | undefined;
    const onLazyLoad = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveInitial = () => resolve();
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveAppend = () => resolve();
          }),
      );
    const renderLazyTable = (
      data: readonly PersonRow[],
      options: { hasMoreRows: boolean; loading: boolean; loadingMore: boolean },
    ) => (
      <CominsTable
        columns={columns}
        data={data}
        data-testid="lazy-load-viewport"
        getRowId={(row) => row.id}
        hasMoreRows={options.hasMoreRows}
        lazyLoad
        lazyLoadBatchSize={2}
        lazyLoadThreshold={80}
        loading={options.loading}
        loadingMore={options.loadingMore}
        onLazyLoad={onLazyLoad}
        pagination={{ pageIndex: 0, pageSize: 4 }}
      />
    );
    const element = renderTableElement(
      renderLazyTable([], { hasMoreRows: true, loading: true, loadingMore: false }),
    );

    await act(async () => {
      resolveInitial?.();
    });
    act(() => {
      root?.render(renderLazyTable(rows, { hasMoreRows: true, loading: false, loadingMore: false }));
    });

    const viewport = element.querySelector<HTMLElement>("[data-testid='lazy-load-viewport']")!;
    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, value: 650, writable: true },
    });

    act(() => {
      viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    act(() => {
      viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    expect(onLazyLoad).toHaveBeenCalledTimes(2);
    expect(onLazyLoad).toHaveBeenLastCalledWith(
      expect.objectContaining({ limit: 2, offset: 2, reason: "scroll" }),
    );
    act(() => {
      root?.render(renderLazyTable(rows, { hasMoreRows: true, loading: false, loadingMore: true }));
    });
    expect(element.querySelector("[data-testid='data-table-infinite-loading-row']")).not.toBeNull();

    await act(async () => {
      resolveAppend?.();
    });
    act(() => {
      root?.render(
        renderLazyTable(
          [...rows, { age: 27, id: "c", name: "Gamma" }, { age: 24, id: "d", name: "Delta" }],
          { hasMoreRows: false, loading: false, loadingMore: false },
        ),
      );
    });

    expect(element.querySelector("[data-testid='row-c']")).not.toBeNull();
    expect(element.querySelector("[data-testid='row-d']")).not.toBeNull();
    expect(element.querySelector("[data-testid='data-table-infinite-loading-row']")).toBeNull();
  });

  it("aborts pending lazy load requests on unmount and ignores stale results", async () => {
    let capturedSignal: AbortSignal | undefined;
    let resolveLazyLoad: (() => void) | undefined;
    const onLazyLoad = vi.fn(
      ({ signal }) =>
        new Promise<void>((resolve) => {
          capturedSignal = signal;
          resolveLazyLoad = () => resolve();
        }),
    );
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={[]}
        getRowId={(row) => row.id}
        lazyLoad
        onLazyLoad={onLazyLoad}
        pagination={{ pageIndex: 0, pageSize: 2 }}
      />,
    );

    expect(onLazyLoad).toHaveBeenCalledTimes(1);

    act(() => root?.unmount());
    root = undefined;

    expect(capturedSignal?.aborted).toBe(true);

    await act(async () => {
      resolveLazyLoad?.();
    });

    expect(element.querySelector("[data-testid='row-a']")).toBeNull();
  });

  it("notifies onChangeData when internal interactions mutate data", () => {
    const onChangeData = vi.fn();
    const element = renderTableElement(
      <CominsTable
        columns={apiColumns}
        data={apiRows}
        getRowId={(row) => row.id}
        onChangeData={onChangeData}
      />,
    );
    const cells = element.querySelectorAll("tbody td");

    pressControlKey(cells[2]!, "c");
    pressControlKey(cells[0]!, "v");

    expect(onChangeData).toHaveBeenCalledWith([
      { age: 31, id: "a", name: "Beta", profile: { age: 31 } },
      { age: 42, id: "b", name: "Beta", profile: { age: 42 } },
    ]);
    expect(element.querySelector("[data-testid='cell-a-name']")?.textContent).toBe("Beta");
  });

  it("renders from data prop as the primary external state source", () => {
    const element = renderTableElement(
      <CominsTable columns={columns} data={rows} getRowId={(row) => row.id} />,
    );

    expect(element.querySelector("[data-testid='cell-a-name']")?.textContent).toBe("Alpha");
    expect(element.querySelector("[data-testid='cell-b-age']")?.textContent).toBe("42");
  });

  it("keeps every controlled Row visible when data grows without pagination", () => {
    const renderControlledRows = (data: readonly PersonRow[]) => (
      <CominsTable columns={columns} data={data} getRowId={(row) => row.id} />
    );
    const element = renderTableElement(renderControlledRows(rows));

    act(() => root?.render(renderControlledRows(threeRows)));

    expect(element.querySelectorAll("tr[data-comins-row-data-index]")).toHaveLength(3);
    expect(element.querySelector("[data-testid='row-c']")).not.toBeNull();
  });

  it("notifies onChangeData when internal interactions mutate controlled data", () => {
    const onChangeData = vi.fn();
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        onChangeData={onChangeData}
      />,
    );
    const cells = element.querySelectorAll("tbody td");

    pressControlKey(cells[2]!, "c");
    pressControlKey(cells[0]!, "v");

    expect(onChangeData).toHaveBeenCalledWith([
      { age: 31, id: "a", name: "Beta" },
      { age: 42, id: "b", name: "Beta" },
    ]);
  });

  it("copies and pastes a full row with Ctrl+C and Ctrl+V", () => {
    const element = renderTable({ pagination: { pageIndex: 0, pageSize: 10 } });
    const bodyRows = element.querySelectorAll("tbody tr");

    pressControlKey(bodyRows[0]!, "c");
    pressControlKey(bodyRows[1]!, "v");

    const updatedBodyRows = element.querySelectorAll("tbody tr");

    expect(updatedBodyRows).toHaveLength(3);
    expect(updatedBodyRows[2]?.querySelector("td")?.textContent).toBe("Alpha");
  });

  it("copies and pastes a cell with Ctrl+C and Ctrl+V", () => {
    const element = renderTable();
    const cells = element.querySelectorAll("tbody td");

    pressControlKey(cells[2]!, "c");
    pressControlKey(cells[0]!, "v");

    expect(element.querySelector("tbody td")?.textContent).toBe("Beta");
  });

  it("does not notify column layout changes for row copy-paste updates", () => {
    const onChangeColumnLayout = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <CominsTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          onChangeColumnLayout={onChangeColumnLayout}
        />,
      );
    });

    const bodyRows = container.querySelectorAll("tbody tr");
    pressControlKey(bodyRows[0]!, "c");
    pressControlKey(bodyRows[1]!, "v");

    expect(onChangeColumnLayout).not.toHaveBeenCalled();
  });

  it("does not notify column layout changes for an invalid cross-group child drop", () => {
    const onChangeColumnLayout = vi.fn();
    const groupedColumns = [
      { field: "name", label: "Name" },
      { field: "age", label: "Age", sort: true },
      { field: "profile.age", label: "Profile Age" },
    ] as const;
    const element = renderTableElement(
      <CominsTable
        columnGroups={[{ children: ["name", "age"], id: "profile", label: "Profile" }]}
        columns={groupedColumns}
        data={apiRows}
        getRowId={(row) => row.id}
        onChangeColumnLayout={onChangeColumnLayout}
      />,
    );
    const source = element.querySelector<HTMLElement>("[data-testid='header-age']");
    const invalidTarget = element.querySelector<HTMLElement>("[data-testid='header-profile.age']");
    const originalElementFromPoint = document.elementFromPoint;

    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => invalidTarget),
    });

    try {
      act(() => {
        source?.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
        window.dispatchEvent(
          createMousePointerEvent("pointermove", { bubbles: true, button: 0, clientX: 16, clientY: 10 }),
        );
        window.dispatchEvent(
          createMousePointerEvent("pointerup", { bubbles: true, button: 0, clientX: 30, clientY: 10 }),
        );
      });
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }

    expect(onChangeColumnLayout).not.toHaveBeenCalled();
  });

  it("makes interactive custom Header content inert during Column Move and restores it after cancellation", () => {
    const onAction = vi.fn();
    const onFocus = vi.fn();
    const headerRenderer = vi.fn(() => (
      <span>
        <button onClick={onAction} onKeyDown={onAction} type="button">
          Custom Age Header
        </button>
        <input aria-label="Custom Age input" onFocus={onFocus} />
      </span>
    ));
    const element = renderTableElement(
      <CominsTable
        columns={[
          { field: "name", label: "Name" },
          { field: "age", header: { renderer: headerRenderer }, label: "Age", sort: true },
        ]}
        data={rows}
        getRowId={(row) => row.id}
      />,
    );
    const ageHeader = element.querySelector<HTMLElement>("[data-testid='header-age']")!;
    const customButton = ageHeader.querySelector<HTMLButtonElement>("button")!;
    const customInput = ageHeader.querySelector<HTMLInputElement>("input")!;
    const originalElementFromPoint = document.elementFromPoint;

    customButton.focus();
    expect(document.activeElement).toBe(customButton);
    headerRenderer.mockClear();

    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => ageHeader),
    });

    try {
      act(() => {
        ageHeader.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
        window.dispatchEvent(
          createMousePointerEvent("pointermove", { bubbles: true, button: 0, clientX: 16, clientY: 10 }),
        );
      });
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }

    const placeholderLabel = ageHeader.querySelector<HTMLElement>(".comins-column-placeholder-label");
    const headerContent = ageHeader.querySelector<HTMLElement>(".comins-table__header-content")!;

    expect(ageHeader.getAttribute("data-column-placeholder")).toBe("true");
    expect(ageHeader.getAttribute("tabindex")).toBeNull();
    expect(ageHeader.getAttribute("aria-label")).toBe("Age");
    expect(ageHeader.getAttribute("aria-labelledby")).toBeNull();
    expect(headerContent.hasAttribute("inert")).toBe(true);
    expect(headerContent.getAttribute("aria-hidden")).toBe("true");
    expect(placeholderLabel?.textContent).toBe("Age");
    expect(placeholderLabel?.getAttribute("aria-hidden")).toBe("true");
    expect(placeholderLabel?.querySelector("button, input")).toBeNull();
    expect(customButton.textContent).toBe("Custom Age Header");
    expect(headerRenderer).not.toHaveBeenCalled();

    act(() => {
      customInput.focus();
      customButton.click();
      customButton.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
      customButton.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: " " }));
    });

    expect(document.activeElement).not.toBe(customInput);
    expect(onFocus).not.toHaveBeenCalled();
    expect(onAction).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    });

    expect(ageHeader.getAttribute("data-column-placeholder")).toBeNull();
    expect(ageHeader.getAttribute("tabindex")).toBe("0");
    expect(ageHeader.getAttribute("aria-label")).toBeNull();
    expect(headerContent.hasAttribute("inert")).toBe(false);
    expect(headerContent.getAttribute("aria-hidden")).toBeNull();

    act(() => {
      customInput.focus();
      customButton.click();
      customButton.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
      customButton.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: " " }));
    });

    expect(document.activeElement).toBe(customInput);
    expect(onFocus).toHaveBeenCalledOnce();
    expect(onAction).toHaveBeenCalledTimes(3);
  });

  it("shows immediate move handles only for unlocked headers and keeps whole-header drag optional", () => {
    const element = renderTableElement(
      <CominsTable
        columnGroups={[
          { children: ["name"], id: "identity", label: "Identity" },
          { children: ["age"], id: "metrics", label: "Metrics", lockPosition: true },
        ]}
        columns={[
          { field: "name", label: "Name" },
          { field: "age", label: "Age", lockPosition: true },
        ]}
        data={rows}
        getRowId={(row) => row.id}
      />,
    );
    const nameHeader = element.querySelector<HTMLElement>("[data-testid='header-name']")!;
    const nameHandle = element.querySelector<HTMLElement>("[data-testid='column-move-handle-name']")!;

    expect(nameHandle).not.toBeNull();
    expect(element.querySelector("[data-testid='column-move-handle-age']")).toBeNull();
    expect(element.querySelector("[data-testid='column-group-move-handle-identity']")).not.toBeNull();
    expect(element.querySelector("[data-testid='column-group-move-handle-metrics']")).toBeNull();

    act(() => {
      nameHandle.dispatchEvent(
        createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
      );
    });

    expect(nameHeader.getAttribute("data-column-placeholder")).toBe("true");

    act(() => {
      window.dispatchEvent(createMousePointerEvent("pointercancel", { bubbles: true, pointerType: "mouse" }));
    });

    act(() => {
      root?.render(
        <CominsTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          showColumnMoveHandle={false}
        />,
      );
    });

    expect(element.querySelector("[data-testid^='column-move-handle-']")).toBeNull();
    expect(element.querySelector("[data-testid='header-name']")).not.toBeNull();
  });

  it("keeps the built-in Header controls visible at the minimum column width", () => {
    const element = renderTableElement(
      <CominsTable
        columns={[
          { field: "name", label: "Name", sort: true, width: 20 },
          { field: "age", label: "Age", sort: true, width: 20 },
        ]}
        data={rows}
        getRowId={(row) => row.id}
      />,
    );
    const columnsAtMinimum = element.querySelectorAll<HTMLTableColElement>(".comins-table__header-table col");

    expect(columnsAtMinimum[0]?.style.width).toBe("88px");
    expect(columnsAtMinimum[1]?.style.width).toBe("88px");
  });

  it("uses side-effect-free plain text for rich column and group placeholders with stable id fallback", () => {
    const onLabelAction = vi.fn();
    const IgnoredColumnLabel = vi.fn(() => <button type="button">Ignored column component</button>);
    const IgnoredGroupLabel = vi.fn(() => <button type="button">Ignored group component</button>);
    const element = renderTableElement(
      <CominsTable
        columnGroups={[
          {
            children: ["name", "age"],
            id: "profile",
            label: [
              "Profile ",
              <span key="text">Group</span>,
              " ",
              <button key="button" onClick={onLabelAction} type="button">
                action
              </button>,
              <input key="input" aria-label="Profile label input" onInput={onLabelAction} />,
              <IgnoredGroupLabel key="custom" />,
            ],
          },
        ]}
        columns={[
          { field: "name", label: <IgnoredColumnLabel /> },
          {
            field: "age",
            label: [
              "Age ",
              <strong key="text">Years</strong>,
              " ",
              <button key="button" onClick={onLabelAction} type="button">
                action
              </button>,
              <input key="input" aria-label="Age label input" onInput={onLabelAction} />,
            ],
          },
        ]}
        data={rows}
        getRowId={(row) => row.id}
      />,
    );
    const groupHeader = element.querySelector<HTMLElement>("[data-testid='header-group-profile']")!;
    const nameHeader = element.querySelector<HTMLElement>("[data-testid='header-name']")!;
    const ageHeader = element.querySelector<HTMLElement>("[data-testid='header-age']")!;
    const originalElementFromPoint = document.elementFromPoint;

    IgnoredColumnLabel.mockClear();
    IgnoredGroupLabel.mockClear();
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => groupHeader),
    });

    try {
      act(() => {
        groupHeader.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
        window.dispatchEvent(
          createMousePointerEvent("pointermove", { bubbles: true, button: 0, clientX: 18, clientY: 10 }),
        );
      });
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }

    expect(groupHeader.getAttribute("aria-label")).toBe("Profile Group action");
    expect(nameHeader.getAttribute("aria-label")).toBe("name");
    expect(ageHeader.getAttribute("aria-label")).toBe("Age Years action");
    expect(groupHeader.querySelector(".comins-column-placeholder-label")?.textContent).toBe("Profile Group action");
    expect(nameHeader.querySelector(".comins-column-placeholder-label")?.textContent).toBe("name");
    expect(ageHeader.querySelector(".comins-column-placeholder-label")?.textContent).toBe("Age Years action");
    expect(element.querySelector("[data-testid='column-move-ghost']")?.textContent).toContain("Profile Group action");

    for (const header of [groupHeader, nameHeader, ageHeader]) {
      expect(header.querySelector(".comins-table__header-label button, .comins-table__header-label input")).toBeNull();
      expect(header.querySelector(".comins-column-placeholder-label button, .comins-column-placeholder-label input")).toBeNull();
    }
    expect(element.querySelector("[data-testid='column-move-ghost'] button, [data-testid='column-move-ghost'] input")).toBeNull();
    expect(IgnoredColumnLabel).not.toHaveBeenCalled();
    expect(IgnoredGroupLabel).not.toHaveBeenCalled();
    expect(onLabelAction).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    });

    const restoredAction = groupHeader.querySelector<HTMLButtonElement>(".comins-table__header-label button")!;
    act(() => restoredAction.click());
    expect(onLabelAction).toHaveBeenCalledOnce();
  });

  it("normalizes author Header naming during a move and restores it after cancellation", () => {
    const element = renderTableElement(
      <>
        <span id="author-age-label">Author referenced age</span>
        <CominsTable
          columns={[
            { field: "name", label: "Name" },
            {
              field: "age",
              header: { props: { "aria-label": "Author age", "aria-labelledby": "author-age-label" } },
              label: ["Age ", <strong key="plain">Plain</strong>],
              sort: true,
            },
          ]}
          data={rows}
          getRowId={(row) => row.id}
        />
      </>,
    );
    const ageHeader = element.querySelector<HTMLElement>("[data-testid='header-age']")!;
    const originalElementFromPoint = document.elementFromPoint;

    expect(ageHeader.getAttribute("aria-label")).toBe("Author age");
    expect(ageHeader.getAttribute("aria-labelledby")).toBe("author-age-label");
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => ageHeader),
    });

    try {
      act(() => {
        ageHeader.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
        window.dispatchEvent(
          createMousePointerEvent("pointermove", { bubbles: true, button: 0, clientX: 18, clientY: 10 }),
        );
      });
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }

    expect(ageHeader.getAttribute("aria-label")).toBe("Age Plain");
    expect(ageHeader.getAttribute("aria-labelledby")).toBeNull();

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    });

    expect(ageHeader.getAttribute("aria-label")).toBe("Author age");
    expect(ageHeader.getAttribute("aria-labelledby")).toBe("author-age-label");
  });

  it("blocks built-in Header input and change actions while a group moves and restores them after pointer cancel", () => {
    const onSelectInput = vi.fn();
    const onCheckboxInput = vi.fn();
    const onRadioInput = vi.fn();
    const onSelectChange = vi.fn();
    const onCheckboxChange = vi.fn();
    const onRadioChange = vi.fn();
    const element = renderTableElement(
      <CominsTable
        columnGroups={[{ children: ["select", "checkbox", "radio"], id: "controls", label: "Controls" }]}
        columns={[
          {
            field: "name",
            header: {
              components: [
                {
                  onValueChange: onSelectChange,
                  options: [
                    { label: "Owner", value: "Owner" },
                    { label: "Editor", value: "Editor" },
                  ],
                  props: { "aria-label": "Header select", onInput: onSelectInput, value: "Owner" },
                  type: "select",
                },
              ],
            },
            id: "select",
            label: "Select",
          },
          {
            field: "age",
            header: {
              components: [
                {
                  onCheckedChange: onCheckboxChange,
                  props: { "aria-label": "Header checkbox", checked: false, onInput: onCheckboxInput },
                  type: "checkbox",
                },
              ],
            },
            id: "checkbox",
            label: "Checkbox",
          },
          {
            field: "name",
            header: {
              components: [
                {
                  onValueChange: onRadioChange,
                  options: [
                    { label: "Owner", value: "Owner" },
                    { label: "Editor", value: "Editor" },
                  ],
                  props: { "aria-label": "Header radio", onInput: onRadioInput, value: "Owner" },
                  type: "radio",
                },
              ],
            },
            id: "radio",
            label: "Radio",
          },
        ]}
        data={rows}
        getRowId={(row) => row.id}
      />,
    );
    const groupHeader = element.querySelector<HTMLElement>("[data-testid='header-group-controls']")!;
    const select = element.querySelector<HTMLSelectElement>("[aria-label='Header select']")!;
    const checkbox = element.querySelector<HTMLInputElement>("[aria-label='Header checkbox']")!;
    const radio = element.querySelector<HTMLInputElement>("[aria-label='Header radio'] input[value='Editor']")!;
    const originalElementFromPoint = document.elementFromPoint;

    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => groupHeader),
    });

    try {
      act(() => {
        groupHeader.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
        window.dispatchEvent(
          createMousePointerEvent("pointermove", { bubbles: true, button: 0, clientX: 18, clientY: 10 }),
        );
      });
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }

    act(() => {
      select.value = "Editor";
      select.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertReplacementText" }));
      select.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
      checkbox.checked = true;
      checkbox.dispatchEvent(new InputEvent("input", { bubbles: true }));
      checkbox.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
      radio.checked = true;
      radio.dispatchEvent(new InputEvent("input", { bubbles: true }));
      radio.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    });

    expect(onSelectInput).not.toHaveBeenCalled();
    expect(onCheckboxInput).not.toHaveBeenCalled();
    expect(onRadioInput).not.toHaveBeenCalled();
    expect(onSelectChange).not.toHaveBeenCalled();
    expect(onCheckboxChange).not.toHaveBeenCalled();
    expect(onRadioChange).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(createMousePointerEvent("pointercancel", { bubbles: true, pointerType: "mouse" }));
    });

    expect(groupHeader.getAttribute("data-column-placeholder")).toBeNull();
    act(() => {
      select.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertReplacementText" }));
      select.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
      checkbox.dispatchEvent(new InputEvent("input", { bubbles: true }));
      radio.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    expect(onSelectInput).toHaveBeenCalledOnce();
    expect(onCheckboxInput).toHaveBeenCalledOnce();
    expect(onRadioInput).toHaveBeenCalledOnce();
    expect(onSelectChange).toHaveBeenCalledOnce();
  });

  it("refreshes moved Header content after its column is hidden then restored", () => {
    let renderCount = 0;
    const headerRenderer = vi.fn(() => {
      renderCount += 1;
      return <strong>{`Age Header ${renderCount}`}</strong>;
    });
    const tableRef = createRef<CominsTableRef<PersonRow>>();
    const element = renderTableElement(
      <CominsTable
        columns={[
          { field: "name", label: "Name" },
          { field: "age", header: { renderer: headerRenderer }, label: "Age", sort: true },
        ]}
        data={rows}
        getRowId={(row) => row.id}
        ref={tableRef}
      />,
    );
    const ageHeader = element.querySelector<HTMLElement>("[data-testid='header-age']")!;
    const originalElementFromPoint = document.elementFromPoint;

    headerRenderer.mockClear();

    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => ageHeader),
    });

    try {
      act(() => {
        ageHeader.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
        window.dispatchEvent(
          createMousePointerEvent("pointermove", { bubbles: true, button: 0, clientX: 16, clientY: 10 }),
        );
      });
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }

    act(() => {
      tableRef.current?.setColumnLayout({ columns: { age: { hidden: true } } });
    });

    expect(element.querySelector("[data-testid='header-age']")).toBeNull();

    act(() => {
      tableRef.current?.setColumnLayout({ columns: { age: { hidden: false } } });
    });

    const restoredAgeHeader = element.querySelector<HTMLElement>("[data-testid='header-age']")!;

    expect(restoredAgeHeader.getAttribute("data-column-placeholder")).toBe("true");
    expect(restoredAgeHeader.querySelector("strong")?.textContent).toBe("Age Header 2");
    expect(headerRenderer).toHaveBeenCalledTimes(1);
  });

  it("updates custom Header content when its renderer changes during Column Move", () => {
    const firstHeaderRenderer = vi.fn(() => <strong>First Age Header</strong>);
    const secondHeaderRenderer = vi.fn(() => <strong>Second Age Header</strong>);
    const element = renderTableElement(
      <CominsTable
        columns={[
          { field: "name", label: "Name" },
          { field: "age", header: { renderer: firstHeaderRenderer }, label: "Age", sort: true },
        ]}
        data={rows}
        getRowId={(row) => row.id}
      />,
    );
    const ageHeader = element.querySelector<HTMLElement>("[data-testid='header-age']")!;
    const originalElementFromPoint = document.elementFromPoint;

    firstHeaderRenderer.mockClear();

    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => ageHeader),
    });

    try {
      act(() => {
        ageHeader.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
        window.dispatchEvent(
          createMousePointerEvent("pointermove", { bubbles: true, button: 0, clientX: 16, clientY: 10 }),
        );
      });
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }

    act(() => {
      root?.render(
        <CominsTable
          columns={[
            { field: "name", label: "Name" },
            { field: "age", header: { renderer: secondHeaderRenderer }, label: "Age", sort: true },
          ]}
          data={rows}
          getRowId={(row) => row.id}
        />,
      );
    });

    const updatedAgeHeader = element.querySelector<HTMLElement>("[data-testid='header-age']")!;

    expect(updatedAgeHeader.getAttribute("data-column-placeholder")).toBe("true");
    expect(updatedAgeHeader.querySelector("strong")?.textContent).toBe("Second Age Header");
    expect(firstHeaderRenderer).not.toHaveBeenCalled();
    expect(secondHeaderRenderer).toHaveBeenCalledTimes(1);
  });

  it("renders custom Header content added during active Column Move", () => {
    const headerRenderer = vi.fn(() => <strong>Added Age Header</strong>);
    const element = renderTableElement(
      <CominsTable
        columns={[
          { field: "name", label: "Name" },
          { field: "age", label: "Age", sort: true },
        ]}
        data={rows}
        getRowId={(row) => row.id}
      />,
    );
    const ageHeader = element.querySelector<HTMLElement>("[data-testid='header-age']")!;
    const originalElementFromPoint = document.elementFromPoint;

    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => ageHeader),
    });

    try {
      act(() => {
        ageHeader.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
        window.dispatchEvent(
          createMousePointerEvent("pointermove", { bubbles: true, button: 0, clientX: 16, clientY: 10 }),
        );
      });
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }

    act(() => {
      root?.render(
        <CominsTable
          columns={[
            { field: "name", label: "Name" },
            { field: "age", header: { renderer: headerRenderer }, label: "Age", sort: true },
          ]}
          data={rows}
          getRowId={(row) => row.id}
        />,
      );
    });

    const updatedAgeHeader = element.querySelector<HTMLElement>("[data-testid='header-age']")!;

    expect(updatedAgeHeader.getAttribute("data-column-placeholder")).toBe("true");
    expect(updatedAgeHeader.querySelector("strong")?.textContent).toBe("Added Age Header");
    expect(headerRenderer).toHaveBeenCalledTimes(1);
  });

  it("clears removed custom Header content before conditionally adding the renderer during Column Move", () => {
    let renderCount = 0;
    const headerRenderer = vi.fn(() => {
      renderCount += 1;
      return <strong>{`Age Header ${renderCount}`}</strong>;
    });
    const element = renderTableElement(
      <CominsTable
        columns={[
          { field: "name", label: "Name" },
          { field: "age", header: { renderer: headerRenderer }, label: "Age", sort: true },
        ]}
        data={rows}
        getRowId={(row) => row.id}
      />,
    );
    const ageHeader = element.querySelector<HTMLElement>("[data-testid='header-age']")!;
    const originalElementFromPoint = document.elementFromPoint;

    headerRenderer.mockClear();

    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => ageHeader),
    });

    try {
      act(() => {
        ageHeader.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
        window.dispatchEvent(
          createMousePointerEvent("pointermove", { bubbles: true, button: 0, clientX: 16, clientY: 10 }),
        );
      });
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }

    act(() => {
      root?.render(
        <CominsTable
          columns={[
            { field: "name", label: "Name" },
            { field: "age", label: "Age", sort: true },
          ]}
          data={rows}
          getRowId={(row) => row.id}
        />,
      );
    });

    const removedRendererHeader = element.querySelector<HTMLElement>("[data-testid='header-age']")!;

    expect(removedRendererHeader.querySelector("strong")).toBeNull();
    expect(removedRendererHeader.querySelector(".comins-table__header-label")?.textContent).toBe("");
    expect(removedRendererHeader.querySelector(".comins-column-placeholder-label")?.textContent).toBe("Age");

    act(() => {
      root?.render(
        <CominsTable
          columns={[
            { field: "name", label: "Name" },
            { field: "age", header: { renderer: headerRenderer }, label: "Age", sort: true },
          ]}
          data={rows}
          getRowId={(row) => row.id}
        />,
      );
    });

    const restoredRendererHeader = element.querySelector<HTMLElement>("[data-testid='header-age']")!;

    expect(restoredRendererHeader.getAttribute("data-column-placeholder")).toBe("true");
    expect(restoredRendererHeader.querySelector("strong")?.textContent).toBe("Age Header 2");
    expect(headerRenderer).toHaveBeenCalledTimes(1);
  });

  it("clears removed custom Header preservation before restoring the same column during Column Move", () => {
    let renderCount = 0;
    const headerRenderer = vi.fn(() => {
      renderCount += 1;
      return <strong>{`Age Header ${renderCount}`}</strong>;
    });
    const element = renderTableElement(
      <CominsTable
        columns={[
          { field: "name", label: "Name" },
          { field: "age", header: { renderer: headerRenderer }, label: "Age", sort: true },
        ]}
        data={rows}
        getRowId={(row) => row.id}
      />,
    );
    const ageHeader = element.querySelector<HTMLElement>("[data-testid='header-age']")!;
    const originalElementFromPoint = document.elementFromPoint;

    headerRenderer.mockClear();

    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => ageHeader),
    });

    try {
      act(() => {
        ageHeader.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
        window.dispatchEvent(
          createMousePointerEvent("pointermove", { bubbles: true, button: 0, clientX: 16, clientY: 10 }),
        );
      });
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }

    act(() => {
      root?.render(
        <CominsTable
          columns={[{ field: "name", label: "Name" }]}
          data={rows}
          getRowId={(row) => row.id}
        />,
      );
    });

    expect(element.querySelector("[data-testid='header-age']")).toBeNull();

    act(() => {
      root?.render(
        <CominsTable
          columns={[
            { field: "name", label: "Name" },
            { field: "age", header: { renderer: headerRenderer }, label: "Age", sort: true },
          ]}
          data={rows}
          getRowId={(row) => row.id}
        />,
      );
    });

    const restoredAgeHeader = element.querySelector<HTMLElement>("[data-testid='header-age']")!;

    expect(restoredAgeHeader.getAttribute("data-column-placeholder")).toBe("true");
    expect(restoredAgeHeader.querySelector("strong")?.textContent).toBe("Age Header 2");
    expect(headerRenderer).toHaveBeenCalledTimes(1);
  });

  it("renders parent and child plain labels while a Column Group moves", () => {
    const element = renderTableElement(
      <CominsTable
        columnGroups={[{ children: ["name", "age"], id: "profile", label: "Profile" }]}
        columns={[
          { field: "name", label: "Name" },
          { field: "age", label: "Age", sort: true },
        ]}
        data={rows}
        getRowId={(row) => row.id}
      />,
    );
    const profileHeader = element.querySelector<HTMLElement>("[data-testid='header-group-profile']")!;
    const originalElementFromPoint = document.elementFromPoint;

    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => profileHeader),
    });

    try {
      act(() => {
        profileHeader.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
        window.dispatchEvent(
          createMousePointerEvent("pointermove", { bubbles: true, button: 0, clientX: 16, clientY: 10 }),
        );
      });
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }

    expect(
      element.querySelector<HTMLElement>("[data-testid='header-group-profile'] .comins-column-placeholder-label")?.textContent,
    ).toBe("Profile");
    expect(
      element.querySelector<HTMLElement>("[data-testid='header-name'] .comins-column-placeholder-label")?.textContent,
    ).toBe("Name");
    expect(
      element.querySelector<HTMLElement>("[data-testid='header-age'] .comins-column-placeholder-label")?.textContent,
    ).toBe("Age");
  });

  it("marks clicked rows and cells as selected", () => {
    const element = renderTable();
    const bodyRows = element.querySelectorAll("tbody tr");
    const cells = element.querySelectorAll("tbody td");

    act(() => {
      bodyRows[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(bodyRows[1]?.getAttribute("aria-selected")).toBe("true");

    act(() => {
      cells[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(cells[0]?.getAttribute("data-selected")).toBe("true");
  });

  it("renders no initial selection and visibly selects the row when a cell is clicked", () => {
    const element = renderTable({ data: threeRows });
    const rowA = element.querySelector("[data-testid='row-a']")!;
    const cellA = element.querySelector("[data-testid='cell-a-name']")!;

    expect(rowA.getAttribute("data-selected-row")).toBeNull();
    expect(cellA.getAttribute("data-selected")).toBeNull();

    act(() => {
      cellA.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(rowA.getAttribute("data-selected-row")).toBe("true");
    expect(rowA.className).toContain("comins-row-selected");
    expect(cellA.getAttribute("data-selected")).toBe("true");
  });

  it("disables cell selection style while preserving cell callbacks and row selection", () => {
    const onClickCell = vi.fn();
    const element = renderTable({ cellSelection: false, onClickCell });
    const rowA = element.querySelector("[data-testid='row-a']")!;
    const cellA = element.querySelector("[data-testid='cell-a-name']")!;

    act(() => {
      cellA.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onClickCell).toHaveBeenCalledOnce();
    expect(rowA.getAttribute("data-selected-row")).toBe("true");
    expect(cellA.getAttribute("data-selected")).toBeNull();
    expect(cellA.getAttribute("data-range-selected")).toBeNull();
  });

  it("supports Ctrl/Cmd row toggles, Shift row ranges, sort-stable selection, and data replacement reset", () => {
    const onChangeSelection = vi.fn();
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={threeRows}
        getRowId={(row) => row.id}
        onChangeSelection={onChangeSelection}
      />,
    );
    const rowA = element.querySelector("[data-testid='row-a']")!;
    const rowB = element.querySelector("[data-testid='row-b']")!;
    const rowC = element.querySelector("[data-testid='row-c']")!;
    const ageHeader = element.querySelector("[data-testid='header-age']")!;

    act(() => {
      rowB.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      rowA.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
      rowC.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }));
    });

    expect(rowA.getAttribute("data-selected-row")).toBe("true");
    expect(rowB.getAttribute("data-selected-row")).toBe("true");
    expect(rowC.getAttribute("data-selected-row")).toBe("true");
    expect(onChangeSelection).toHaveBeenLastCalledWith(expect.objectContaining({ rowIds: ["a", "b", "c"] }));

    act(() => {
      ageHeader.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(element.querySelector("[data-testid='row-a']")?.getAttribute("data-selected-row")).toBe("true");
    expect(element.querySelector("[data-testid='row-b']")?.getAttribute("data-selected-row")).toBe("true");
    expect(element.querySelector("[data-testid='row-c']")?.getAttribute("data-selected-row")).toBe("true");

    act(() => {
      root?.render(
        <CominsTable
          columns={columns}
          data={[{ age: 50, id: "z", name: "Zeta" }]}
          getRowId={(row) => row.id}
          onChangeSelection={onChangeSelection}
        />,
      );
    });

    expect(element.querySelector("[data-testid='row-z']")?.getAttribute("data-selected-row")).toBeNull();
  });

  it("selects a cell range with Shift+click", () => {
    const element = renderTable({ data: threeRows });
    const firstCell = element.querySelector("[data-testid='cell-a-name']")!;
    const focusCell = element.querySelector("[data-testid='cell-b-age']")!;

    act(() => {
      firstCell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      focusCell.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }));
    });

    expect(element.querySelector("[data-testid='cell-a-name']")?.getAttribute("data-range-selected")).toBe("true");
    expect(element.querySelector("[data-testid='cell-a-age']")?.getAttribute("data-range-selected")).toBe("true");
    expect(element.querySelector("[data-testid='cell-b-name']")?.getAttribute("data-range-selected")).toBe("true");
    expect(element.querySelector("[data-testid='cell-b-age']")?.getAttribute("data-range-selected")).toBe("true");
  });

  it("shows Ctrl/Cmd discontiguous Cell selection without losing Row multi-selection", () => {
    const onChangeSelection = vi.fn();
    const element = renderTable({ data: threeRows, onChangeSelection });
    const firstCell = element.querySelector("[data-testid='cell-a-name']")!;
    const secondCell = element.querySelector("[data-testid='cell-b-age']")!;

    act(() => {
      firstCell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      secondCell.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
    });

    expect(firstCell.getAttribute("data-selected")).toBe("true");
    expect(secondCell.getAttribute("data-selected")).toBe("true");
    expect(element.querySelector("[data-testid='row-a']")?.getAttribute("data-selected-row")).toBe("true");
    expect(element.querySelector("[data-testid='row-b']")?.getAttribute("data-selected-row")).toBe("true");
    expect(onChangeSelection).toHaveBeenLastCalledWith(expect.objectContaining({
      cell: { columnId: "age", rowId: "b" },
      cells: [
        { columnId: "name", rowId: "a" },
        { columnId: "age", rowId: "b" },
      ],
      range: null,
      rowIds: ["a", "b"],
    }));

    act(() => {
      firstCell.dispatchEvent(new MouseEvent("click", { bubbles: true, metaKey: true }));
    });

    expect(firstCell.getAttribute("data-selected")).toBeNull();
    expect(secondCell.getAttribute("data-selected")).toBe("true");
    expect(element.querySelector("[data-testid='row-a']")?.getAttribute("data-selected-row")).toBeNull();
    expect(element.querySelector("[data-testid='row-b']")?.getAttribute("data-selected-row")).toBe("true");
  });

  it("selects a cell range with mouse drag and copies/pastes the range", () => {
    const onChangeData = vi.fn();
    const element = renderTable({ data: threeRows, onChangeData });
    const anchorCell = element.querySelector("[data-testid='cell-a-name']")!;
    const focusCell = element.querySelector("[data-testid='cell-b-age']")!;
    const targetCell = element.querySelector("[data-testid='cell-b-name']")!;

    act(() => {
      anchorCell.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
      focusCell.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, button: 0, buttons: 1 }));
      focusCell.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0 }));
    });

    expect(element.querySelector("[data-testid='cell-b-age']")?.getAttribute("data-range-selected")).toBe("true");

    pressControlKey(anchorCell, "c");
    pressControlKey(targetCell, "v");

    expect(onChangeData).toHaveBeenLastCalledWith([
      { age: 31, id: "a", name: "Alpha" },
      { age: 31, id: "b", name: "Alpha" },
      { age: 42, id: "c", name: "Beta" },
    ]);
  });

  it("removes active global pointer listeners when unmounted during a cell range drag", () => {
    const element = renderTable({ data: threeRows });
    const anchorCell = element.querySelector("[data-testid='cell-a-name']")!;
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListener = vi.spyOn(window, "removeEventListener");

    try {
      act(() => {
        anchorCell.dispatchEvent(
          createMousePointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
        );
      });

      const activePointerListeners = addEventListener.mock.calls.filter(
        ([type]) => type === "pointermove" || type === "pointerup" || type === "pointercancel" || type === "blur",
      );
      expect(activePointerListeners).toHaveLength(4);

      act(() => root?.unmount());
      root = undefined;

      for (const listener of activePointerListeners) {
        expect(removeEventListener.mock.calls).toContainEqual(listener);
      }
    } finally {
      addEventListener.mockRestore();
      removeEventListener.mockRestore();
    }
  });

  it("routes row and cell context menu callbacks with precise payloads", () => {
    const onContextMenuCell = vi.fn();
    const onContextMenuRow = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <CominsTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          onContextMenuCell={onContextMenuCell}
          onContextMenuRow={onContextMenuRow}
        />,
      );
    });

    const bodyRows = container.querySelectorAll("tbody tr");
    const cells = container.querySelectorAll("tbody td");

    act(() => {
      bodyRows[1]?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
    });

    expect(onContextMenuRow).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 1,
        row: expect.objectContaining({ data: rows[1], id: "b", index: 1 }),
      }),
    );

    act(() => {
      cells[0]?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
    });

    expect(onContextMenuCell).toHaveBeenCalledWith(
      expect.objectContaining({
        column: expect.objectContaining({ id: "name", index: 0 }),
        index: 0,
        row: expect.objectContaining({ data: rows[0], id: "a", index: 0 }),
        value: "Alpha",
      }),
    );
    expect(onContextMenuRow).toHaveBeenCalledTimes(1);
  });

  it("preserves an existing row selection for row and cell context menus", () => {
    const onChangeSelection = vi.fn();
    const element = renderTable({
      data: threeRows,
      onChangeSelection,
      onContextMenuCell: vi.fn(),
      onContextMenuRow: vi.fn(),
    });
    const rowA = element.querySelector("[data-testid='row-a']")!;
    const rowB = element.querySelector("[data-testid='row-b']")!;
    const rowC = element.querySelector("[data-testid='row-c']")!;
    const cellB = element.querySelector("[data-testid='cell-b-name']")!;
    const cellC = element.querySelector("[data-testid='cell-c-name']")!;

    act(() => {
      rowA.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      rowB.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
      rowB.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
    });

    expect(onChangeSelection).toHaveBeenLastCalledWith(expect.objectContaining({ rowIds: ["a", "b"] }));
    expect(rowA.getAttribute("data-selected-row")).toBe("true");
    expect(rowB.getAttribute("data-selected-row")).toBe("true");

    act(() => {
      rowC.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
    });

    expect(onChangeSelection).toHaveBeenLastCalledWith(expect.objectContaining({ rowIds: ["c"] }));

    act(() => {
      rowA.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      rowB.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
      cellB.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
    });

    expect(onChangeSelection).toHaveBeenLastCalledWith(
      expect.objectContaining({ cell: { columnId: "name", rowId: "b" }, rowIds: ["a", "b"] }),
    );

    act(() => {
      cellC.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
    });

    expect(onChangeSelection).toHaveBeenLastCalledWith(
      expect.objectContaining({ cell: { columnId: "name", rowId: "c" }, rowIds: ["c"] }),
    );
  });

  it("formats cell values with the column format function", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <CominsTable
          columns={[
            {
              cell: {
                format: ({ value }) => `${String(value)} years`,
              },
              field: "age",
              id: "age",
              label: "Age",
            },
          ]}
          data={rows}
          getRowId={(row) => row.id}
        />,
      );
    });

    expect(container.querySelector("tbody td")?.textContent).toBe("31 years");
  });

  it("applies rowProps and blocks all interactions for disabled rows", () => {
    const onClickCell = vi.fn();
    const onClickRow = vi.fn();
    const onChangeData = vi.fn();
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        onChangeData={onChangeData}
        onClickCell={onClickCell}
        onClickRow={onClickRow}
        rowProps={{
          className: (row) => ({ "is-disabled-row": row.id === "a" }),
          disabled: (row) => row.id === "a",
          style: (row) => (row.id === "a" ? { color: "rgb(255, 0, 0)" } : undefined),
        }}
      />,
    );
    const disabledRow = element.querySelector("[data-testid='row-a']")!;
    const disabledCell = element.querySelector("[data-testid='cell-a-name']")!;
    const enabledCell = element.querySelector("[data-testid='cell-b-name']")!;

    expect(disabledRow.className).toContain("is-disabled-row");
    expect((disabledRow as HTMLElement).style.color).toBe("rgb(255, 0, 0)");

    act(() => {
      disabledCell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      disabledRow.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    pressControlKey(disabledCell, "c");
    pressControlKey(enabledCell, "v");

    expect(onClickCell).not.toHaveBeenCalled();
    expect(onClickRow).not.toHaveBeenCalled();
    expect(onChangeData).not.toHaveBeenCalled();
    expect(disabledCell.getAttribute("data-selected")).toBeNull();
  });

  it("applies column props and blocks disabled cell interactions", () => {
    const onClickCell = vi.fn();
    const element = renderTableElement(
      <CominsTable
        columns={[
          {
            field: "name",
            header: { props: { className: "name-header", title: "Name title" } },
            label: "Name",
            cell: {
              props: {
              className: ({ row }) => (row.id === "a" ? "blocked-cell" : "open-cell"),
              disabled: ({ row }) => row.id === "a",
              style: ({ row }) => (row.id === "a" ? { color: "rgb(0, 0, 255)" } : undefined),
              },
            },
          },
        ]}
        data={rows}
        getRowId={(row) => row.id}
        onClickCell={onClickCell}
      />,
    );
    const header = element.querySelector("[data-testid='header-name']")!;
    const blockedCell = element.querySelector("[data-testid='cell-a-name']")!;
    const openCell = element.querySelector("[data-testid='cell-b-name']")!;

    expect(header.className).toContain("name-header");
    expect(header.getAttribute("title")).toBe("Name title");
    expect(blockedCell.className).toContain("blocked-cell");
    expect((blockedCell as HTMLElement).style.color).toBe("rgb(0, 0, 255)");

    act(() => {
      blockedCell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      openCell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onClickCell).toHaveBeenCalledTimes(1);
    expect(onClickCell).toHaveBeenCalledWith(
      expect.objectContaining({
        row: expect.objectContaining({ id: "b", index: 1 }),
        value: "Beta",
      }),
    );
  });

  it("sorts through header click and reports sort changes", () => {
    const onChangeSort = vi.fn();
    const element = renderTableElement(
      <CominsTable columns={columns} data={threeRows} getRowId={(row) => row.id} onChangeSort={onChangeSort} />,
    );
    const ageHeader = element.querySelector("[data-testid='header-age']")!;

    act(() => {
      ageHeader.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onChangeSort).toHaveBeenLastCalledWith({ columnId: "age", direction: "asc" });
    expect([...element.querySelectorAll("tbody tr")].map((row) => row.textContent)).toEqual([
      "Gamma27",
      "Alpha31",
      "Beta42",
    ]);

    act(() => {
      ageHeader.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onChangeSort).toHaveBeenLastCalledWith({ columnId: "age", direction: "desc" });
    expect([...element.querySelectorAll("tbody tr")].map((row) => row.textContent)).toEqual([
      "Beta42",
      "Alpha31",
      "Gamma27",
    ]);
  });

  it("adds, updates, removes, restores, and clears ordered multi-sort rules", () => {
    const ref = createRef<CominsTableRef<PersonRow>>();
    const onChangeSort = vi.fn();
    const onChangeSortModel = vi.fn();
    const multiRows: PersonRow[] = [
      { age: 31, id: "a", name: "Beta" },
      { age: 31, id: "b", name: "Alpha" },
      { age: 27, id: "c", name: "Gamma" },
    ];
    const element = renderTableElement(
      <CominsTable
        columns={[
          { field: "name", label: "Name", sort: true },
          { field: "age", label: "Age", sort: true },
        ]}
        data={multiRows}
        getRowId={(row) => row.id}
        multiSort
        onChangeSort={onChangeSort}
        onChangeSortModel={onChangeSortModel}
        ref={ref}
      />,
    );
    const nameHeader = element.querySelector<HTMLElement>("[data-testid='header-name']")!;
    const ageHeader = element.querySelector<HTMLElement>("[data-testid='header-age']")!;

    act(() => ageHeader.click());
    act(() => nameHeader.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true })));

    expect(ref.current?.getSortModel()).toEqual([
      { columnId: "age", direction: "asc" },
      { columnId: "name", direction: "asc" },
    ]);
    expect(onChangeSort).toHaveBeenLastCalledWith({ columnId: "age", direction: "asc" });
    expect(onChangeSortModel).toHaveBeenLastCalledWith([
      { columnId: "age", direction: "asc" },
      { columnId: "name", direction: "asc" },
    ]);
    expect([...element.querySelectorAll("tbody tr")].map((row) => row.getAttribute("data-testid"))).toEqual([
      "row-c",
      "row-b",
      "row-a",
    ]);
    expect(ageHeader.getAttribute("data-sort-priority")).toBe("1");
    expect(nameHeader.getAttribute("data-sort-priority")).toBe("2");
    expect(ageHeader.getAttribute("aria-sort")).toBe("ascending");
    expect(nameHeader.getAttribute("aria-sort")).toBeNull();
    expect(element.querySelector("[data-testid='sort-priority-age']")?.textContent).toBe("1");
    expect(element.querySelector("[data-testid='sort-priority-name']")?.textContent).toBe("2");

    act(() => nameHeader.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true })));
    expect(ref.current?.getSortModel()).toEqual([
      { columnId: "age", direction: "asc" },
      { columnId: "name", direction: "desc" },
    ]);
    expect([...element.querySelectorAll("tbody tr")].map((row) => row.getAttribute("data-testid"))).toEqual([
      "row-c",
      "row-a",
      "row-b",
    ]);

    act(() => nameHeader.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true })));
    expect(ref.current?.getSortModel()).toEqual([{ columnId: "age", direction: "asc" }]);

    act(() => {
      nameHeader.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter", shiftKey: true }));
    });
    expect(ref.current?.getSortModel()).toEqual([
      { columnId: "age", direction: "asc" },
      { columnId: "name", direction: "asc" },
    ]);

    act(() => {
      ref.current?.setSortModel([
        { columnId: "name", direction: "desc" },
        { columnId: "age", direction: "asc" },
      ]);
    });
    expect(ref.current?.getSortState()).toEqual({ columnId: "name", direction: "desc" });
    expect(ref.current?.getSortModel()).toEqual([
      { columnId: "name", direction: "desc" },
      { columnId: "age", direction: "asc" },
    ]);

    act(() => ref.current?.clearSort());
    expect(ref.current?.getSortState()).toBeNull();
    expect(ref.current?.getSortModel()).toEqual([]);
  });

  it("keeps Shift activation on the single-sort path unless multiSort is enabled", () => {
    const ref = createRef<CominsTableRef<PersonRow>>();
    const element = renderTableElement(
      <CominsTable
        columns={[
          { field: "name", label: "Name", sort: true },
          { field: "age", label: "Age", sort: true },
        ]}
        data={threeRows}
        getRowId={(row) => row.id}
        ref={ref}
      />,
    );

    act(() => element.querySelector<HTMLElement>("[data-testid='header-age']")?.click());
    act(() => {
      element
        .querySelector<HTMLElement>("[data-testid='header-name']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }));
    });

    expect(ref.current?.getSortModel()).toEqual([{ columnId: "name", direction: "asc" }]);
  });

  it("normalizes and reports sort rules when sortable columns are removed", () => {
    const ref = createRef<CominsTableRef<PersonRow>>();
    const onChangeSort = vi.fn();
    const onChangeSortModel = vi.fn();
    const getRowId = (row: PersonRow) => row.id;
    const initialColumns = [
      { field: "name", label: "Name", sort: true },
      { field: "age", label: "Age", sort: true },
    ];
    const element = renderTableElement(
      <CominsTable
        columns={initialColumns}
        data={threeRows}
        getRowId={getRowId}
        onChangeSort={onChangeSort}
        onChangeSortModel={onChangeSortModel}
        ref={ref}
      />,
    );

    act(() => ref.current?.setSortModel([{ columnId: "age", direction: "asc" }]));
    onChangeSort.mockClear();
    onChangeSortModel.mockClear();

    act(() => {
      root?.render(
        <CominsTable
          columns={[{ field: "name", label: "Name", sort: true }]}
          data={threeRows}
          getRowId={getRowId}
          onChangeSort={onChangeSort}
          onChangeSortModel={onChangeSortModel}
          ref={ref}
        />,
      );
    });

    expect(element.querySelector("[data-testid='header-age']")).toBeNull();
    expect(ref.current?.getSortModel()).toEqual([]);
    expect(onChangeSort).toHaveBeenLastCalledWith(null);
    expect(onChangeSortModel).toHaveBeenLastCalledWith([]);
  });

  it("exposes aria-sort and keyboard activation for sortable headers", () => {
    const element = renderTableElement(
      <CominsTable columns={columns} data={threeRows} getRowId={(row) => row.id} />,
    );
    const ageHeader = element.querySelector("[data-testid='header-age']")!;
    const nameHeader = element.querySelector("[data-testid='header-name']")!;

    expect(ageHeader.getAttribute("aria-sort")).toBe("none");
    expect(ageHeader.getAttribute("tabindex")).toBe("0");
    expect(nameHeader.getAttribute("aria-sort")).toBeNull();

    act(() => {
      ageHeader.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    });

    expect(ageHeader.getAttribute("aria-sort")).toBe("ascending");
    expect([...element.querySelectorAll("tbody tr")].map((row) => row.textContent)).toEqual([
      "Gamma27",
      "Alpha31",
      "Beta42",
    ]);

    act(() => {
      ageHeader.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: " " }));
    });

    expect(ageHeader.getAttribute("aria-sort")).toBe("descending");
  });

  it("renders animated sort indicator state for the full sort cycle", () => {
    const element = renderTableElement(
      <CominsTable columns={columns} data={threeRows} getRowId={(row) => row.id} />,
    );
    const ageHeader = element.querySelector("[data-testid='header-age']")!;
    const indicator = element.querySelector("[data-testid='sort-indicator-age']")!;

    expect(indicator.querySelector("svg[data-comins-icon='sortUnsorted']")).not.toBeNull();
    expect(indicator.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(indicator.querySelector("svg")?.getAttribute("focusable")).toBe("false");
    expect(indicator.getAttribute("data-sort-state")).toBe("none");

    act(() => {
      ageHeader.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(indicator.getAttribute("data-sort-state")).toBe("asc");
    expect(indicator.querySelector("svg[data-comins-icon='sortAscending']")).not.toBeNull();

    act(() => {
      ageHeader.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(indicator.getAttribute("data-sort-state")).toBe("desc");
    expect(indicator.querySelector("svg[data-comins-icon='sortDescending']")).not.toBeNull();

    act(() => {
      ageHeader.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(indicator.getAttribute("data-sort-state")).toBe("none");
    expect(indicator.querySelector("svg[data-comins-icon='sortUnsorted']")).not.toBeNull();
  });

  it("renders 2-depth column groups without parent sort behavior", () => {
    const onChangeSort = vi.fn();
    const element = renderTableElement(
      <CominsTable
        columnGroups={[{ children: ["name", "age"], id: "profile", label: "Profile" }]}
        columns={columns}
        data={threeRows}
        getRowId={(row) => row.id}
        onChangeSort={onChangeSort}
      />,
    );
    const headerRows = element.querySelectorAll("thead tr");
    const groupHeader = element.querySelector("[data-testid='header-group-profile']")!;
    const nameHeader = element.querySelector("[data-testid='header-name']")!;
    const ageHeader = element.querySelector("[data-testid='header-age']")!;

    expect(headerRows).toHaveLength(2);
    expect(groupHeader.textContent).toContain("Profile");
    expect(groupHeader.getAttribute("colspan")).toBe("2");
    expect(groupHeader.getAttribute("scope")).toBe("colgroup");
    expect(groupHeader.getAttribute("aria-sort")).toBeNull();
    expect(groupHeader.getAttribute("tabindex")).toBeNull();
    expect(nameHeader.closest("tr")).toBe(headerRows[1]);
    expect(ageHeader.closest("tr")).toBe(headerRows[1]);

    act(() => {
      groupHeader.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onChangeSort).not.toHaveBeenCalled();
    expect([...element.querySelectorAll("tbody tr")].map((row) => row.textContent)).toEqual([
      "Alpha31",
      "Beta42",
      "Gamma27",
    ]);
  });

  it("hides actual child columns through parent group layout state", () => {
    const ref = createRef<CominsTableRef<PersonRow>>();
    const element = renderTableElement(
      <CominsTable
        columnGroups={[{ children: ["name", "age"], id: "profile", label: "Profile" }]}
        columns={[
          { field: "name", label: "Name" },
          { field: "age", label: "Age" },
          { field: "profile.age", label: "Profile Age" },
        ]}
        data={apiRows}
        getRowId={(row) => row.id}
        ref={ref}
      />,
    );

    act(() => {
      ref.current?.setColumnLayout({
        columns: { age: { hidden: true }, name: {}, "profile.age": {} },
        groups: { profile: { hidden: true } },
        order: ["name", "age", "profile.age"],
      });
    });

    expect(element.querySelector("[data-testid='header-group-profile']")).toBeNull();
    expect(element.querySelector("[data-testid='header-name']")).toBeNull();
    expect(element.querySelector("[data-testid='header-age']")).toBeNull();
    expect(element.querySelector("[data-testid='header-profile.age']")).not.toBeNull();
    expect([...element.querySelectorAll("tbody tr")].map((row) => row.textContent)).toEqual(["31", "42"]);

    act(() => {
      ref.current?.setColumnLayout({
        columns: { age: { hidden: true }, name: {}, "profile.age": {} },
        groups: { profile: { hidden: false } },
        order: ["name", "age", "profile.age"],
      });
    });

    expect(element.querySelector("[data-testid='header-group-profile']")).not.toBeNull();
    expect(element.querySelector("[data-testid='header-name']")).not.toBeNull();
    expect(element.querySelector("[data-testid='header-age']")).toBeNull();
    expect([...element.querySelectorAll("tbody tr")].map((row) => row.textContent)).toEqual(["Alpha31", "Beta42"]);
  });

  it("restores temporarily removed Header Groups to their last known column order", () => {
    const ref = createRef<CominsTableRef<PersonRow>>();
    const allColumns = [
      { field: "name", label: "Name" },
      { field: "age", label: "Age" },
      { field: "profile.age", label: "Profile Age" },
    ];
    const columnGroups = [{ children: ["name", "age"], id: "profile", label: "Profile" }];
    const renderColumns = (nextColumns: typeof allColumns) => (
      <CominsTable
        columnGroups={columnGroups}
        columns={nextColumns}
        data={apiRows}
        getRowId={(row) => row.id}
        ref={ref}
      />
    );
    const element = renderTableElement(renderColumns(allColumns));
    const readBodyOrder = () => [...element.querySelectorAll("tbody tr:first-child td")]
      .map((cell) => cell.getAttribute("data-comins-cell-column-id"));

    expect(readBodyOrder()).toEqual(["name", "age", "profile.age"]);

    act(() => {
      root?.render(renderColumns([allColumns[2]!]));
    });
    expect(readBodyOrder()).toEqual(["profile.age"]);

    act(() => {
      root?.render(renderColumns(allColumns));
    });
    expect(readBodyOrder()).toEqual(["name", "age", "profile.age"]);

    act(() => {
      const layout = ref.current?.getColumnLayout();

      if (layout) {
        ref.current?.setColumnLayout({ ...layout, order: ["profile.age", "name", "age"] });
      }
    });
    expect(readBodyOrder()).toEqual(["profile.age", "name", "age"]);

    act(() => {
      root?.render(renderColumns([allColumns[2]!]));
    });
    expect(readBodyOrder()).toEqual(["profile.age"]);

    act(() => {
      root?.render(renderColumns(allColumns));
    });
    expect(readBodyOrder()).toEqual(["profile.age", "name", "age"]);
  });

  it("exposes column layout, selection, and sort ref methods", () => {
    const ref = createRef<CominsTableRef<PersonRow>>();
    const onChangeColumnLayout = vi.fn();
    const onChangeSelection = vi.fn();
    const onChangeSort = vi.fn();
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={threeRows}
        getRowId={(row) => row.id}
        onChangeColumnLayout={onChangeColumnLayout}
        onChangeSelection={onChangeSelection}
        onChangeSort={onChangeSort}
        ref={ref}
      />,
    );

    act(() => {
      ref.current?.setSelectedRow(1);
    });

    expect(element.querySelector("[data-testid='row-b']")?.getAttribute("aria-selected")).toBe("true");
    expect(onChangeSelection).toHaveBeenLastCalledWith(expect.objectContaining({ rowIds: ["b"] }));

    act(() => {
      ref.current?.setSelectedRows([0, 2]);
    });

    expect(element.querySelector("[data-testid='row-a']")?.getAttribute("aria-selected")).toBe("true");
    expect(element.querySelector("[data-testid='row-c']")?.getAttribute("aria-selected")).toBe("true");

    act(() => {
      ref.current?.setSortState({ columnId: "age", direction: "desc" });
    });

    expect(ref.current?.getSortState()).toEqual({ columnId: "age", direction: "desc" });
    expect(onChangeSort).toHaveBeenLastCalledWith({ columnId: "age", direction: "desc" });

    act(() => {
      ref.current?.setColumnLayout({ columns: { age: { hidden: true }, name: { width: 220 } }, order: ["age", "name"] });
    });

    expect(ref.current?.getColumnLayout()).toEqual({
      columns: { age: { hidden: true, width: undefined }, name: { hidden: undefined, width: 220 } },
      order: ["age", "name"],
    });
    expect(onChangeColumnLayout).toHaveBeenLastCalledWith(ref.current?.getColumnLayout());
  });

  it("moves rows by visible indexes through setMoveTargetRow and clears active sort", () => {
    const ref = createRef<CominsTableRef<PersonRow>>();
    const onChangeData = vi.fn();
    const onChangeSort = vi.fn();
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={threeRows}
        getRowId={(row) => row.id}
        onChangeData={onChangeData}
        onChangeSort={onChangeSort}
        ref={ref}
      />,
    );

    act(() => {
      ref.current?.setSortState({ columnId: "age", direction: "asc" });
    });

    expect([...element.querySelectorAll("tbody tr")].map((row) => row.textContent)).toEqual([
      "Gamma27",
      "Alpha31",
      "Beta42",
    ]);

    act(() => {
      ref.current?.setMoveTargetRow(2, 0);
    });

    expect(ref.current?.getSortState()).toBeNull();
    expect([...element.querySelectorAll("tbody tr")].map((row) => row.textContent)).toEqual([
      "Alpha31",
      "Beta42",
      "Gamma27",
    ]);
    expect(onChangeSort).toHaveBeenLastCalledWith(null);
    expect(onChangeData).toHaveBeenLastCalledWith([
      { age: 31, id: "a", name: "Alpha" },
      { age: 42, id: "b", name: "Beta" },
      { age: 27, id: "c", name: "Gamma" },
    ]);
  });

  it("blocks row drag through rowProps.draggable without disabling row click", () => {
    const onClickRow = vi.fn();
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={threeRows}
        getRowId={(row) => row.id}
        onClickRow={onClickRow}
        rowProps={{ draggable: (row) => row.id !== "b" }}
      />,
    );
    const rowB = element.querySelector("[data-testid='row-b']")!;

    expect(rowB.getAttribute("data-row-draggable")).toBe("false");
    expect(element.querySelector("[data-testid='row-drag-handle-b']")).toBeNull();

    act(() => {
      rowB.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onClickRow).toHaveBeenCalledWith(expect.objectContaining({ row: expect.objectContaining({ id: "b" }) }));
    expect(rowB.getAttribute("data-selected-row")).toBe("true");
  });

  it("keeps owner and Detail together through sorting without mutating controlled expansion", () => {
    const onChangeExpandedRowIds = vi.fn();
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={threeRows}
        expandedRowIds={["a", "c"]}
        getRowId={(row) => row.id}
        onChangeExpandedRowIds={onChangeExpandedRowIds}
        renderRowDetail={({ row }) => <span>{`Detail ${row.id}`}</span>}
      />,
    );

    act(() => {
      element
        .querySelector("[data-testid='header-age']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(
      [...element.querySelectorAll("tbody tr")].map(
        (row) => row.getAttribute("data-testid") ?? `detail-${row.getAttribute("data-detail-for")}`,
      ),
    ).toEqual(["row-c", "detail-c", "row-a", "detail-a", "row-b"]);
    expect(onChangeExpandedRowIds).not.toHaveBeenCalled();
  });

  it("keeps off-page Detail ids dormant and includes them in the next controlled callback", () => {
    const onChangeExpandedRowIds = vi.fn();
    const renderProps = (pageIndex: number) => (
      <CominsTable
        columns={columns}
        data={threeRows}
        expandedRowIds={["a", "c"]}
        getRowId={(row) => row.id}
        onChangeExpandedRowIds={onChangeExpandedRowIds}
        pagination={{ pageIndex, pageSize: 1 }}
        renderRowDetail={({ row }) => <span>{`Detail ${row.id}`}</span>}
      />
    );
    const element = renderTableElement(renderProps(1));

    expect(element.querySelector("[data-detail-for]")).toBeNull();
    expect(element.querySelector("[data-testid='row-b']")).not.toBeNull();

    act(() => {
      element.querySelector<HTMLButtonElement>("[data-testid='row-detail-toggle-b']")?.click();
    });

    expect(onChangeExpandedRowIds).toHaveBeenLastCalledWith(["a", "c", "b"]);

    act(() => {
      root?.render(renderProps(0));
    });

    expect(element.querySelector("[data-testid='row-a']")?.nextElementSibling).toBe(
      element.querySelector("[data-detail-for='a']"),
    );
    expect(element.querySelector("[data-detail-for='c']")).toBeNull();
  });

  it("does not evaluate Row Detail callbacks for expanded ids outside the nonvirtual page", () => {
    const isRowExpandable = vi.fn(() => true);
    const getRowDetailHeight = vi.fn(() => 180 as const);
    const renderRowDetail = vi.fn(({ row }: { row: { id: string } }) => (
      <span>{`Detail ${row.id}`}</span>
    ));
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={threeRows}
        expandedRowIds={["a", "b", "c", "missing"]}
        getRowDetailHeight={getRowDetailHeight}
        getRowId={(row) => row.id}
        isRowExpandable={isRowExpandable}
        pagination={{ pageIndex: 1, pageSize: 1 }}
        renderRowDetail={renderRowDetail}
      />,
    );

    expect(element.querySelector("[data-detail-for='b']")).not.toBeNull();
    expect(
      new Set(isRowExpandable.mock.calls.map(([params]) => params.row.id)),
    ).toEqual(new Set(["b"]));
    expect(
      new Set(getRowDetailHeight.mock.calls.map(([params]) => params.row.id)),
    ).toEqual(new Set(["b"]));
    expect(getRowDetailHeight).toHaveBeenCalledTimes(1);
    expect(
      new Set(renderRowDetail.mock.calls.map(([params]) => params.row.id)),
    ).toEqual(new Set(["b"]));
  });

  it("uses owner business Row counts for lazy and infinite loading when Details are mounted", async () => {
    let resolveInitial: (() => void) | undefined;
    const onLazyLoad = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveInitial = () => resolve();
          }),
      )
      .mockResolvedValueOnce(undefined);
    const renderLazyDetailTable = (data: readonly PersonRow[]) => (
      <CominsTable
        columns={columns}
        data={data}
        data-testid="detail-lazy-viewport"
        expandedRowIds={["a"]}
        getRowId={(row) => row.id}
        hasMoreRows
        lazyLoad
        lazyLoadBatchSize={2}
        lazyLoadThreshold={80}
        onLazyLoad={onLazyLoad}
        pagination={{ pageIndex: 0, pageSize: 3 }}
        renderRowDetail={({ row }) => <span>{`Detail ${row.id}`}</span>}
      />
    );
    const lazyElement = renderTableElement(renderLazyDetailTable([]));

    await act(async () => {
      resolveInitial?.();
    });
    act(() => {
      root?.render(renderLazyDetailTable(rows));
    });

    expect(lazyElement.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(lazyElement.querySelectorAll("tbody tr[data-comins-row-data-index]")).toHaveLength(2);

    const lazyViewport = lazyElement.querySelector<HTMLElement>("[data-testid='detail-lazy-viewport']")!;
    Object.defineProperties(lazyViewport, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, value: 650, writable: true },
    });

    await act(async () => {
      lazyViewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    expect(onLazyLoad).toHaveBeenLastCalledWith(
      expect.objectContaining({ limit: 2, offset: 2, reason: "scroll" }),
    );

    act(() => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;

    const onLoadMore = vi.fn();
    const renderInfinite = (data: readonly PersonRow[], expandedRowIds: readonly string[]) => (
      <CominsTable
        columns={columns}
        data={data}
        data-testid="detail-infinite-viewport"
        expandedRowIds={expandedRowIds}
        getRowId={(row) => row.id}
        hasMoreRows
        infiniteScroll
        onLoadMore={onLoadMore}
        pagination={{ pageIndex: 0, pageSize: 3 }}
        renderRowDetail={({ row }) => <span>{`Detail ${row.id}`}</span>}
      />
    );
    const infiniteElement = renderTableElement(renderInfinite(rows, ["a"]));
    const infiniteViewport = infiniteElement.querySelector<HTMLElement>("[data-testid='detail-infinite-viewport']")!;

    Object.defineProperties(infiniteViewport, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, value: 900, writable: true },
    });

    act(() => {
      infiniteViewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    act(() => {
      root?.render(renderInfinite(rows, ["a", "b"]));
    });
    act(() => {
      infiniteViewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    act(() => {
      root?.render(renderInfinite(threeRows, ["a", "b"]));
    });
    act(() => {
      infiniteViewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it("moves only owner business Rows and carries their Detail Slot", () => {
    const ref = createRef<CominsTableRef<PersonRow>>();
    const onChangeData = vi.fn();
    const onChangeExpandedRowIds = vi.fn();
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={threeRows}
        expandedRowIds={["b"]}
        getRowId={(row) => row.id}
        onChangeData={onChangeData}
        onChangeExpandedRowIds={onChangeExpandedRowIds}
        ref={ref}
        renderRowDetail={({ row }) => <button>{`Detail ${row.id}`}</button>}
        rowProps={{ draggable: true }}
      />,
    );

    expect(element.querySelector("[data-detail-for='b']")?.hasAttribute("data-comins-row-data-index")).toBe(false);

    act(() => {
      ref.current?.setMoveTargetRow(0, 1);
    });

    expect(
      [...element.querySelectorAll("tbody tr")].map(
        (row) => row.getAttribute("data-testid") ?? `detail-${row.getAttribute("data-detail-for")}`,
      ),
    ).toEqual(["row-b", "detail-b", "row-a", "row-c"]);
    expect(onChangeData).toHaveBeenLastCalledWith([rows[1], rows[0], threeRows[2]]);
    expect(onChangeExpandedRowIds).not.toHaveBeenCalled();
  });

  it("keeps Detail content outside Row, Cell, range, clipboard, and Row callback routing", () => {
    const onChangeData = vi.fn();
    const onChangeSelection = vi.fn();
    const onClickCell = vi.fn();
    const onClickRow = vi.fn();
    const onContextMenuCell = vi.fn();
    const onContextMenuRow = vi.fn();
    const onDoubleClickCell = vi.fn();
    const onDoubleClickRow = vi.fn();
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={rows}
        expandedRowIds={["a"]}
        getRowId={(row) => row.id}
        onChangeData={onChangeData}
        onChangeSelection={onChangeSelection}
        onClickCell={onClickCell}
        onClickRow={onClickRow}
        onContextMenuCell={onContextMenuCell}
        onContextMenuRow={onContextMenuRow}
        onDoubleClickCell={onDoubleClickCell}
        onDoubleClickRow={onDoubleClickRow}
        renderRowDetail={() => <button data-testid="detail-interaction">Detail action</button>}
      />,
    );
    const detailAction = element.querySelector("[data-testid='detail-interaction']")!;
    const ownerCell = element.querySelector("[data-testid='cell-b-age']")!;

    act(() => {
      detailAction.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      detailAction.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
      detailAction.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
      detailAction.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
      ownerCell.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, buttons: 1 }));
      ownerCell.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0 }));
    });
    pressControlKey(detailAction, "c");
    pressControlKey(detailAction, "v");

    expect(onChangeSelection).not.toHaveBeenCalled();
    expect(onChangeData).not.toHaveBeenCalled();
    expect(onClickCell).not.toHaveBeenCalled();
    expect(onClickRow).not.toHaveBeenCalled();
    expect(onContextMenuCell).not.toHaveBeenCalled();
    expect(onContextMenuRow).not.toHaveBeenCalled();
    expect(onDoubleClickCell).not.toHaveBeenCalled();
    expect(onDoubleClickRow).not.toHaveBeenCalled();
    expect(element.querySelector("[data-range-selected='true']")).toBeNull();
  });

  it("never renders Row Detail disclosures on structural Rows", () => {
    const restoreResizeObserver = installTestResizeObserver(800);

    try {
      const element = renderTableElement(
        <div>
          <CominsTable
            columns={columns}
            data={[]}
            expandedRowIds={["a"]}
            loading
            renderRowDetail={() => <span>Detail</span>}
            skeletonRowCount={2}
          />
          <CominsTable
            columns={columns}
            data={[]}
            expandedRowIds={["a"]}
            renderRowDetail={() => <span>Detail</span>}
          />
          <CominsTable
            columns={columns}
            data={rows}
            expandedRowIds={["a"]}
            getRowId={(row) => row.id}
            hasMoreRows
            infiniteScroll
            loadingMore
            renderRowDetail={() => <span>Detail</span>}
            summary={{ columns: { age: "sum" } }}
          />
        </div>,
      );
      const structuralRows = element.querySelectorAll(
        [
          "[data-testid='loading-skeleton-row']",
          ".comins-table__empty-state-row",
          ".comins-table__infinite-loading-row",
          ".comins-table-empty-filler",
          ".comins-table__summary-row",
        ].join(","),
      );

      expect(element.querySelectorAll("[data-testid='loading-skeleton-row']")).toHaveLength(2);
      expect(element.querySelector(".comins-table__empty-state-row")).not.toBeNull();
      expect(element.querySelector(".comins-table__infinite-loading-row")).not.toBeNull();
      expect(element.querySelector(".comins-table-empty-filler")).not.toBeNull();
      expect(element.querySelector(".comins-table__summary-row")).not.toBeNull();

      for (const row of structuralRows) {
        expect(row.querySelector(".comins-row-detail-expander")).toBeNull();
      }
    } finally {
      restoreResizeObserver();
    }
  });

  it("subtracts fixed Detail height from the nonvirtual viewport-end filler", () => {
    const resize = installControllableResizeObserver();

    try {
      const element = renderTableElement(
        <CominsTable
          columns={columns}
          data={[rows[0]!]}
          data-testid="fixed-detail-filler-viewport"
          expandedRowIds={["a"]}
          getRowDetailHeight={() => 240}
          getRowId={(row) => row.id}
          renderRowDetail={({ row }) => <span>{row.data.name}</span>}
        />,
      );
      const viewport = element.querySelector<HTMLElement>(
        "[data-testid='fixed-detail-filler-viewport']",
      )!;

      act(() => resize.emit(viewport, 300));

      expect(
        element.querySelector<HTMLElement>("[data-testid='table-empty-filler']")?.style.height,
      ).toBe("24px");
    } finally {
      resize.restore();
    }
  });

  it("subtracts measured automatic Detail height from the nonvirtual viewport-end filler", () => {
    const resize = installControllableResizeObserver();

    try {
      const element = renderTableElement(
        <CominsTable
          columns={columns}
          data={[rows[0]!]}
          data-testid="auto-detail-filler-viewport"
          expandedRowIds={["a"]}
          getRowDetailHeight={() => "auto"}
          getRowId={(row) => row.id}
          renderRowDetail={({ row }) => <span>{row.data.name}</span>}
        />,
      );
      const viewport = element.querySelector<HTMLElement>(
        "[data-testid='auto-detail-filler-viewport']",
      )!;
      const detail = element.querySelector<HTMLElement>(
        "[data-testid='row-detail-content-a']",
      )!;

      act(() => {
        resize.emit(viewport, 240);
        resize.emit(detail, 180);
      });

      expect(
        element.querySelector<HTMLElement>("[data-testid='table-empty-filler']")?.style.height,
      ).toBe("24px");
    } finally {
      resize.restore();
    }
  });

  it("updates Detail colSpan from the effective visible Column layout", () => {
    const ref = createRef<CominsTableRef<PersonRow>>();
    const layoutColumns = [
      { field: "name", label: "Name" },
      { field: "age", label: "Age" },
      { field: "profile.age", label: "Profile Age" },
    ] as const;
    const element = renderTableElement(
      <CominsTable
        columns={layoutColumns}
        data={apiRows}
        expandedRowIds={["a"]}
        getRowId={(row) => row.id}
        ref={ref}
        renderRowDetail={({ row }) => <span>{row.data.name}</span>}
      />,
    );
    const getDetailCell = () => element.querySelector<HTMLTableCellElement>("[data-detail-for='a'] > td");

    expect(getDetailCell()?.colSpan).toBe(3);

    act(() => {
      ref.current?.setColumnLayout({
        columns: { age: { hidden: true } },
        order: ["profile.age", "name", "age"],
      });
    });

    expect(getDetailCell()?.colSpan).toBe(2);
    expect([...element.querySelectorAll("thead th[data-comins-column-id]")].map((header) => header.textContent)).toEqual([
      "Profile Age",
      "Name",
    ]);
  });

  it("strips untyped flat Detail props from the Tree runtime wrapper", () => {
    const renderRowDetail = vi.fn(() => <span>Tree Detail</span>);
    const getRowDetailHeight = vi.fn(() => 180);
    const onChangeExpandedRowIds = vi.fn();
    const UntypedCominsTable = CominsTable as React.ComponentType<Record<string, unknown>>;
    const treeRows = [
      {
        children: [{ item: { age: 20, id: "child", name: "Child" } }],
        item: { age: 40, id: "root", name: "Root" },
      },
    ];
    const element = renderTableElement(
      <UntypedCominsTable
        columns={columns}
        data={treeRows}
        expandedRowIds={["root"]}
        getRowDetailHeight={getRowDetailHeight}
        getRowId={(row: PersonRow) => row.id}
        onChangeExpandedRowIds={onChangeExpandedRowIds}
        renderRowDetail={renderRowDetail}
        tree
      />,
    );

    expect(element.querySelector(".comins-row-detail-expander")).toBeNull();
    expect(element.querySelector("[data-detail-for]")).toBeNull();
    expect(renderRowDetail).not.toHaveBeenCalled();
    expect(getRowDetailHeight).not.toHaveBeenCalled();
    expect(onChangeExpandedRowIds).not.toHaveBeenCalled();
  });

  it("renders controlled fixed details as a semantic sibling row", () => {
    const onChangeExpandedRowIds = vi.fn();
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={rows}
        expandedRowIds={["a", "missing", "a"]}
        getRowDetailHeight={() => 180}
        getRowId={(row) => row.id}
        onChangeExpandedRowIds={onChangeExpandedRowIds}
        renderRowDetail={({ row }) => <button>{`Detail ${row.id}`}</button>}
      />,
    );

    const owner = element.querySelector("[data-testid='row-a']");
    const detail = element.querySelector("[data-detail-for='a']");

    expect(owner?.nextElementSibling).toBe(detail);
    expect(detail?.tagName).toBe("TR");
    expect(detail?.querySelector<HTMLTableCellElement>("td")?.colSpan).toBe(2);
    expect(detail?.querySelector("[role='region']")).not.toBeNull();
    const toggle = element.querySelector<HTMLButtonElement>("[data-testid='row-detail-toggle-a']");
    const region = detail?.querySelector<HTMLElement>("[role='region']");

    expect(region?.getAttribute("aria-labelledby")).toBe(toggle?.id);
    expect(document.getElementById(region?.getAttribute("aria-labelledby") ?? "")).toBe(toggle);
    expect(toggle?.getAttribute("aria-label")).toBe("Collapse a details");
    expect(toggle?.querySelector("svg[data-comins-icon='disclosureExpanded']")).not.toBeNull();
    expect(toggle?.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(toggle?.querySelector("svg")?.getAttribute("focusable")).toBe("false");
    expect(
      element.querySelector("[data-testid='row-detail-content-a']")?.getAttribute("style"),
    ).toContain("height: 180px");
    expect(element.querySelector("[data-detail-for='missing']")).toBeNull();

    act(() => {
      element
        .querySelector<HTMLButtonElement>("[data-testid='row-detail-toggle-a']")
        ?.click();
    });

    expect(onChangeExpandedRowIds).toHaveBeenLastCalledWith(["missing"]);
  });

  it("keeps a controlled disclosure read-only without its change callback", () => {
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={rows}
        expandedRowIds={["a"]}
        getRowId={(row) => row.id}
        renderRowDetail={({ row }) => <span>{row.data.name}</span>}
      />,
    );

    expect(
      element.querySelector<HTMLButtonElement>("[data-testid='row-detail-toggle-a']")?.disabled,
    ).toBe(true);
  });

  it("does not render or toggle details for non-expandable rows", () => {
    const onChangeExpandedRowIds = vi.fn();
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={rows}
        expandedRowIds={["a"]}
        getRowId={(row) => row.id}
        isRowExpandable={() => false}
        onChangeExpandedRowIds={onChangeExpandedRowIds}
        renderRowDetail={({ row }) => <span>{row.data.name}</span>}
      />,
    );
    const toggle = element.querySelector<HTMLButtonElement>("[data-testid='row-detail-toggle-a']");

    expect(toggle).toBeNull();
    expect(element.querySelector("[data-detail-for='a']")).toBeNull();
    expect(element.querySelector("[data-testid='row-detail-content-a']")).toBeNull();
    expect(onChangeExpandedRowIds).not.toHaveBeenCalled();
  });

  it("keeps the disclosure slot before Row drag for expandable and non-expandable rows", () => {
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={rows}
        expandedRowIds={[]}
        getRowId={(row) => row.id}
        isRowExpandable={({ row }) => row.id === "a"}
        onChangeExpandedRowIds={() => undefined}
        renderRowDetail={({ row }) => <span>{row.data.name}</span>}
        rowProps={{ draggable: true }}
      />,
    );
    const firstCell = element.querySelector("[data-testid='cell-a-name']")!;
    const leading = firstCell.querySelector(".comins-row-leading-controls")!;
    const secondCell = element.querySelector("[data-testid='cell-b-name']")!;

    expect(leading).not.toBeNull();
    expect([...leading.children].map((child) => child.getAttribute("data-comins-row-leading-control"))).toEqual([
      "disclosure",
      "drag",
    ]);
    expect(firstCell.querySelector(".comins-row-detail-expander-spacer")).toBeNull();
    expect(secondCell.querySelector("[data-testid='row-detail-toggle-b']")).toBeNull();
    expect(secondCell.querySelector(".comins-row-detail-expander-spacer")).not.toBeNull();
    expect(secondCell.querySelector("[data-comins-row-leading-control='drag']")).not.toBeNull();
  });

  it("isolates detail disclosure clicks from row selection callbacks", () => {
    const onChangeExpandedRowIds = vi.fn();
    const onClickRow = vi.fn();
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={rows}
        expandedRowIds={[]}
        getRowId={(row) => row.id}
        onChangeExpandedRowIds={onChangeExpandedRowIds}
        onClickRow={onClickRow}
        renderRowDetail={({ row }) => <span>{row.data.name}</span>}
      />,
    );

    act(() => {
      element
        .querySelector<HTMLButtonElement>("[data-testid='row-detail-toggle-a']")
        ?.click();
    });

    expect(onChangeExpandedRowIds).toHaveBeenLastCalledWith(["a"]);
    expect(onClickRow).not.toHaveBeenCalled();
  });

  it("isolates Detail disclosure context menu and double-click events from owner callbacks", () => {
    const onContextMenuCell = vi.fn();
    const onContextMenuRow = vi.fn();
    const onDoubleClickCell = vi.fn();
    const onDoubleClickRow = vi.fn();
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={rows}
        expandedRowIds={[]}
        getRowId={(row) => row.id}
        onChangeExpandedRowIds={() => undefined}
        onContextMenuCell={onContextMenuCell}
        onContextMenuRow={onContextMenuRow}
        onDoubleClickCell={onDoubleClickCell}
        onDoubleClickRow={onDoubleClickRow}
        renderRowDetail={({ row }) => <span>{row.data.name}</span>}
      />,
    );
    const disclosure = element.querySelector("[data-testid='row-detail-toggle-a']")!;

    act(() => {
      disclosure.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
      disclosure.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    });

    expect(onContextMenuCell).not.toHaveBeenCalled();
    expect(onContextMenuRow).not.toHaveBeenCalled();
    expect(onDoubleClickCell).not.toHaveBeenCalled();
    expect(onDoubleClickRow).not.toHaveBeenCalled();
  });

  it("isolates Detail disclosure keyboard events from owner callbacks and Cell clipboard actions", () => {
    const onChangeData = vi.fn();
    const onKeyDownCell = vi.fn();
    const onKeyDownRow = vi.fn();
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={rows}
        expandedRowIds={[]}
        getRowId={(row) => row.id}
        onChangeData={onChangeData}
        onChangeExpandedRowIds={() => undefined}
        onKeyDownCell={onKeyDownCell}
        onKeyDownRow={onKeyDownRow}
        renderRowDetail={({ row }) => <span>{row.data.name}</span>}
      />,
    );
    const sourceCell = element.querySelector("[data-testid='cell-b-name']")!;
    const disclosure = element.querySelector("[data-testid='row-detail-toggle-a']")!;

    pressControlKey(sourceCell, "c");
    onKeyDownCell.mockClear();
    onKeyDownRow.mockClear();

    pressControlKey(disclosure, "v");
    pressControlKey(disclosure, "c");
    act(() => {
      disclosure.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
      disclosure.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: " " }));
    });

    expect(onKeyDownCell).not.toHaveBeenCalled();
    expect(onKeyDownRow).not.toHaveBeenCalled();
    expect(onChangeData).not.toHaveBeenCalled();
  });

  it("auto-sizes an expanded Detail when no height callback is provided", () => {
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={rows}
        expandedRowIds={["a"]}
        getRowId={(row) => row.id}
        renderRowDetail={({ row }) => <span>{row.data.name}</span>}
        rowHeight={40}
      />,
    );

    expect(
      element.querySelector<HTMLElement>("[data-testid='row-detail-content-a']")?.style.height,
    ).toBe("");
  });

  it("auto-sizes a virtualized expanded Detail when no height callback is provided", () => {
    const virtualizedElement = renderTableElement(
      <CominsTable
        columns={columns}
        data={rows}
        expandedRowIds={["a"]}
        getRowId={(row) => row.id}
        renderRowDetail={({ row }) => <span>{row.data.name}</span>}
        virtualized
      />,
    );

    expect(
      virtualizedElement.querySelector<HTMLElement>("[data-testid='row-detail-content-a']")?.style.height,
    ).toBe("");
  });

  it("retains a fixed detail region when its renderer returns null", () => {
    const element = renderTableElement(
      <CominsTable
        columns={columns}
        data={rows}
        expandedRowIds={["a"]}
        getRowDetailHeight={() => 96}
        getRowId={(row) => row.id}
        onChangeExpandedRowIds={() => undefined}
        renderRowDetail={() => null}
      />,
    );
    const content = element.querySelector<HTMLElement>("[data-testid='row-detail-content-a']");

    expect(content).not.toBeNull();
    expect(content?.textContent).toBe("");
    expect(content?.style.height).toBe("96px");
  });

  it("auto-sizes Detail rows for every invalid numeric height result", () => {
    const invalidRows: PersonRow[] = [
      { age: 1, id: "zero", name: "Zero" },
      { age: 2, id: "negative", name: "Negative" },
      { age: 3, id: "nan", name: "NaN" },
      { age: 4, id: "infinity", name: "Infinity" },
    ];
    const invalidHeights: Record<string, number> = {
      infinity: Number.POSITIVE_INFINITY,
      nan: Number.NaN,
      negative: -24,
      zero: 0,
    };
    const invalidElement = renderTableElement(
      <CominsTable
        columns={columns}
        data={invalidRows}
        expandedRowIds={["zero", "negative", "nan", "infinity"]}
        getRowDetailHeight={({ row }) => invalidHeights[row.id]!}
        getRowId={(row) => row.id}
        renderRowDetail={({ row }) => <span>{row.data.name}</span>}
      />,
    );

    for (const rowId of ["zero", "negative", "nan", "infinity"]) {
      expect(
        invalidElement.querySelector<HTMLElement>(`[data-testid='row-detail-content-${rowId}']`)?.style.height,
      ).toBe("");
    }
  });

  it("keeps a valid numeric Detail height fixed", () => {
    const fixedElement = renderTableElement(
      <CominsTable
        columns={columns}
        data={rows}
        expandedRowIds={["a"]}
        getRowDetailHeight={() => 96}
        getRowId={(row) => row.id}
        renderRowDetail={({ row }) => <span>{row.data.name}</span>}
      />,
    );

    expect(
      fixedElement.querySelector<HTMLElement>("[data-testid='row-detail-content-a']")?.style.height,
    ).toBe("96px");
  });

  it("does not invoke the detail-height callback when detail rendering is absent", () => {
    const getRowDetailHeight = vi.fn(() => {
      throw new Error("detail height must remain inert without a renderer");
    });

    renderTableElement(
      <CominsTable
        columns={columns}
        data={rows}
        expandedRowIds={["a"]}
        getRowDetailHeight={getRowDetailHeight}
        getRowId={(row) => row.id}
      />,
    );

    expect(getRowDetailHeight).not.toHaveBeenCalled();
  });

  it("returns focus to the disclosure after an initially expanded detail collapses", () => {
    const renderDetail = () => <button data-testid="initial-detail-focus">Detail action</button>;
    const renderProps = (expandedRowIds: string[]) => (
      <CominsTable
        columns={columns}
        data={rows}
        expandedRowIds={expandedRowIds}
        getRowId={(row) => row.id}
        onChangeExpandedRowIds={() => undefined}
        renderRowDetail={renderDetail}
      />
    );
    const element = renderTableElement(renderProps(["a"]));
    const detailButton = element.querySelector<HTMLButtonElement>("[data-testid='initial-detail-focus']")!;
    const toggle = element.querySelector<HTMLButtonElement>("[data-testid='row-detail-toggle-a']")!;

    act(() => {
      detailButton.focus();
    });
    expect(document.activeElement).toBe(detailButton);

    act(() => {
      root?.render(renderProps([]));
    });

    expect(document.activeElement).toBe(toggle);
  });

  it("returns focus when an interactive Detail action triggers its own controlled collapse", () => {
    function ControlledDetail() {
      const [expandedRowIds, setExpandedRowIds] = useState<string[]>(["a"]);

      return (
        <CominsTable
          columns={columns}
          data={rows}
          expandedRowIds={expandedRowIds}
          getRowId={(row) => row.id}
          onChangeExpandedRowIds={setExpandedRowIds}
          renderRowDetail={() => (
            <button data-testid="self-collapse-detail" onClick={() => setExpandedRowIds([])}>
              Collapse from Detail
            </button>
          )}
        />
      );
    }

    const element = renderTableElement(<ControlledDetail />);
    const detailButton = element.querySelector<HTMLButtonElement>("[data-testid='self-collapse-detail']")!;
    const toggle = element.querySelector<HTMLButtonElement>("[data-testid='row-detail-toggle-a']")!;

    act(() => {
      detailButton.focus();
      detailButton.click();
    });

    expect(document.activeElement).toBe(toggle);
  });

  it("restores focus to the remounted disclosure after the last virtual Detail collapses", () => {
    const animationFrames: FrameRequestCallback[] = [];
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        animationFrames.push(callback);
        return animationFrames.length;
      });

    function ControlledVirtualDetail() {
      const [expandedRowIds, setExpandedRowIds] = useState<string[]>(["row-0"]);

      return (
        <CominsTable
          columns={columns}
          data={manyRows.slice(0, 20)}
          expandedRowIds={expandedRowIds}
          getRowDetailHeight={() => 240}
          getRowId={(row) => row.id}
          onChangeExpandedRowIds={setExpandedRowIds}
          renderRowDetail={() => (
            <button data-testid="last-virtual-detail-collapse" onClick={() => setExpandedRowIds([])}>
              Collapse last Detail
            </button>
          )}
          virtualized
        />
      );
    }

    try {
      const element = renderTableElement(<ControlledVirtualDetail />);
      const originalToggle = element.querySelector<HTMLButtonElement>(
        "[data-testid='row-detail-toggle-row-0']",
      )!;
      const detailButton = element.querySelector<HTMLButtonElement>(
        "[data-testid='last-virtual-detail-collapse']",
      )!;

      act(() => {
        detailButton.focus();
        detailButton.click();
      });

      const remountedToggle = element.querySelector<HTMLButtonElement>(
        "[data-testid='row-detail-toggle-row-0']",
      )!;

      expect(remountedToggle).not.toBe(originalToggle);
      expect(remountedToggle.getAttribute("aria-expanded")).toBe("false");
      expect(remountedToggle.hasAttribute("aria-controls")).toBe(false);
      expect(element.querySelector("[data-detail-for='row-0']")).toBeNull();

      act(() => {
        for (const callback of animationFrames.splice(0)) {
          callback(0);
        }
      });

      expect(document.activeElement).toBe(remountedToggle);
    } finally {
      requestAnimationFrame.mockRestore();
    }
  });
});
