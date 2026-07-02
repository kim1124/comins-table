import { useEffect, type ReactNode } from "react";

import type { FeatureId } from "../../features/types";

interface RouteLifecycleBoundaryProps {
  children: ReactNode;
  featureId?: FeatureId;
  routePath: string;
}

export function RouteLifecycleBoundary({ children, featureId, routePath }: RouteLifecycleBoundaryProps) {
  useEffect(() => {
    window.__kmsfDataTableActiveRoute = routePath;

    return () => {
      window.__kmsfDataTableLastRouteUnmount = {
        featureId,
        routePath,
        unmountedAt: Date.now(),
      };
    };
  }, [featureId, routePath]);

  return <>{children}</>;
}
