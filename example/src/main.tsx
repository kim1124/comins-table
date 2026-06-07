import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ChevronsLeft, ChevronsRight, Library, TableProperties } from "lucide-react";

import { FeatureDocsPanel } from "./components/FeatureDocsPanel";
import { Button } from "./components/ui/button";
import { ScrollArea } from "./components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { featureRegistry, findFeature } from "./features/featureRegistry";
import type { FeatureId } from "./features/types";
import "./styles.css";

let mountCounter = 0;

function FeatureContent({ featureId }: { featureId: FeatureId }) {
  const feature = findFeature(featureId);
  const [mountId] = useState(() => {
    mountCounter += 1;
    return `${feature.id}-${mountCounter}`;
  });
  const FeatureComponent = feature.Component;

  useEffect(() => {
    const lifecycle = (window.__kmsfDataTableLifecycle ??= {
      activeMountCount: 0,
      mountCount: 0,
      unmountCount: 0,
    });

    lifecycle.activeMountCount += 1;
    lifecycle.mountCount += 1;
    window.__kmsfDataTableActiveMount = mountId;

    return () => {
      lifecycle.activeMountCount = Math.max(0, lifecycle.activeMountCount - 1);
      lifecycle.unmountCount += 1;
      window.__kmsfDataTableLastUnmount = mountId;
    };
  }, [mountId]);

  return (
    <main
      aria-label="데이터 테이블 예제"
      className="example-content"
      data-feature={feature.id}
      data-feature-label={feature.label}
      data-testid="feature-content"
    >
      <div className="content-header">
        <div>
          <p className="eyebrow">기능</p>
          <h1>{feature.label}</h1>
        </div>
        <span data-testid="mount-id">{mountId}</span>
      </div>
      <p className="feature-summary" data-testid="feature-summary">
        {feature.summary}
      </p>
      <FeatureComponent />
    </main>
  );
}

function FeatureNavigation({
  activeFeature,
  collapsed,
  onCollapseToggle,
  onSelectFeature,
}: {
  activeFeature: FeatureId;
  collapsed: boolean;
  onCollapseToggle: () => void;
  onSelectFeature: (feature: FeatureId) => void;
}) {
  return (
    <aside aria-label="데이터 테이블 기능 메뉴" className="feature-aside" data-collapsed={collapsed}>
      <div className="aside-header">
        <div className="aside-heading">
          <Library aria-hidden="true" size={18} />
          {!collapsed ? <strong>기능 메뉴</strong> : null}
        </div>
        <Button
          aria-label={collapsed ? "기능 메뉴 펼치기" : "기능 메뉴 접기"}
          size="icon"
          variant="ghost"
          onClick={onCollapseToggle}
        >
          {collapsed ? <ChevronsRight aria-hidden="true" size={17} /> : <ChevronsLeft aria-hidden="true" size={17} />}
        </Button>
      </div>
      <ScrollArea className="feature-menu-scroll">
        <nav aria-label="데이터 테이블 기능" className="feature-menu">
          {featureRegistry.map((feature) => (
            <Button
              aria-label={feature.label}
              aria-pressed={activeFeature === feature.id}
              className="feature-menu-button"
              key={feature.id}
              onClick={() => {
                if (feature.id !== activeFeature) {
                  onSelectFeature(feature.id);
                }
              }}
              title={collapsed ? feature.summary : undefined}
              variant="ghost"
            >
              <TableProperties aria-hidden="true" size={17} />
              {!collapsed ? (
                <span className="feature-menu-button__text">
                  <span>{feature.label}</span>
                  <small>{feature.summary}</small>
                </span>
              ) : null}
            </Button>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}

function App() {
  const [activeFeature, setActiveFeature] = useState<FeatureId>("basic");
  const [isNavigationCollapsed, setIsNavigationCollapsed] = useState(false);
  const activeFeatureDefinition = findFeature(activeFeature);

  return (
    <div className="example-shell">
      <header className="example-topbar">
        <div>
          <p className="example-kicker">Example and docs</p>
          <h1>@kmsf/data-table</h1>
        </div>
        <div className="topbar-actions">
          <Button variant="secondary">React Table Playground</Button>
        </div>
      </header>
      <Tabs className="workspace-tabs" defaultValue="examples">
        <div className="workspace-tabs__bar">
          <TabsList aria-label="플레이그라운드 보기">
            <TabsTrigger value="examples">기능 예제</TabsTrigger>
            <TabsTrigger value="notes">문서 요약</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="examples">
          <div className="docs-layout">
            <FeatureNavigation
              activeFeature={activeFeature}
              collapsed={isNavigationCollapsed}
              onCollapseToggle={() => setIsNavigationCollapsed((value) => !value)}
              onSelectFeature={setActiveFeature}
            />
            <FeatureContent featureId={activeFeature} key={activeFeature} />
            <FeatureDocsPanel feature={activeFeatureDefinition} key={`docs-${activeFeature}`} />
          </div>
        </TabsContent>
        <TabsContent value="notes">
          <main className="example-content" data-feature="notes">
            <div className="content-header">
              <div>
                <p className="eyebrow">문서</p>
                <h1>플레이그라운드 구성</h1>
              </div>
            </div>
            <p className="feature-summary">
              왼쪽 기능 메뉴, 중앙 예제, 오른쪽 문서 패널로 구성하며 기능 메뉴 이동 시 예제 인스턴스를 새로 생성합니다.
            </p>
          </main>
        </TabsContent>
      </Tabs>
    </div>
  );
}

declare global {
  interface Window {
    __kmsfDataTableActiveMount?: string;
    __kmsfDataTableLifecycle?: {
      activeMountCount: number;
      mountCount: number;
      unmountCount: number;
    };
    __kmsfDataTableLastUnmount?: string;
  }
}

createRoot(document.getElementById("root")!).render(<App />);
