import type { CDPSession } from "@playwright/test";

export const MEMORY_SCROLL_DELIVERY_PROTOCOL = "direct CDP in initial main/default context; ordinary DOM viewport already attached and visible; context setup before cold-before-tooling";

// Keep this browser function fixed. Only a primitive fraction crosses the protocol.
const scrollFunction = `async function(value) {
  const matches = document.querySelectorAll('[data-testid="data-table-viewport"]');
  if (matches.length !== 1) throw new Error('Expected exactly one memory viewport');
  const element = matches[0];
  const range = element.scrollHeight - element.clientHeight;
  if (range <= 0) throw new Error('Memory workload has no scrollable range');
  element.scrollTop = range * value;
  element.dispatchEvent(new Event('scroll', { bubbles: true }));
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  if (value > 0 && element.scrollTop <= 0) throw new Error('Memory workload did not scroll');
}`;

type ContextEvent = { context: { id: number; auxData?: { frameId?: string; isDefault?: boolean } } };

/** Not a general Locator replacement: callers establish the ordinary-DOM viewport's readiness. */
export async function createMemoryScroller(session: CDPSession) {
  const frame = (await session.send("Page.getFrameTree")).frameTree.frame.id;
  let context: number | undefined;
  let invalid = false;
  let disposed = false;
  const created = (event: ContextEvent) => {
    if (event.context.auxData?.frameId !== frame || event.context.auxData.isDefault !== true) return;
    if (context !== undefined && context !== event.context.id) invalid = true;
    context = event.context.id;
  };
  const destroyed = (event: { executionContextId: number }) => {
    if (event.executionContextId === context) invalid = true;
  };
  const cleared = () => { if (context !== undefined) invalid = true; };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    session.off("Runtime.executionContextCreated", created);
    session.off("Runtime.executionContextDestroyed", destroyed);
    session.off("Runtime.executionContextsCleared", cleared);
  };
  session.on("Runtime.executionContextCreated", created);
  session.on("Runtime.executionContextDestroyed", destroyed);
  session.on("Runtime.executionContextsCleared", cleared);
  try {
    await session.send("Runtime.enable");
    if (context === undefined || invalid) throw new Error("Initial memory scroll context unavailable");
  } catch (error) {
    dispose();
    throw error;
  }
  const verify = () => {
    if (disposed || invalid || context === undefined) throw new Error("Memory scroll context changed or disposed");
  };
  return {
    verify,
    async scroll(fraction: number) {
      if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) throw new Error("Invalid memory scroll fraction");
      verify();
      const response = await session.send("Runtime.callFunctionOn", {
        functionDeclaration: scrollFunction, executionContextId: context,
        arguments: [{ value: fraction }], returnByValue: true, awaitPromise: true, userGesture: true,
      });
      if (response.exceptionDetails) throw new Error(`Memory scroll failed: ${response.exceptionDetails.text}`);
      if (disposed || invalid) throw new Error("Memory scroll context changed during operation");
    },
    dispose,
  };
}
