import { useMemo } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";

import { createDocsNavGroups, createDocsPages } from "../../docs/docsRoutes";
import { usePlaygroundLocale } from "../../i18n/playground-locale";
import { ReadmeDemoPage } from "../../readme/ReadmeDemoPage";
import { DocsArticle } from "./DocsArticle";
import { DocsSidebar } from "./DocsSidebar";
import { DocsTopNav } from "./DocsTopNav";
import { RouteLifecycleBoundary } from "./RouteLifecycleBoundary";

export function DocsShell() {
  const location = useLocation();
  const { locale } = usePlaygroundLocale();
  const docsPages = useMemo(() => createDocsPages(locale), [locale]);
  const docsNavGroups = useMemo(() => createDocsNavGroups(docsPages), [docsPages]);

  if (location.pathname === "/readme-demo") {
    return <ReadmeDemoPage />;
  }

  return (
    <div className="docs-shell">
      <DocsTopNav pages={docsPages} />
      <div className="docs-shell__body">
        <DocsSidebar groups={docsNavGroups} />
        <main className="docs-shell__content">
          <Routes key={location.pathname} location={location}>
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
          </Routes>
        </main>
      </div>
    </div>
  );
}
