import { useLayoutEffect, useRef } from "react";
import { CominsTable, type CominsTableRef } from "comins-table";
import "comins-table/styles.css";
import { start, useBeforeLeave } from "./app";

type Row = { id: string; items: Array<{ label: string; value: string }> };
function Feature() {
  const tableRef = useRef<CominsTableRef<Row>>(null);
  const leave = useBeforeLeave();
  const host = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const element = host.current!;
    const onFocusIn = () => (window as any).focusFixture.counts.nativeFocusIn++;
    element.addEventListener("focusin", onFocusIn);
    leave.current = () => {
      const fixture = (window as any).focusFixture;
      if (fixture.useApi && typeof tableRef.current?.releaseFocus === "function") {
        fixture.counts.apiCalls++;
        fixture.counts.focusChanged = tableRef.current.releaseFocus();
      }
    };
    return () => { element.removeEventListener("focusin", onFocusIn); leave.current = null; };
  }, [leave]);
  return <section ref={host}><CominsTable ref={tableRef} columns={[{field:"items",label:"Items",cell:{components:[{type:"virtual-list",items:({row})=>row.data.items,props:{searchable:true,more:true,"aria-label":"Search items"}}]}}]} data={[{id:"a",items:Array.from({length:12},(_,i)=>({label:`Item ${i}`,value:`item-${i}`}))}]} getRowId={row=>row.id} rowHeight={180} style={{height:260,width:600}} /></section>;
}
start(Feature);
