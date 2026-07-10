import type { ReactNode } from "react";

import { dataTableOptionGuide } from "./dataTableOptionGuide";
import {
  apiSamples,
  bodySamples,
  cellSamples,
  componentSamples,
  contextMenuSamples,
  crudSamples,
  exportSamples,
  headerGroupSamples,
  headerSamples,
  installSamples,
  infiniteScrollSamples,
  lazyLoadSamples,
  loadingSamples,
  paginationSamples,
  refApiSamples,
  rowSamples,
  sizeSamples,
  themeSamples,
} from "./codeSamples";
import type { DocsCodeSample, DocsPage } from "./types";
import { findFeature } from "../features/featureRegistry";
import type { FeatureId } from "../features/types";

function paragraphs(lines: string[]) {
  return (
    <>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </>
  );
}

function featurePage({
  body,
  category,
  codeSamples,
  featureId,
  label,
  path,
  summary,
  title,
}: {
  body: ReactNode;
  category: string;
  codeSamples: DocsCodeSample[];
  featureId: FeatureId;
  label?: string;
  path: string;
  summary?: string;
  title?: string;
}): DocsPage {
  const feature = findFeature(featureId);

  return {
    body,
    category,
    codeSamples,
    featureId,
    label: label ?? feature.label,
    path,
    summary: summary ?? feature.summary,
    title: title ?? label ?? feature.label,
  };
}

