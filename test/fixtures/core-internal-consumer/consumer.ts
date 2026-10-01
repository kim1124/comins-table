import { createCominsViewportData } from "./src/core/viewport/data";
import { planViewportRequests } from "./src/core/viewport/requests";
import { resolveCominsRowHeight } from "./src/core/layout/row-height";
import { CominsViewportHeightIndex } from "./src/core/layout/viewport";
import { getCominsDataSlotKey } from "./src/core/layout/virtual";
import { resolveCoreFillTarget } from "./src/core/selection/navigation";
import { transferCominsRowBetweenTables } from "./src/core/transfer/policy";

const data = createCominsViewportData<{ id: number }>({ revision: "a", rowCount: 100 });
const request = planViewportRequests({ data, range: { startIndex: 0, endIndex: 10 }, active: [], retryStarts: [] });
const layout = resolveCominsRowHeight({ value: "auto", row: { id: 1 }, layoutKey: "a", rowHeight: 36 });
void [request, layout, new CominsViewportHeightIndex(100, 36), getCominsDataSlotKey(1), resolveCoreFillTarget, transferCominsRowBetweenTables];
