import { useState } from "react";

import {
  CominsTable,
  createCominsTableTransferCoordinator,
  type CominsTableTransferConflictPolicy,
  type CominsTableTransferRejection,
} from "../../../src";
import { FeatureControls } from "../components/FeatureControls";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Button } from "../components/ui/button";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

type TransferRow = {
  groupId: string;
  id: string;
  name: string;
  status: string;
};

type TransferGroup = {
  id: string;
  label: string;
};

const transferColumns = [
  { field: "name", label: "Name", minWidth: 180 },
  { field: "status", label: "Status", minWidth: 120 },
];
const initialFlatLeft: TransferRow[] = [
  { groupId: "", id: "flat-a", name: "Alpha", status: "Ready" },
  { groupId: "", id: "shared", name: "Shared from left", status: "Review" },
];
const initialFlatRight: TransferRow[] = [
  { groupId: "", id: "flat-b", name: "Beta", status: "Ready" },
  { groupId: "", id: "shared", name: "Shared from right", status: "Blocked" },
  ...Array.from({ length: 20 }, (_value, index) => ({
    groupId: "",
    id: `queue-${index + 1}`,
    name: `Queue ${index + 1}`,
    status: index % 2 === 0 ? "Ready" : "Review",
  })),
];
const initialGroupedLeftRows: TransferRow[] = [
  { groupId: "left-a", id: "group-a", name: "Group Alpha", status: "Ready" },
];
const initialGroupedRightRows: TransferRow[] = [
  { groupId: "right-a", id: "group-b", name: "Group Beta", status: "Review" },
];
const initialGroupedLeftGroups: TransferGroup[] = [
  { id: "left-a", label: "Left A" },
  { id: "left-empty", label: "Left Empty" },
];
const initialGroupedRightGroups: TransferGroup[] = [
  { id: "right-a", label: "Right A" },
  { id: "right-empty", label: "Right Empty" },
];

