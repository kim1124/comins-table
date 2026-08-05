import { useEffect, useState } from "react";

import { findFeature } from "../features/featureRegistry";
import type { FeatureId } from "../features/types";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

let mountCounter = 0;

export function FeatureContent({ featureId }: { featureId: FeatureId }) {
  const { locale, text } = usePlaygroundLocale();
  const feature = findFeature(featureId, locale);
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
      aria-label={text(defineLocalizedText("Data Table 예제", "Data table example"))}
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
