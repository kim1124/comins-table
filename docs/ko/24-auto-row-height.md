# Row 자동 높이

![Renderer 확장과 너비 변경에 반응하는 자동 높이](../assets/comins-table-auto-row-height.gif)

[한글 가이드](README.md) · [English](../user/24-auto-row-height.md) · [Playground](http://127.0.0.1:4002/performance/auto-row-height)

`rowHeight`는 숫자형 기본 높이(36)를 유지합니다. `getRowHeight`를 한 번 지정하여 전체 업무 Row를 자동 측정하거나, 특정 Row에서 유한한 양수를 반환하여 높이를 지정합니다. callback 생략 또는 `undefined` 반환은 `rowHeight`를 사용하며 유효하지 않은 숫자는 기본값으로 대체합니다. 관련 타입은 `CominsRowHeight`, `CominsRowHeightParams<TData>`입니다.

| 옵션 | 동작 |
| --- | --- |
| `rowHeight={36}` | Row별 정책을 지정하지 않았을 때의 숫자형 기본 높이 |
| `getRowHeight={({ row }) => ...}` | 양수, `"auto"`, `undefined`를 반환하며 `row.data`는 업무 데이터 |
| `estimatedRowHeight` | 자동 높이의 초기 추정값이며 기본값은 유효한 `rowHeight` |
| `virtualized` | 화면 주변 Row만 렌더링하며, 생략해도 자동 측정은 사용 가능 |

<!-- comins-doc-example: fragment -->
```tsx
<CominsTable
  columns={columns}
  data={rows}
  getRowId={(row) => row.id}
  getRowHeight={() => "auto"}
  estimatedRowHeight={56}
  virtualized
/>
```

`estimatedRowHeight`는 임시 추정값이며 높이 제한이나 Renderer별 필수 입력값이 아닙니다. 기본값은 `rowHeight`입니다. Renderer에서 직접 높이를 계산하거나 Observer를 연결할 필요가 없습니다. 표시 Column 중 가장 높은 Cell의 일반 flow 콘텐츠와 padding·border를 측정합니다. 동적 콘텐츠·이미지·폰트·Column 너비 변경을 재측정합니다. 기본 텍스트 생략 정책은 유지하므로 줄바꿈은 Renderer 또는 Cell style로 지정합니다.

Portal, absolute overlay, transform만으로 확대한 영역은 자연 높이에 포함되지 않습니다. 내부 스크롤을 사용하는 Renderer는 외부 컨테이너 높이만 반영합니다. `getRowHeight`를 지정한 경우 Row/Cell CSS 높이를 별도의 가상 레이아웃 API로 사용하지 않습니다.

고정 높이 Row에서는 한 줄 말줄임 등의 방식으로 custom Renderer 콘텐츠를 지정한 높이 안에 제한합니다. 줄바꿈 Renderer는 HTML table Cell을 숫자형 CSS 높이보다 늘릴 수 있지만 고정 가상 배치는 계속 `rowHeight`를 사용합니다. 콘텐츠에 따라 Row가 커져야 하면 자동 높이를 사용합니다. Viewport Playground는 고정 모드에서 한 줄 표시, 자동 모드에서 줄바꿈으로 전환합니다.

가상화 여부와 관계없이 자동·숫자 높이를 지원합니다. CSR Flat, Grouped 업무 Row, Tree Row에 적용하며 합성 Group Row·Header·Summary의 높이 정책은 유지합니다. Flat Row와 펼쳐진 Detail은 따로 측정한 뒤 가상 배치에 합산합니다. 기존에 지원하던 pinning·filtering·clipboard·drag 조합은 유지합니다.

현재 마운트된 자동 Row와 Detail만 관찰합니다. 유효한 Row 높이가 모두 기본값과 같으면 기존 산술 가상화 경로를 유지합니다. 가변 높이에서는 높이 인덱스와 현재 Row 내부 위치 보정을 사용합니다. anchor 삭제·축소 시에는 유효 범위로 제한하며, 아직 모르는 정확한 높이나 고정된 scrollbar thumb 크기는 보장하지 않습니다.

[Viewport 조회](25-viewport-datasource.md)에서도 자동 높이를 지원합니다. 미수신 Row는 추정값을 사용하고 데이터와 높이 이력 모두 캐시 한도를 적용합니다.

## Playground 옵션

**긴 콘텐츠**는 Row 데이터를, **좁은 너비**는 줄바꿈에 사용할 너비를 변경합니다. **Row Detail**은 독립 측정되는 Detail을 표시합니다. 첫 번째 Row의 **콘텐츠 펼침**은 해당 Renderer의 콘텐츠만 바꿉니다. 각 옵션은 활성 상태를 표시하는 토글이며 Enter·Space를 지원합니다. 다시 끄면 해당 설정을 복원하고, 사용자가 Renderer 높이를 직접 지정할 필요는 없습니다.
