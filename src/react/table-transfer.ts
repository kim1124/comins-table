import type React from "react";
import { useEffect } from "react";
import { createTableTransferRegistry, getRegisteredTransferSnapshot as getBrowserSnapshot } from "../browser/table-transfer";
import type { CominsTableTransferConflictResolver, CominsTableTransferIntent, CominsTableTransferRejection, CominsTableTransferResult, CominsTableTransferEndpoint } from "../core/transfer/policy";
export * from "../core/transfer/policy";

export type CominsTableTransferRejectionFeedback<TData, TGroup = never> = {
  duration?: number;
  renderTooltip?: (
    rejection: CominsTableTransferRejection<TData, TGroup>,
  ) => React.ReactNode;
};

declare const cominsTableTransferCoordinatorBrand: unique symbol;

export type CominsTableTransferCoordinator<TData, TGroup = never> = {
  readonly [cominsTableTransferCoordinatorBrand]: (
    data: TData,
    group: TGroup,
  ) => [TData, TGroup];
};

export type CominsTableTransferCoordinatorOptions<TData, TGroup = never> = {
  onTransfer: (result: CominsTableTransferResult<TData, TGroup>) => void;
  onTransferRejected?: (
    rejection: CominsTableTransferRejection<TData, TGroup>,
  ) => void;
};

export type CominsTableTransferConfig<TData, TGroup = never> = {
  canTransfer?: (intent: CominsTableTransferIntent<TData, TGroup>) => boolean;
  coordinator: CominsTableTransferCoordinator<TData, TGroup>;
  rejectionFeedback?: false | CominsTableTransferRejectionFeedback<TData, TGroup>;
  resolveConflict?: CominsTableTransferConflictResolver<TData, TGroup>;
  scope: string;
  tableId: string;
};

export type CominsTableTransferRegistrationSnapshot<TData, TGroup> = {
  config: CominsTableTransferConfig<TData, TGroup>;
  endpoint: CominsTableTransferEndpoint<TData, TGroup>;
  instanceId: string;
  root: HTMLElement | null;
  viewport: HTMLElement | null;
};

export type CominsTableTransferRegistration<TData, TGroup> = {
  getSnapshot: () => CominsTableTransferRegistrationSnapshot<TData, TGroup> | null;
};

type CominsTableTransferCoordinatorState<TData, TGroup> = {
  options: CominsTableTransferCoordinatorOptions<TData, TGroup>;
  registry: ReturnType<typeof createTableTransferRegistry<CominsTableTransferRegistrationSnapshot<TData, TGroup>>>;
};

const coordinatorStates = new WeakMap<
  object,
  CominsTableTransferCoordinatorState<unknown, unknown>
>();

function getCoordinatorState<TData, TGroup>(
  coordinator: CominsTableTransferCoordinator<TData, TGroup>,
) {
  return coordinatorStates.get(coordinator) as
    | CominsTableTransferCoordinatorState<TData, TGroup>
    | undefined;
}

export function createCominsTableTransferCoordinator<TData, TGroup = never>(
  options: CominsTableTransferCoordinatorOptions<TData, TGroup>,
): CominsTableTransferCoordinator<TData, TGroup> {
  const coordinator = Object.freeze({}) as CominsTableTransferCoordinator<TData, TGroup>;

  coordinatorStates.set(
    coordinator,
    {
      options,
      registry: createTableTransferRegistry<CominsTableTransferRegistrationSnapshot<TData, TGroup>>(),
    } as CominsTableTransferCoordinatorState<unknown, unknown>,
  );

  return coordinator;
}

export function isCominsTableTransferCoordinator<TData, TGroup>(
  coordinator: unknown,
): coordinator is CominsTableTransferCoordinator<TData, TGroup> {
  return typeof coordinator === "object" && coordinator !== null && coordinatorStates.has(coordinator);
}

export function registerCominsTableTransfer<TData, TGroup>(coordinator: CominsTableTransferCoordinator<TData, TGroup>, scope: string, tableId: string, registration: CominsTableTransferRegistration<TData, TGroup>) {
  return getCoordinatorState(coordinator)?.registry.register(scope, tableId, registration) ?? (() => undefined);
}

export function getCominsTableTransferRegistration<TData, TGroup>(coordinator: CominsTableTransferCoordinator<TData, TGroup>, scope: string, tableId: string) {
  return getCoordinatorState(coordinator)?.registry.get(scope, tableId) ?? null;
}

export function getRegisteredTransferSnapshot<TData, TGroup>(coordinator: CominsTableTransferCoordinator<TData, TGroup>, scope: string, tableId: string) {
  const state = getCoordinatorState(coordinator);
  return state ? getBrowserSnapshot(state.registry, coordinator, scope, tableId) : null;
}

export function useCominsTableTransferRegistration<TData, TGroup>(input: {
  config: CominsTableTransferConfig<TData, TGroup> | undefined;
  snapshot: { current: CominsTableTransferRegistrationSnapshot<TData, TGroup> | null };
  root: { current: HTMLElement | null };
  viewport: { current: HTMLElement | null };
}) {
  const { snapshot, root, viewport } = input;
  const coordinator = input.config?.coordinator;
  const scope = input.config?.scope;
  const tableId = input.config?.tableId;
  useEffect(() => {
    if (!coordinator || !scope || !tableId) return undefined;
    return registerCominsTableTransfer(coordinator, scope, tableId, {
      getSnapshot: () => snapshot.current ? { ...snapshot.current, root: root.current, viewport: viewport.current } : null,
    });
  }, [coordinator, scope, tableId, snapshot, root, viewport]);
}

export function emitCominsTableTransfer<TData, TGroup>(
  coordinator: CominsTableTransferCoordinator<TData, TGroup>,
  result: CominsTableTransferResult<TData, TGroup>,
) {
  const state = getCoordinatorState(coordinator);

  if (!state) {
    return false;
  }

  state.options.onTransfer(result);
  return true;
}

export function emitCominsTableTransferRejected<TData, TGroup>(
  coordinator: CominsTableTransferCoordinator<TData, TGroup>,
  rejection: CominsTableTransferRejection<TData, TGroup>,
) {
  const state = getCoordinatorState(coordinator);

  if (!state) {
    return false;
  }

  state.options.onTransferRejected?.(rejection);
  return true;
}
