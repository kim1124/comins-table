import { CominsTable, type CominsTableColumn, type CominsColumnFilterModel, type CominsValueFilterPanelRenderParams } from "../../src";
const model: CominsColumnFilterModel = [{ columnId: "status", operator: "in", values: ["Ready", null] }];
type Row = { id: string; status: string };
const columns: CominsTableColumn<Row>[] = [{ field: "status", label: "Status", filter: {
  kind: "text", mode: "values", option: { render: ({ column, option }) => { const field: string = column.field; return <strong>{field}: {option.label}</strong>; } },
  trigger: { render: p => <div {...p.getTriggerProps<HTMLDivElement>({ element: "custom", ref: node => { const div: HTMLDivElement | null = node; void div; } })}>Filter</div> },
  panel: { render: p => <ul>{p.visibleOptions.map(o => <li key={o.id}><input {...p.getOptionProps(o)} />{p.renderOption(o)}</li>)}</ul> },
} }];
<CominsTable data={[{ id: "1", status: "Ready" }]} columns={columns} columnFiltering={{ model }} />;
// @ts-expect-error values are required for in rules.
const missing: CominsColumnFilterModel = [{ columnId: "status", operator: "in" }];
// @ts-expect-error comparison values cannot accompany an in rule.
const mixed: CominsColumnFilterModel = [{ columnId: "status", operator: "in", values: [], value: "Ready" }];
// @ts-expect-error persistent values must be scalars.
const object: CominsColumnFilterModel = [{ columnId: "status", operator: "in", values: [{}] }];
// @ts-expect-error undefined is not a JSON value.
const undefinedValue: CominsColumnFilterModel = [{ columnId: "status", operator: "in", values: [undefined] }];
function bindings(p: CominsValueFilterPanelRenderParams<Row>) {
  // @ts-expect-error controlled selection attributes cannot be overridden.
  p.getOptionProps(p.options[0]!, { props: { checked: false } });
  // @ts-expect-error native checkbox ref requires an input.
  p.getOptionProps(p.options[0]!, { ref: (node: HTMLTextAreaElement | null) => { void node; } });
}
void [missing, mixed, object, undefinedValue, bindings];