export function CrossTableDragFeature() {
  const { text } = usePlaygroundLocale();
  const [conflictPolicy, setConflictPolicy] = useState<CominsTableTransferConflictPolicy>("reject");
  const [flatLeft, setFlatLeft] = useState(initialFlatLeft);
  const [flatRight, setFlatRight] = useState(initialFlatRight);
  const [groupedLeftRows, setGroupedLeftRows] = useState(initialGroupedLeftRows);
  const [groupedRightRows, setGroupedRightRows] = useState(initialGroupedRightRows);
  const [groupedLeftGroups, setGroupedLeftGroups] = useState(initialGroupedLeftGroups);
  const [groupedRightGroups, setGroupedRightGroups] = useState(initialGroupedRightGroups);
  const renderRejectionTooltip = (
    rejection:
      | CominsTableTransferRejection<TransferRow>
      | CominsTableTransferRejection<TransferRow, TransferGroup>,
  ) => {
    const duplicateId = rejection.conflict.kind === "group"
      ? rejection.conflict.groupId
      : rejection.conflict.rowId;

    return (
      <>
        <strong>{text(defineLocalizedText("Duplicate ID", "Duplicate ID"))}</strong>
        <span>{text(defineLocalizedText(
          `"${String(duplicateId)}" ID가 이미 존재합니다.`,
          `The ID "${String(duplicateId)}" already exists.`,
        ))}</span>
      </>
    );
  };
  const [flatCoordinator] = useState(() => createCominsTableTransferCoordinator<TransferRow>({
    onTransfer: (result) => {
      const sourceSetter = result.source.tableId === "flat-left" ? setFlatLeft : setFlatRight;
      const targetSetter = result.target.tableId === "flat-left" ? setFlatLeft : setFlatRight;

      sourceSetter(result.source.data);
      targetSetter(result.target.data);
    },
  }));
  const [groupedCoordinator] = useState(() =>
    createCominsTableTransferCoordinator<TransferRow, TransferGroup>({
      onTransfer: (result) => {
        const sourceIsLeft = result.source.tableId === "group-left";
        const targetIsLeft = result.target.tableId === "group-left";

        (sourceIsLeft ? setGroupedLeftRows : setGroupedRightRows)(result.source.data);
        (sourceIsLeft ? setGroupedLeftGroups : setGroupedRightGroups)(result.source.groups ?? []);
        (targetIsLeft ? setGroupedLeftRows : setGroupedRightRows)(result.target.data);
        (targetIsLeft ? setGroupedLeftGroups : setGroupedRightGroups)(result.target.groups ?? []);
      },
    }),
  );
  const flatTransfer = (tableId: string) => ({
    coordinator: flatCoordinator,
    rejectionFeedback: { duration: 2400, renderTooltip: renderRejectionTooltip },
    resolveConflict: () => conflictPolicy,
    scope: "flat-example",
    tableId,
  } as const);
  const groupedTransfer = (tableId: string) => ({
    coordinator: groupedCoordinator,
    rejectionFeedback: { duration: 2400, renderTooltip: renderRejectionTooltip },
    resolveConflict: () => conflictPolicy,
    scope: "group-example",
    tableId,
  } as const);
  const grouping = (groups: TransferGroup[]) => ({
    expandedGroupIds: groups.map((group) => group.id),
    getGroupId: (group: TransferGroup) => group.id,
    getGroupLabel: (group: TransferGroup) => group.label,
    getRowGroupId: (row: TransferRow) => row.groupId,
    groupDraggable: true,
    groups,
    onChangeExpandedGroupIds: () => undefined,
    setRowGroupId: ({ row, toGroupId }: { row: TransferRow; toGroupId: string | number }) => ({
      ...row,
      groupId: String(toGroupId),
    }),
  });

  return (
    <section className="feature-panel feature-panel--cross-table-drag">
      <FeatureSampleSection
        description={text(defineLocalizedText(
          "기존 Row Drag handle을 다른 Table의 Row 또는 빈 Body에 놓으면 Coordinator가 source/target의 atomic next model을 한 번 전달합니다. 중복 ID 기본값은 이동 거부입니다.",
          "Drop an existing Row Drag handle on another Table row or empty body. The Coordinator emits one atomic source/target next model. Duplicate IDs reject by default.",
        ))}
        id="cross-table-flat"
        title={text(defineLocalizedText("Flat Row Transfer", "Flat Row Transfer"))}
      >
        <FeatureControls actions={(
          <Button onClick={() => setConflictPolicy((current) => current === "reject" ? "overwrite" : "reject")} variant="outline">
            {`Conflict: ${conflictPolicy}`}
          </Button>
        )} />
        <div className="cross-table-grid">
          <div>
            <strong>{text(defineLocalizedText("왼쪽 Flat Table", "flat-left"))}</strong>
            <CominsTable className="example-table" columns={transferColumns} data={flatLeft} data-testid="cross-table-flat-left" getRowId={(row) => row.id} rowProps={{ draggable: true }} tableTransfer={flatTransfer("flat-left")} />
            <pre className="state-output">{JSON.stringify(flatLeft.map((row) => row.id))}</pre>
          </div>
          <div>
            <strong>{text(defineLocalizedText("오른쪽 Flat Table", "flat-right"))}</strong>
            <CominsTable className="example-table" columns={transferColumns} data={flatRight} data-testid="cross-table-flat-right" getRowId={(row) => row.id} rowProps={{ draggable: true }} tableTransfer={flatTransfer("flat-right")} />
            <pre className="state-output">{JSON.stringify(flatRight.map((row) => row.id))}</pre>
          </div>
        </div>
      </FeatureSampleSection>

      <FeatureSampleSection
        description={text(defineLocalizedText(
          "Row는 다른 Group으로 이동할 수 있고 Group handle은 Group과 모든 member Row를 함께 이동합니다. 마지막 Row가 이동해도 source의 빈 Group은 유지됩니다.",
          "Rows can move into another Group. A Group handle moves the Group and all member Rows together. Moving the last Row preserves the empty source Group.",
        ))}
        id="cross-table-grouped"
        title={text(defineLocalizedText("Grouped Row / Group Transfer", "Grouped Row / Group Transfer"))}
      >
        <div className="cross-table-grid">
          <div>
            <strong>{text(defineLocalizedText("왼쪽 Group Table", "group-left"))}</strong>
            <CominsTable className="example-table" columns={transferColumns} data={groupedLeftRows} data-testid="cross-table-group-left" getRowId={(row) => row.id} rowGrouping={grouping(groupedLeftGroups)} rowProps={{ draggable: true }} tableTransfer={groupedTransfer("group-left")} />
            <pre className="state-output" data-testid="cross-table-group-left-state">{JSON.stringify({ groups: groupedLeftGroups.map((group) => group.id), rows: groupedLeftRows.map((row) => ({ groupId: row.groupId, id: row.id })) })}</pre>
          </div>
          <div>
            <strong>{text(defineLocalizedText("오른쪽 Group Table", "group-right"))}</strong>
            <CominsTable className="example-table" columns={transferColumns} data={groupedRightRows} data-testid="cross-table-group-right" getRowId={(row) => row.id} rowGrouping={grouping(groupedRightGroups)} rowProps={{ draggable: true }} tableTransfer={groupedTransfer("group-right")} />
            <pre className="state-output" data-testid="cross-table-group-right-state">{JSON.stringify({ groups: groupedRightGroups.map((group) => group.id), rows: groupedRightRows.map((row) => ({ groupId: row.groupId, id: row.id })) })}</pre>
          </div>
        </div>
      </FeatureSampleSection>
    </section>
  );
}
