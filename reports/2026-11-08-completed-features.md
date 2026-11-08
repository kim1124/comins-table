# 2026-11-08 완료 기능·메모리 수정 PR

## 범위

- 종료된 Table의 Tooltip 상태 발행·anchor 보유를 차단하고 초기 child autoFocus를 보존한다.
- pending Clipboard·Lazy Load·Viewport 완료 경계가 종료된 Table 문맥을 보유하지 않게 분리한다.
- 소비자 주도 이동 전에 native blur를 실행하는 명시적 `releaseFocus()` API를 제공한다. 자동 Unmount의 GC 보장으로 표현하지 않는다.
- Excel Table UI와 React18/19 초기 SSR HTML·hydration 지원 및 한영 문서·회귀 검증을 포함한다.
- 제품 수명·활성 기능·전체 화면 수치 검증 분류와 기존 전체 성능 선택을 유지한다.

## 검증 및 한계

- 기존 P0의 수정 전 실패→수정 후 회귀와 실제 Astra/high 독립 귀속 리뷰, P1의 React18/19 SSR·동일 SDK 산출물 인수 증거를 재사용한다.
- 기존 전체 기능 E2E294 PASS, React18/19·Core·XLSX·production browser Worker 소비 검증 PASS다. 소스·관련 설정·의존성 동일 범위에서 재사용한다.
- 메모리 전체 성능의 기록은107건 중79 PASS/28 FAIL이다. 28건은 JS Heap2% 기준 초과이며, 관측 조건·객체·저장소 범위에서 추가 SDK 보유 결함이 아닌 것으로 판정했다. SDK 전체 무누수나 전체 증가 바이트 외부 귀속으로 확대하지 않는다.
- 2%·warmup10·독립3×300·최초 기준값·중간 FAIL을 유지한다. 이 PR의 기능 검증과 CI 통과는 수치 메모리 합격 또는 출시 승인이 아니다.
- Playground 렌더링·문서 데이터 생성 개선과 개발/배포 빌드별 수치 검증은 후속 작업이다. WebGPU는 기존 정수 후보의 p95 20% 미달로 제품에 포함하지 않는다.
- 이번 PR에서 버전은0.2.3으로 유지한다. 최종0.2.4 버전 승격·공개 artifact·publish 검증은 출시 gate 해소 후 수행한다.

## 현재 실행

완료한 소스·관련 테스트·공개 문서91개 파일만 선별했다. 기존 변경과 신규 파일은 별도 로컬 백업으로 보존했다. 현재 소스에서 `npm run verify`를 새로 실행하여 exit0을 확인했다. 공개 identity 검사와 staged diff 검사를 통과했다. PR head에서의 필수 CI는 PR 생성 후 결과를 확인한다.
