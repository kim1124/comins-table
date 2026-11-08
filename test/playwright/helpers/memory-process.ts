import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CDPSession } from "@playwright/test";

const execute = promisify(execFile);

// RSS는 JS와 native를 포함하는 프로세스 상주량이며, JS 힙과 합산하거나 차감하지 않는다.
export async function readBrowserResidentMemory(session: CDPSession) {
  const { processInfo } = await session.send("SystemInfo.getProcessInfo");
  const ids = [...new Set(processInfo.map(process => process.id))].filter(id => id > 0);
  if (!ids.length || !processInfo.some(process => process.type === "browser")) throw new Error("Browser process memory coverage unavailable");
  const { stdout } = await execute("ps", ["-o", "pid=,rss=", "-p", ids.join(",")]);
  const resident = new Map(stdout.trim().split("\n").map(line => {
    const [id, kibibytes] = line.trim().split(/\s+/u).map(Number);
    if (!id || kibibytes === undefined || !Number.isFinite(kibibytes) || kibibytes <= 0) throw new Error("Invalid process RSS measurement");
    return [id, kibibytes * 1024] as const;
  }));
  if (ids.some(id => !resident.has(id))) throw new Error("A browser process RSS measurement is missing");
  const metrics: Record<string, number> = { browserProcessCount: ids.length, browserResidentBytes: 0, mainResidentBytes: 0, rendererResidentBytes: 0, gpuResidentBytes: 0, utilityResidentBytes: 0, otherResidentBytes: 0 };
  for (const process of processInfo) {
    const bytes = resident.get(process.id);
    if (bytes === undefined) throw new Error("A process class RSS measurement is missing");
    const key = ({ browser: "mainResidentBytes", renderer: "rendererResidentBytes", GPU: "gpuResidentBytes", utility: "utilityResidentBytes" } as Record<string, string>)[process.type] ?? "otherResidentBytes";
    metrics.browserResidentBytes! += bytes;
    metrics[key]! += bytes;
  }
  return metrics;
}
