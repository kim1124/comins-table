/** The registry only observes identity and DOM fields; adapter metadata stays opaque. */
export type BrowserTransferSnapshot = {
  config: { coordinator: object; scope: string; tableId: string };
  endpoint: { tableId: string };
  instanceId: string;
  root: HTMLElement | null;
  viewport: HTMLElement | null;
};
type Registration<TSnapshot> = { getSnapshot: () => TSnapshot | null };

export function createTableTransferRegistry<TSnapshot extends BrowserTransferSnapshot>() {
  const scopes = new Map<string, Map<string, Set<Registration<TSnapshot>>>>();
  return {
    register(scope: string, tableId: string, registration: Registration<TSnapshot>) {
      let tables = scopes.get(scope);
      if (!tables) { tables = new Map(); scopes.set(scope, tables); }
      let registrations = tables.get(tableId);
      if (!registrations) { registrations = new Set(); tables.set(tableId, registrations); }
      registrations.add(registration);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        registrations.delete(registration);
        if (registrations.size === 0) tables.delete(tableId);
        if (tables.size === 0) scopes.delete(scope);
      };
    },
    get(scope: string, tableId: string) {
      const registrations = scopes.get(scope)?.get(tableId);
      return registrations?.size === 1 ? [...registrations][0] ?? null : null;
    },
  };
}

export function getRegisteredTransferSnapshot<TSnapshot extends BrowserTransferSnapshot>(
  registry: ReturnType<typeof createTableTransferRegistry<TSnapshot>>,
  coordinator: object, scope: string, tableId: string,
) {
  const snapshot = registry.get(scope, tableId)?.getSnapshot() ?? null;
  if (!snapshot || snapshot.config.coordinator !== coordinator || snapshot.config.scope !== scope || snapshot.config.tableId !== tableId || snapshot.endpoint.tableId !== tableId) return null;
  return snapshot;
}

export function getCrossTableTransferHit<TSnapshot extends BrowserTransferSnapshot>(input: {
  sourceTableId: string;
  scope: string;
  instanceId: string;
  root: HTMLElement | null;
  clientX: number;
  clientY: number;
  document: Pick<Document, "elementFromPoint">;
  getSnapshot: (tableId: string) => TSnapshot | null;
}) {
  const sourceSnapshot = input.getSnapshot(input.sourceTableId);
  const element = input.document.elementFromPoint(input.clientX, input.clientY) as HTMLElement | null;
  const root = element?.closest<HTMLElement>("[data-comins-table-instance-id]") ?? null;
  const tableId = root?.dataset.cominsTransferTableId;
  if (!sourceSnapshot || sourceSnapshot.instanceId !== input.instanceId || sourceSnapshot.root !== input.root || !element || !root || !tableId || tableId === input.sourceTableId || root.dataset.cominsTransferScope !== input.scope) return null;
  const snapshot = input.getSnapshot(tableId);
  if (!snapshot || snapshot.root !== root || snapshot.instanceId !== root.dataset.cominsTableInstanceId || !snapshot.viewport || !root.contains(snapshot.viewport)) return null;
  return { element, root, snapshot };
}
