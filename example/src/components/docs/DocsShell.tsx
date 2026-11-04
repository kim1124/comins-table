import { useLayoutEffect, useMemo, useRef } from "react";
import { createRoutesFromElements, Navigate, Route, useLocation, useRoutes, type Location, type RouteObject } from "react-router";

import { createDocsNavGroups, createDocsPages } from "../../docs/docsRoutes";
import { usePlaygroundLocale } from "../../i18n/playground-locale";
import { ReadmeDemoPage } from "../../readme/ReadmeDemoPage";
import { DocsArticle } from "./DocsArticle";
import { DocsSidebar } from "./DocsSidebar";
import { DocsTopNav } from "./DocsTopNav";
import { RouteLifecycleBoundary } from "./RouteLifecycleBoundary";

function DocsRoutes({ routes, location }: { routes: RouteObject[]; location: Location }) {
  return useRoutes(routes, location);
}

export function DocsShell() {
  const location = useLocation();
  const contentRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    contentRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.key, location.pathname]);
  const { locale } = usePlaygroundLocale();
  const docsPages = useMemo(() => createDocsPages(locale), [locale]);
  const docsNavGroups = useMemo(() => createDocsNavGroups(createDocsPages("en")), []);

  // 문서 목록이 같으면 JSX와 라우트 정의를 재사용하고 pathname key로 종료 경계를 유지한다.
  const routeElements = useMemo(() => (
    <>
      <Route element={<Navigate replace to="/docs/getting-started" />} path="/" />
      <Route element={<Navigate replace to="/docs/getting-started" />} path="/examples/basic" />
      <Route element={<Navigate replace to="/performance/virtualization" />} path="/examples/body" />
      <Route element={<Navigate replace to="/examples/column-groups" />} path="/examples/header-groups" />
      {docsPages.map((page) => (
        <Route
          element={
            <RouteLifecycleBoundary featureId={page.featureId} routePath={page.path}>
              <DocsArticle page={page} />
            </RouteLifecycleBoundary>
          }
          key={page.path}
          path={page.path}
        />
      ))}
      <Route element={<Navigate replace to="/docs/getting-started" />} path="*" />
    </>
  ), [docsPages]);
  const routeObjects = useMemo(() => createRoutesFromElements(routeElements), [routeElements]);

  if (location.pathname === "/readme-demo") {
    return <ReadmeDemoPage />;
  }

  return (
    <div className="docs-shell">
      <DocsTopNav pages={docsPages} />
      <div className="docs-shell__body">
        <DocsSidebar groups={docsNavGroups} />
        <main className="docs-shell__content" ref={contentRef}>
          <DocsRoutes key={location.pathname} location={location} routes={routeObjects} />
        </main>
      </div>
    </div>
  );
}
