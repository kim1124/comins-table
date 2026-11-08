# 2026-11-08 Playground 개선 및 메모리 검증

작업 일시: 2026-11-08T13:40:41+09:00

## 결론

Playground 문서 데이터 재사용·Sidebar 렌더 개선과 개발/배포 모드 증거 검증을 완료했다. 기능 검증은 통과했으나 메모리 수치 기준 미달로 0.2.4 출시는 보류한다. 이번 결과를 SDK 전체 무누수나 전체 힙의 외부 귀속 확정으로 해석하지 않는다.

## 변경 범위

- 문서 옵션·파생 view를 지원 언어별 최대 2개로 제한해 읽기 전용으로 재사용하고 Sidebar 상위 렌더를 줄였다. NavLink·언어 전파와 문서값을 유지했다.
- 전용 Vite 개발 서버와 실제 배포 빌드를 구분한다. 입력·runtime·실제 제공 JS 및 배포 출력 전체 seal을 확인하며 출력 변경·추가·삭제를 차단한다.
- 수치 실행에는 브라우저 객체 이력·WeakRef·snapshot을 추가하지 않는다. URL 목록 고정 후 같은 URL 재응답의 모든 바이트·상태를 연속 검증하지 않는 한계는 유지한다.
- SDK 소스·공개 API·의존성·버전은 이 후속 변경에서 수정하지 않았다. 기존 완료분 PR #97과 분리한다.

## 검증

- 전체 E2E: 294 PASS.
- 최신 전체 verify: 117파일/1103단위 PASS, 보안21·라이선스27·Core checker43 및 빌드/패키지 검사 PASS.
- 실제 Astra/high 독립 리뷰: Critical0/Important2. 개발 모드 오표기와 출력 seal 문제를 수정 전 실패·수정 후 통과 회귀로 확인했다. 수정 후 별도 재리뷰를 수행했다고 주장하지 않는다.
- 개발 모드 전체 perf: 107건 중78 PASS/29 FAIL. L1 실행25·L2 실행6은 PASS지만 전체 제품 해제 coverage의 증명이 아니다. 27 counter와 legacy2개가 JS Heap 기준을 초과했다.
- 배포 모드 counter: 9개 시나리오×독립3회×300회, 27 FAIL/무효0. 모든 실행의 입력·runtime·브라우저·배포 출력·실제 JS가 동일하고 입력 전후 및 현재 소스 해시가 일치한다.
- 고정 warmup10, 최초 동일 상태 기준, 중간 체크포인트 및 최종 Unmount, 3개 지표 각각2%를 유지했다. JS Heap만 초과했으며 table-free 최종 tableRoots/rows/activeMounts는 모두0이다.

| 배포 모드 시나리오 | 독립 3회 최대 JS Heap 증가율 범위 |
| --- | ---: |
| column-filtering-open-ui-unmount-case2 | 11.170167% ~ 11.656638% |
| column-groups-open-ui-unmount | 11.193083% ~ 11.310892% |
| cross-table-drag-gesture-unmount | 8.414989% ~ 8.715334% |
| loading-pending-unmount | 10.458562% ~ 10.739810% |
| plain-scroll | 5.669099% ~ 5.793857% |
| portal-menu-tooltip-teardown-case8 | 8.949298% ~ 8.980265% |
| route-unmount | 8.345827% ~ 8.387545% |
| selection-clipboard-gesture-unmount | 11.922444% ~ 12.675108% |
| virtual-scroll | 4.989542% ~ 5.057410% |

표의 표시는 가독성을 위한 반올림이며 판정은 원시값으로 수행했다. 평균·대조군 차감·기준값 재설정으로 실패를 해제하지 않았다.

## 증거 재사용 및 잔여 범위

- 과거79 PASS/28 FAIL은 독립 증거로 보존한다. 이번 개발78/29 및 배포27 FAIL로 소급 대체하지 않는다.
- 개발 전체 gate 후 production 출력 파일 map의 `__proto__` 키 누락 한 줄을 보강했다. 186/187 빌드 입력이 같으며 개발 실행 경로·SDK·앱은 동일하다. 개발 gate는 그 범위에서 재사용하고, 배포27회는 보강 후 새로 실행했다.
- 별도 collector 가설 실험2회는 양쪽 모두 FAIL이었다. 공식 수치 수집 절차를 변경하지 않았다.
- 기존 SDK 객체·저장소 수명 귀속 결과는 관찰 범위의 결과다. 이번 L3 수치 실행은 L1/L2 전체 coverage 또는 모든 내부 캐시·기능의 무누수 검증을 대체하지 않는다.
- 수정 목표는 `docs/superpowers/plans/2026-11-08-playground-memory-release-goal.md`에 저장했다. 앱 Goal 본문 수정 API 부재와 UI 접근 제한으로 앱의 기존 blocked Goal 자체는 변경하지 못했다.
- 전체 출시 목표는 미완료다. 버전 변경·태그·Release·publish·배포는 수행하지 않았다. 수치 예외 승인도 없다.

로컬 원시 증거: `.local/playground-memory-20261108/`의 `final-perf-dev/audit.json`, `final-counter-production/audit.json`, 각 raw 결과·검증 로그·독립 리뷰 기록·`production-only-reuse-bridge.json`.
