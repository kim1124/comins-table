# 0.1.11 휴먼 리뷰 후속 수정

- 최종 기록 일시: 2026-09-22 16:01:28 KST
- 범위: 외곽 border, CRUD/가상화 Row Drag, 로컬 자동 스크롤, 드롭 표시 통일, 기본 비활성화 및 선택적 onChangeData, 모든 이동 예제 직접 조작.
- 상태: 로컬 변경. 기존 미커밋 작업 보존. 원격 push·PR·배포·게시 작업 없음.

## 결과와 원인

| 항목 | 원인과 수정 |
| --- | --- |
| 외곽선 | Frame의 오른쪽 border와 마지막 Header/Body/Summary Cell의 border가 겹쳤음. Frame이 1px 외곽선을 소유하고 마지막 Cell은 중복 선을 제거. 그룹 헤더는 실제 최종 Column 표시로 판별하며 내부 경계선과 pin-zone 구분은 보존. |
| CRUD 순서 복원 | onChangeData 미연결과 옵션 변경 시 입력 data로 재생성하던 동기화가 겹침. CRUD 외부 편집 상태 연결을 보완하고, 라이브러리는 같은 data 배열을 유지하는 옵션 변경에서 내부 순서를 보존. |
| Virtualization 2종 | 같은 객체를 반복한 fixture, 위치 인덱스 기반 getRowId·표시값·Component override 때문에 이동 결과가 구분되지 않음. 고유 Row 객체·ID를 만들고 표시값과 override를 고유 ID에 연결. |
| Viewport loading | Row Drag 미지원 계약이며 런타임·타입에서 비활성화. 실제 화면에서 핸들 0개 확인. 일부 로드 데이터의 순서 변경은 서버 재정렬·재조회가 필요함을 한·영으로 안내. |
| 자동 스크롤 | 기존 cross-table 전용 스크롤을 로컬 Row/Group에도 적용. 브라우저에 보이는 viewport 경계로 계산하고 새로 나타나는 Row로 드롭 대상을 갱신. 종료·취소 시 중단. Tree는 가로 영역 밖 스크롤을 차단. |
| 드롭 표시 | Row·Tree·Group·Header의 유효/거부 색상과 2px 실선 기준을 통일. before/after 삽입선과 inside 영역의 의미는 보존. 출발 위치 placeholder는 중립 배경·점선으로 구분. |
| 기본값 | 사용자 승인에 따라 0.1.11의 일반 Row Drag 기본값을 false로 변경. rowProps.draggable이 true인 Row만 핸들 표시. 잠금·미지원 Row는 숨김. 이동을 보여주는 Playground만 명시적으로 활성화. |
| 콜백 | 일반 Row 내부 이동은 onChangeData 없이 가능. 옵션 재생성만으로 순서를 되돌리지 않음. 부모가 새 data 배열을 전달하면 이를 우선 적용. 외부 저장·편집·테이블 간 모델을 동기화할 때 콜백을 연결. Tree 및 cross-Group/Coordinator 소유권 계약은 유지. |
| 추가 발견: Tree 스크롤 | 중간 고정 높이 Tree에서 이동한 anchor Row를 따라 144px 밀렸음. 포인터 드롭 시의 위치를 controlled Tree의 내부 상태 반영 후 복원하고 포커스 회복은 유지. 키보드 탐색의 스크롤은 보존. |

## 검증

- 재현 먼저 확인: CRUD 복원, 중복 border, 로컬 가장자리 스크롤 미동작, 드롭 스타일 차이, Virtualization 2종 ID 유지, 기본 핸들 표시, 콜백 없는 옵션 재렌더링, Tree anchor 밀림 모두 수정 전 실패를 확인하고 수정 후 통과.
- 전체 E2E: **231 passed**. 최종 런타임 기준 `human-review-final-pass`.
- 전체 성능: **38 passed**. `human-review-final-perf`; 고정/가변 가상화, native scrollbar, memory/listener 회복, Row/Tree 드래그 포함.
- 단위 테스트: **468 passed**. 통합 verify는 별도 아래 제한 때문에 실패 상태.
- 최종 문서·지역화: **56 passed**, documentation-contract 통과(features=28, exports=233).
- TypeScript, build, hygiene, 보안·라이선스 결정적 검사 통과. git diff --check 통과.
- 마지막 문구 변경의 관련 Row/Viewport E2E 2건 통과. `human-review-final-copy.log` 참조.
- 초기 전체 E2E의 3개 실패는 이전 기본 핸들·Header top-border 계약을 기대하던 검사였으며 새 승인 계약으로 수정 후 관련 17건 통과. 이후 Viewport 검사의 비동기 로딩 대기 경쟁 1건은 화면에 실제 로드 Row가 나타나는 조건을 기다리도록 보완. 최종 전체 E2E는 231건 통과.

