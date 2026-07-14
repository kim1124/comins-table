import { useEffect, type ReactNode } from "react";

import type { FeatureId } from "../../features/types";

interface RouteLifecycleBoundaryProps {
  children: ReactNode;
  featureId?: FeatureId;
  routePath: string;
}

export function RouteLifecycleBoundary({ children, featureId, routePath }: RouteLifecycleBoundaryProps) {
  useEffect(() => {
    window.__cominsTableActiveRoute = routePath;

    return () => {
      window.__cominsTableLastRouteUnmount = {
        featureId,
        routePath,
        unmountedAt: Date.now(),
      };
    };
  }, [featureId, routePath]);

  return <>{children}</>;
}
