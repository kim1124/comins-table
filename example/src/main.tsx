import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ChevronsLeft,
  ChevronsRight,
  Database,
  GripVertical,
  Library,
  Maximize2,
  Menu,
  MousePointerClick,
  PanelTop,
  Rows3,
  SquareMousePointer,
  TableProperties,
  type LucideIcon,
} from "lucide-react";

import { OptionGuideSection } from "./components/OptionGuideSection";
import { Button } from "./components/ui/button";
import { ScrollArea } from "./components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { featureRegistry, findFeature } from "./features/featureRegistry";
import type { FeatureId } from "./features/types";
import "./styles.css";
import "../../styles.css";

let mountCounter = 0;

const featureIconMap: Record<FeatureId, LucideIcon> = {
  basic: TableProperties,
  "basic-crud": SquareMousePointer,
  body: Database,
  cell: MousePointerClick,
  component: Rows3,
  "context-menu": Menu,
  header: PanelTop,
  row: GripVertical,
  size: Maximize2,
};

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
      <span className="sr-only" data-testid="mount-id">
        {mountId}
      </span>
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
          {featureRegistry.map((feature) => {
            const FeatureIcon = featureIconMap[feature.id];

            return (
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
                <FeatureIcon aria-hidden="true" data-feature-icon={feature.id} size={17} />
                {!collapsed ? (
                  <span className="feature-menu-button__text">
                    <span>{feature.label}</span>
                    <small>{feature.summary}</small>
                  </span>
                ) : null}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}

function App() {
  const [activeFeature, setActiveFeature] = useState<FeatureId>("basic");
  const [isNavigationCollapsed, setIsNavigationCollapsed] = useState(false);

  return (
    <Tabs className="example-shell workspace-tabs" defaultValue="examples">
      <header className="example-topbar">
        <div>
          <p className="example-kicker">Example and docs</p>
          <h1>@kmsf/data-table</h1>
        </div>
        <div className="topbar-actions">
          <TabsList aria-label="플레이그라운드 보기">
            <TabsTrigger value="examples">기능 예제</TabsTrigger>
            <TabsTrigger value="options">옵션 가이드</TabsTrigger>
          </TabsList>
        </div>
      </header>
      <TabsContent value="examples">
        <div className="docs-layout">
          <FeatureNavigation
            activeFeature={activeFeature}
            collapsed={isNavigationCollapsed}
            onCollapseToggle={() => setIsNavigationCollapsed((value) => !value)}
            onSelectFeature={setActiveFeature}
          />
          <FeatureContent featureId={activeFeature} key={activeFeature} />
        </div>
      </TabsContent>
      <TabsContent value="options">
        <main className="example-content" data-feature="options">
          <div className="content-header">
            <div>
              <p className="eyebrow">옵션</p>
              <h1>옵션 가이드</h1>
            </div>
          </div>
          <p className="feature-summary">
            현재 구현된 props, events, ref method, core helper와 후속 기능 경계를 정리합니다.
          </p>
          <OptionGuideSection />
        </main>
      </TabsContent>
    </Tabs>
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
