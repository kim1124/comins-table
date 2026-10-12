// Typecheck application and worker protocols as well as the public library.
import { XlsxFileSample } from "../../example/src/features/XlsxFileSample";
type WorkerModule = typeof import("../../example/src/features/xlsx-file.worker");
void XlsxFileSample;
export type { WorkerModule };

import { CsvFileSample } from "../../example/src/features/CsvFileSample";
void CsvFileSample;