## 직접 조작

- 28개 페이지, 최초 렌더링 66개 테이블의 실제 핸들 표시 확인.
- 펼친 Group 2개를 포함하여 **이동 가능한 30개 테이블** 확인. 스크롤 없는 소량 예제는 실제 가능한 이동 확인; 스크롤 예제는 중간·하단 확인.
- 일반/컴포넌트 가상화: 약 5만 번째 및 10만 번째 구간에서 고유 ID·내용·목표 dataIndex 유지.
- CRUD: 중간 13→17, 하단 24→28 확인. 가장자리 실제 드래그에서 아래 스크롤 429.5→495px, 화면 밖이던 20번 위치로 이동; 위쪽 495→477px 이동 확인.
- Component 12종, Row 4종, Header Group, Pinning Group, Ref, Row Expand, 일반/가상 Group, Cross-Table 4개, Tree 고정/자동 높이 검증.
- Tree 고정 높이 중간: 수정 전 3026.5→3170.5px; 수정 후 3024→3024px 및 목표 index 88 확인. 가장자리 자동 스크롤에 따른 소폭 변화는 별도 기록.
- [직접 조작 기록 및 스크린샷](artifacts/human-review-2026-09-22/result.md). 원본 DOM 측정과 조작 67건은 manual-results.json, 핸들 목록은 inventory.json. 수정 전 Tree 증거도 보존.
- 자동 테스트와 직접 조작은 분리했으며, Safari/Firefox 인증 또는 모든 외부 Renderer 인증으로 확대 해석하지 않음.

## 변경 파일

- 라이브러리: src/index.tsx, src/tree-drag.tsx, styles.css.
- Playground: BasicCrudFeature, BodyFeature, ComponentFeature, RowFeature, RefApiFeature, RowGroupingFeature, CrossTableDragFeature, ViewportFeature; fixtures/people.ts; docs/codeSamples.ts, docs/docsRoutes.tsx, features/featureRegistry.tsx.
- 문서: README.md, CHANGELOG.md, DESIGN.md, docs/user·ko의 07-row.md와 README.md.
- 테스트: table-interaction.test.tsx; human-review-drag, row-drag-examples, playground-review, header-quality, selection-style, theme-playground, playground-audit-regressions spec.

## 남은 제한

- **npm run verify는 실패 상태**: 기존 ignored `.local/ci-diagnostics/memory-audit/memory-leak-full-audit.spec.ts`가 Vitest에 수집되어 Playwright `test.describe.configure` 오류가 발생. 468개 단위 테스트는 통과했지만 이 수집 문제 때문에 전체 verify 통과로 보고하지 않음. 해당 로컬 파일·설정은 변경하지 않음. build는 별도로 실행해 통과.
- Row Drag 기본값 변경은 호환성 변경. 기존 사용처는 rowProps.draggable: true를 명시해야 하며 README/Changelog/한·영 가이드와 Playground에 안내.
- 새 data 배열은 내부 순서를 교체함. 내부 이동만 사용할 때 입력 배열의 참조를 유지하고, 외부 상태와 일치해야 한다면 onChangeData를 연결.
- Viewport Row Drag 구현은 이번 범위에 포함하지 않음. Tree는 기존 controlled onChangeData 계약 유지.

## 후속 검증 상태

2026-09-22 후속 단계에서 위의 Vitest 로컬 진단 파일 수집 문제를 해결했으며, 기본 `npm run verify`와 동일 패키지의 소비자 검증이 통과했습니다. 당시 실패 기록은 보존합니다. [후속 검증 보고서](2026-09-22-local-finalization.md)를 참조하십시오.
