import { startValueFilterRefConsumer } from "./value-filter-ref";
import React, { Activity, StrictMode, useEffect, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { CominsTable, type CominsTableColumn } from "comins-retention-source";
import "../../../styles.css";

type Row = { id: string; value: number };
type Cohort = { label: string; array: WeakRef<Row[]>; rows: WeakRef<Row>[] };
const query = new URLSearchParams(location.search);
const size = query.get("profile") === "large" ? 100000 : 30;
const tables = size === 100000 ? 2 : 1;
const lifecycle = { setups: 0, cleanups: 0 };
const strictDetails = query.has("lifecycle");
const expanded = ["A-0"];
const detail = { render: () => <div data-testid="strict-detail" style={{ height: 40 }}>Measured detail</div> };
const autoHeight = () => "auto" as const;
function lifecycleEffect() {
  lifecycle.setups++;
  return () => { lifecycle.cleanups++; };
}
let current: Row[] | null = null;
let previous: WeakRef<Row[]> | null = null;
let expected: WeakRef<Row[]> | null = null;
let dispatch: React.Dispatch<React.SetStateAction<Row[]>> | null = null;
let commit = 0;
let witness = false;
let pendingLabel = "A1";
let cohortLabel = "A1";
let cohorts: Cohort[] = [];
let deleted: WeakRef<Row>[] = [];
let currentReferences: WeakRef<Row>[] = [];
let currentArrayReference: WeakRef<Row[]> | null = null;
let control: object | null = {};
const controlRef = new WeakRef(control);
const columns: CominsTableColumn<Row>[] = [{ field: "id", label: "ID", width: 180 }, { field: "value", label: "Value", width: 180 }];
const getRowId = (row: Row) => row.id;
const createRows = (prefix: string) => Array.from({ length: size }, (_, index) => ({ id: `${prefix}-${index}`, value: index }));

function replace(next: Row[], label: string) {
  // 데이터 자체를 controller history에 넣지 않는다. 직전 배열도 WeakRef로만 분류한다.
  if (current) {
    cohorts.push({ label: cohortLabel, array: new WeakRef(current), rows: current.map(row => new WeakRef(row)) });
    previous = new WeakRef(current);
  }
  current = next;
  currentReferences = next.map(row => new WeakRef(row));
  currentArrayReference = new WeakRef(next);
  expected = new WeakRef(next);
  pendingLabel = label;
  dispatch!(next);
}

function Consumer() {
  const [data, setData] = useState(() => current ?? (current = createRows("A")));
  if (currentReferences.length === 0) currentReferences = data.map(row => new WeakRef(row));
  currentArrayReference ??= new WeakRef(data);
  dispatch = setData;
  // 계측 effect 자체가 최초 render Context의 data를 보유하지 않게 module scope에서 만든다.
  useEffect(lifecycleEffect, []);
  useLayoutEffect(() => {
    // 실제 consumer commit의 정확 배열 identity를 primitive 값으로만 노출한다.
    witness = data === current && (expected === null || data === expected.deref());
    commit++;
    cohortLabel = pendingLabel;
    document.body.dataset.commit = String(commit);
  }, [data]);
  return <>{Array.from({ length: tables }, (_, index) => <section key={index} data-testid={`retention-table-${index}`} style={{ height: 260 }}>
    <CominsTable data={data} onChangeData={setData} columns={columns} getRowId={getRowId} fillHandle={false} virtualized={size === 100000} style={{ height: 260 }}
      expandedRowIds={strictDetails ? expanded : undefined} getRowDetailHeight={strictDetails ? autoHeight : undefined} rowDetail={strictDetails ? detail : undefined} />
  </section>)}</>;
}
let changeVisibility: React.Dispatch<React.SetStateAction<boolean>> | null = null;
function ActivityConsumer() {
  const [visible, setVisible] = useState(true);
  changeVisibility = setVisible;
  return <Activity mode={visible ? "visible" : "hidden"}><Consumer /></Activity>;
}
const root = createRoot(document.getElementById("app")!);
const refProfile = query.get("profile");
if (refProfile === "row-data-retirement") void import("./row-data-retirement").then(({ startRowDataRetirementConsumer }) => startRowDataRetirementConsumer(root));
else if (refProfile === "value-filter-ref" || refProfile === "row-group-ref" || refProfile === "row-detail-ref") Object.assign(window, { valueFilterRef: startValueFilterRefConsumer(root, refProfile) });
else root.render(query.has("activity") ? <ActivityConsumer /> : query.has("strict") ? <StrictMode><Consumer /></StrictMode> : <Consumer />);

const controller = {
  hide() { changeVisibility?.(false); },
  show() { changeVisibility?.(true); },
  lifecycle: () => ({ ...lifecycle }),
  status: () => ({ commit, witness, size: current?.length ?? 0, tables, label: cohortLabel, fillDisabled: true }),
  replace(prefix: string, label: string) { replace(createRows(prefix), label); },
  fresh(label: string, copyRows = true) { replace(current!.map(row => copyRows ? { ...row } : row), label); },
  deleteHalf() {
    deleted = current!.filter((_, index) => index % 2 === 0).map(row => new WeakRef(row));
    replace(current!.filter((_, index) => index % 2 !== 0), "partial-delete");
  },
  releaseControl() { control = null; },
  inspect() {
    const liveRows = new Set(current ?? []);
    const prior = previous?.deref();
    const results = cohorts.map(cohort => {
      let obsoleteRows = 0, currentRows = 0;
      for (const reference of cohort.rows) {
        const row = reference.deref();
        if (row) { if (liveRows.has(row)) currentRows++; else obsoleteRows++; }
      }
      const array = cohort.array.deref();
      return { label: cohort.label, total: cohort.rows.length, obsoleteRows, currentRows,
        obsoleteArray: Boolean(array && array !== current && array !== prior), previousArray: Boolean(array && array === prior) };
    });
    const result = { cohorts: results, deletedAlive: deleted.reduce((sum, ref) => sum + Number(Boolean(ref.deref())), 0),
      currentAlive: currentReferences.reduce((sum, ref) => sum + Number(Boolean(ref.deref())), 0),
      currentArrayAlive: Boolean(currentArrayReference?.deref()),
      controlAlive: Boolean(controlRef.deref()) };
    // 전수 검사한 dead cohort의 wrapper는 매 회차 버려 계측 메모리의 무한 증가를 방지한다.
    cohorts = cohorts.filter((_, index) => {
      const item = results[index]!;
      return item.obsoleteRows > 0 || item.currentRows > 0 || item.obsoleteArray || item.previousArray;
    });
    return result;
  },
  unmount() {
    if (current) cohorts.push({ label: "unmounted-current", array: new WeakRef(current), rows: currentReferences });
    root.unmount(); dispatch = null; current = null; expected = null; previous = null; currentReferences = [];
  },
};
Object.assign(window, { retention: controller });
export type RetentionController = typeof controller;
