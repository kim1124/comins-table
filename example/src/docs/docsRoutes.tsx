import type { ReactNode } from "react";

import { dataTableOptionGuide } from "./dataTableOptionGuide";
import {
  apiSamples,
  bodySamples,
  cellSamples,
  componentSamples,
  contextMenuSamples,
  crudSamples,
  headerGroupSamples,
  headerSamples,
  installSamples,
  paginationSamples,
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
      "ref API는 화면 기준 selection, row 이동, 컬럼 레이아웃 저장과 복구에 사용합니다.",
      "서버 사이드 row model과 lazy row model은 이 페이지에 노출하지 않습니다.",
    ]),
    category: "API",
    codeSamples: apiSamples,
    label: "Ref API",
    path: "/api/ref",
    summary: "현재 구현된 ref method와 core helper 경계를 확인합니다.",
    title: "Ref API",
  },
  featurePage({
    body: paragraphs([
      "pagination prop은 현재 pageIndex와 pageSize를 DataTable에 전달합니다.",
      "버튼, select, query string 등 외부 UI에서 페이지 상태를 관리할 수 있습니다.",
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
      "대용량 데이터는 `virtualized`와 안정적인 `getRowId`를 함께 사용하는 흐름을 기준으로 설명합니다.",
      "Chrome DevTools Performance Monitor 검증은 별도 성능 게이트에서 다룹니다.",
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