function ImplementedApiReference() {
  const implementedUsageItems = dataTableOptionGuide
    .find((group) => group.title === "Roadmap")
    ?.items.filter((item) => item.name === "data + onChangeData" || item.name === "CSR");
  const implementedGroups = [
    ...dataTableOptionGuide.filter((group) => group.title !== "Roadmap"),
    ...(implementedUsageItems?.length
      ? [
          {
            items: implementedUsageItems,
            title: "Usage Contract",
          },
        ]
      : []),
  ];

  return (
    <div className="docs-reference-list">
      {implementedGroups.map((group) => (
        <section key={group.title} className="docs-reference-list__group">
          <h2>{group.title}</h2>
          <dl>
            {group.items.map((item) => (
              <div key={item.name} className="docs-reference-list__item">
                <dt>{item.name}</dt>
                <dd>{item.description}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

export const docsPages: DocsPage[] = [
  {
    body: paragraphs([
      "패키지를 설치한 뒤 스타일과 DataTable 컴포넌트를 함께 import합니다.",
      "이 문서 playground는 구현된 기능만 route와 sidebar에 노출하며, 각 페이지에서 설명, 코드, 예제를 함께 확인합니다.",
    ]),
    category: "시작하기",
    codeSamples: installSamples,
    featureId: "basic",
    label: "Getting Started",
    path: "/docs/getting-started",
    summary: "설치, CSS import, 첫 번째 DataTable 렌더링 흐름을 확인합니다.",
    title: "시작하기",
  },
  featurePage({
    body: paragraphs(["선택된 Row를 기준으로 추가, 수정, 삭제, 조회 흐름을 확인합니다."]),
    category: "기본",
    codeSamples: crudSamples,
    featureId: "basic-crud",
    path: "/examples/crud",
  }),
  featurePage({
    body: paragraphs(["고정 높이와 부모 높이를 따르는 테이블 컨테이너 계약을 확인합니다."]),
    category: "기본",
    codeSamples: sizeSamples,
    featureId: "size",
    path: "/examples/size",
  }),
  featurePage({
    body: paragraphs([
      "Theme은 배포 CSS에 정의된 custom properties와 theme class로 테이블 표면, Header, 선택 상태, 내장 컴포넌트 색상을 즉시 변경합니다.",
      "Virtualized table에서 행 높이를 바꾸려면 CSS 변수만 override하지 말고 `rowHeight` prop과 같은 값으로 맞춰야 합니다.",
    ]),
    category: "Styling",
    codeSamples: themeSamples,
    featureId: "theme",
    label: "Theme",
    path: "/examples/theme",
    summary: "Basic, Dark, Skyblue, Mint, Gray, Orange 샘플 테마와 CSS override 계약을 확인합니다.",
    title: "Theme",
  }),
  featurePage({
    body: paragraphs([
      "초기 로딩은 데이터가 아직 없을 때 skeleton row로 화면 구조를 유지합니다.",
      "재조회 로딩은 기존 Row를 유지한 상태에서 overlay를 표시하고, 빈 데이터 상태에서는 emptyComponent를 출력합니다.",
    ]),
    category: "기본",
    codeSamples: loadingSamples,
    featureId: "loading",
    label: "Loading / Empty State",
    path: "/examples/loading",
    summary: "초기 skeleton, 재조회 overlay, 빈 데이터 상태와 Header 유지 방식을 확인합니다.",
    title: "Loading / Empty State",
  }),
  featurePage({
    body: paragraphs(["1Depth Header의 컬럼 이동, 리사이즈, 레이아웃 저장과 불러오기를 확인합니다."]),
    category: "Header",
    codeSamples: headerSamples,
    featureId: "header",
    label: "Header 기본 기능",
    path: "/examples/header",
    title: "Header 기본 기능",
  }),
  featurePage({
    body: paragraphs([
      "2Depth Header는 부모 Header 그룹과 자식 컬럼으로 구성됩니다.",
      "부모 resize는 자식 컬럼 비율을 유지하고, 부모 이동은 자식 컬럼 묶음을 함께 이동합니다.",
    ]),
    category: "Header",
    codeSamples: headerGroupSamples,
    featureId: "column-groups",
    label: "Header 그룹",
    path: "/examples/column-groups",
    summary: "Header 그룹화, 부모 resize, 부모 이동, 컬럼 표시 상태를 확인합니다.",
    title: "Header 그룹",
  }),
  featurePage({
    body: paragraphs(["Cell 포맷, 스타일, 이벤트, renderer, Context Menu 연결 방식을 확인합니다."]),
    category: "Cell",
    codeSamples: cellSamples,
    featureId: "cell",
    path: "/examples/cell",
  }),
  featurePage({
    body: paragraphs(["Header와 Cell에 적용되는 내장 컴포넌트와 사용자 정의 renderer를 확인합니다."]),
    category: "Cell",
    codeSamples: componentSamples,
    featureId: "component",
    path: "/examples/component",
  }),
  featurePage({
    body: paragraphs(["Row 스타일, 이벤트, 드래그 이동, 비활성화, 커스터마이징을 확인합니다."]),
    category: "Row / Context",
    codeSamples: rowSamples,
    featureId: "row",
    path: "/examples/row",
  }),
  featurePage({
    body: paragraphs(["Row 또는 Cell 우클릭 시 selection과 callback payload가 어떻게 전달되는지 확인합니다."]),
    category: "Row / Context",
    codeSamples: contextMenuSamples,
    featureId: "context-menu",
    path: "/examples/context-menu",
  }),
  featurePage({
    body: paragraphs([
      "Export helper는 테이블 UI 상태와 분리된 순수 함수입니다.",
      "현재 rows와 value getter 기반 export column을 전달하면 CSV 또는 JSON 문자열을 생성합니다.",
    ]),
    category: "API",
    codeSamples: exportSamples,
    featureId: "export",
    label: "Export Helper",
    path: "/examples/export",
    summary: "CSV/JSON export helper 사용 방식을 확인합니다.",
    title: "Export Helper",
  }),
  {
    body: <ImplementedApiReference />,
    category: "API",
    codeSamples: apiSamples,
    label: "Props",
    path: "/api/props",
    summary: "현재 구현된 Props, Events, Ref/Core 항목만 정리합니다.",
    title: "Props",
  },
  {
    body: paragraphs([
      "`CominsTableRef<TData>`는 외부 명령형 제어가 필요한 selection, sort, layout, row movement 작업만 제공합니다.",
      "`setSelectedRow`, `setSelectedRows`, `setMoveTargetRow`는 현재 정렬과 pagination이 반영된 visible index 기준으로 동작합니다.",
      "데이터 변경은 Ref가 직접 소유하지 않고 `data`와 `onChangeData`의 controlled flow로 전달됩니다.",
    ]),
    category: "API",
    codeSamples: refApiSamples,
    label: "Ref API",
    path: "/api/ref",
    summary: "현재 구현된 ref method와 core helper 경계를 확인합니다.",
    title: "Ref API",
  },
  featurePage({
    body: paragraphs([
      "pagination prop은 현재 pageIndex와 pageSize를 DataTable에 전달합니다.",
      "첫 페이지, 이전 페이지, 다음 페이지, 마지막 페이지 버튼처럼 외부 UI에서 페이지 상태를 관리할 수 있습니다.",
    ]),
    category: "Body / Performance",
    codeSamples: paginationSamples,
    featureId: "pagination",
    label: "Pagination",
    path: "/performance/pagination",
    summary: "일반 데이터셋의 pageIndex, pageSize, 외부 페이지 이동 UI를 확인합니다.",
    title: "Pagination",
  }),
  featurePage({
    body: paragraphs([
      "Infinite Scroll 예제는 원격 API에서 offset/limit batch를 가져와 viewport 하단 근접 시 Row를 계속 append합니다.",
      "`onLazyLoad`는 offset, limit, AbortSignal을 받아 datasource 요청을 수행하고, 응답 total을 기준으로 추가 요청 여부를 판단합니다.",
      "새로고침은 내부 Row 배열을 offset 0 요청 결과로 교체하여 처음부터 다시 로드합니다.",
    ]),
    category: "Body / Performance",
    codeSamples: infiniteScrollSamples,
    featureId: "infinite-scroll",
    label: "Infinite Scroll",
    path: "/performance/infinite-scroll",
    summary: "원격 API batch를 append하는 Infinite Scroll 흐름을 확인합니다.",
    title: "Infinite Scroll",
  }),
  featurePage({
    body: paragraphs([
      "Lazy Load는 DataTable이 네트워크를 직접 소유하지 않고 `onLazyLoad`로 offset, limit, AbortSignal을 전달합니다.",
      "첫 요청은 skeleton, 재조회는 overlay, append 요청은 하단 loading row와 연결할 수 있으며 overlay는 table scroll 위치와 무관하게 viewport에 표시됩니다.",
    ]),
    category: "Body / Performance",
    codeSamples: lazyLoadSamples,
    featureId: "lazy-load",
    label: "Lazy Load",
    path: "/performance/lazy-load",
    summary: "DummyJSON 형태의 원격 API와 append-mode Lazy Load 계약을 확인합니다.",
    title: "Lazy Load",
  }),
  featurePage({
    body: paragraphs([
      "대용량 데이터는 `virtualized`와 안정적인 `getRowId`를 함께 사용하는 흐름을 기준으로 설명합니다.",
      "100000 Row 예제는 Chrome DevTools Performance Monitor에서 JS heap, DOM Node, listener 회수 상태를 확인하는 성능 검증 기준으로 사용합니다.",
      "`rowHeight`는 실제 Row 높이와 맞춰야 하며, `buffer-size`는 viewport 위아래에 유지할 Row 수를 결정합니다.",
      "컴포넌트 기반 예제는 checkbox, button, select, progress, virtual list, radio Cell을 100000 Row와 함께 표시하며, 작은 override state로 상호작용 비용을 제한합니다.",
    ]),
    category: "Body / Performance",
    codeSamples: bodySamples,
    featureId: "body",
    label: "Virtualization",
    path: "/performance/virtualization",
    summary: "구현된 버추얼 스크롤 사용 기준과 대용량 데이터 주의사항을 확인합니다.",
    title: "Virtualization",
  }),
];

export const docsNavGroups = docsPages.reduce<Array<{ category: string; pages: DocsPage[] }>>((groups, page) => {
  const group = groups.find((item) => item.category === page.category);
  if (group) {
    group.pages.push(page);
    return groups;
  }
  groups.push({ category: page.category, pages: [page] });
  return groups;
}, []);

export function findDocsPage(path: string) {
  return docsPages.find((page) => page.path === path) ?? docsPages[0]!;
}
