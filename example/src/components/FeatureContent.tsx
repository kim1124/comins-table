import { useEffect, useState } from "react";

import { findFeature } from "../features/featureRegistry";
import type { FeatureId } from "../features/types";

let mountCounter = 0;

export function FeatureContent({ featureId }: { featureId: FeatureId }) {
  const feature = findFeature(featureId);
  const [mountId] = useState(() => {
    mountCounter += 1;
    return `${feature.id}-${mountCounter}`;
  });
  const FeatureComponent = feature.Component;

  useEffect(() => {
    const lifecycle = (window.__cominsTableLifecycle ??= {
      activeMountCount: 0,
      mountCount: 0,
      unmountCount: 0,
    });

    lifecycle.activeMountCount += 1;
    lifecycle.mountCount += 1;
    window.__cominsTableActiveMount = mountId;

    return () => {
      lifecycle.activeMountCount = Math.max(0, lifecycle.activeMountCount - 1);
      lifecycle.unmountCount += 1;
      window.__cominsTableLastUnmount = mountId;
    };
  }, [mountId]);

  return (
    <section
      aria-label="데이터 테이블 예제"
      className="example-content"
      data-feature={feature.id}
      data-feature-label={feature.label}
      data-testid="feature-content"
    >
      <span className="sr-only" data-testid="mount-id">
        {mountId}
      </span>
      <FeatureComponent />
    </section>
  );
}

declare global {
  interface Window {
    __cominsTableActiveMount?: string;
    __cominsTableActiveRoute?: string;
    __cominsTableLastRouteUnmount?: {
      featureId?: FeatureId;
      routePath: string;
      unmountedAt: number;
    };
    __cominsTableLifecycle?: {
      activeMountCount: number;
      mountCount: number;
      unmountCount: number;
    };
    __cominsTableLastUnmount?: string;
  }
}
