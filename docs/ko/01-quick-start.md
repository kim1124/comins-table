# Quick Start

<!-- comins-restriction: ssr-hydration -->

[문서 홈](../README.md) · [한글 가이드](README.md) · [English](../user/01-quick-start.md) · [Playground](http://127.0.0.1:4002/docs/getting-started)

`CominsTable`의 React row 입력은 `data` 하나로 통일한다. 내부 copy/paste, row 이동, cell 편집성 동작으로 데이터 배열이 바뀌면 `onChangeData`로 다음 배열을 받는다.

<!-- comins-doc-example: fragment -->
```tsx
import { CominsTable } from "comins-table";
import { useState } from "react";

type Row = { id: string; name: string; role: string };

export function QuickStart() {
  const [data, setData] = useState<Row[]>([{ id: "a", name: "Alpha", role: "Owner" }]);

  return (
    <CominsTable<Row>
      columns={[
        { field: "name", label: "Name", sort: true },
        { field: "role", label: "Role" },
      ]}
      data={data}
      getRowId={(row) => row.id}
      onChangeData={setData}
      onClickCell={({ row, column, value }) => console.log(row.index, column.id, value)}
    />
  );
}
```

기본 column schema는 `field`, `label`, `id`, `sort`, `props`, `format`, `header`다. `id`가 없으면 `field`가 column id가 된다.

## 서버 렌더링과 hydration

React 18/19에서 `renderToString`으로 Table 초기 HTML을 만들고 `hydrateRoot`로 연결할 수 있습니다. 클라이언트에서 배포 CSS를 import합니다. 일반 React SSR 범위이며 Next.js App Router, React Server Components, streaming SSR 통합은 검증 대상에 포함하지 않습니다.

<!-- comins-doc-example: fragment -->
```tsx
// 서버: App에는 Table과 애플리케이션의 초기 데이터가 포함됩니다.
import { renderToString } from "react-dom/server";
const html = renderToString(<App />, { identifierPrefix: "table-page-" });
```

<!-- comins-doc-example: fragment -->
```tsx
// 클라이언트: 같은 App·초기 데이터·identifierPrefix를 사용합니다.
import { hydrateRoot } from "react-dom/client";
import "comins-table/styles.css";
hydrateRoot(document.getElementById("root")!, <App />, {
  identifierPrefix: "table-page-",
  onRecoverableError: console.error,
});
```

- 서버·클라이언트의 초기 `data`, columns, state, loading, 크기와 renderer 출력이 같아야 합니다. hydration 전에 애플리케이션 초기 데이터를 복원하고 안정적인 Row ID를 사용합니다. 렌더 중 브라우저 전용 값·현재 시간·난수를 읽지 않으며 사용자 renderer·formatter도 서버에서 안전하게 실행되어야 합니다.
- 서버·클라이언트 root 쌍에는 같은 `identifierPrefix`를 사용하고 독립 root에는 서로 다른 prefix를 둡니다. 한 root 안의 여러 Table ID는 자동으로 구분됩니다.
- 서버에서는 DOM 측정과 Lazy Load 요청을 실행하지 않습니다. 가상화 Table은 100,000행 전체가 아닌 추정된 초기 window를 렌더합니다. 자동 높이·viewport 기반 배치는 hydration 후 측정하므로 초기 추정 높이와 CSS·`rowHeight`를 일치시켜 이동을 줄입니다.
- empty·loading HTML은 서버 출력에 포함됩니다. 선택·편집·필터·tooltip/portal 조작·요청은 클라이언트 JavaScript가 필요합니다. 서버 렌더는 이벤트·요청 콜백을 호출하거나 행을 대신 조회하지 않습니다. `getRowId`, `getRowHeight`, renderer, formatter, props resolver 등 렌더 시 필요한 사용자 함수는 서버에서도 실행됩니다.
- 검증 범위는 React 18.3.1/19.3.0의 DOM 없는 Node 렌더, JavaScript를 끈 HTML, Chromium hydration의 DOM 재사용·정렬·Unmount입니다. 다른 프레임워크·브라우저 지원 근거로 확대하지 않습니다.
