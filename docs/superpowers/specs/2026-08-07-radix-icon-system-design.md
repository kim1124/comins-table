# Radix Icons 기반 버튼·아이콘 표준화 설계

## 목적

Comins Table Core와 Playground에 분산된 문자, CSS 도형, 개별 버튼 규격을
하나의 일관된 아이콘·아이콘 버튼 계약으로 정리한다. 검증된 Radix Icons를
직접 runtime dependency로 사용하되 공개 Comins API, application-owned
`data`/callback 흐름, virtualization 계산은 유지한다.

라이선스 준수는 문서 권고가 아니라 dependency, lockfile, repository notice,
package artifact를 함께 검사하는 fail-closed 완료 조건으로 다룬다.

## 선행 결정과 설계 우선순위

- `@radix-ui/react-icons` version `1.3.2`를 exact runtime dependency로 사용한다.
- Vite library bundle에서는 Radix Icons를 external로 처리한다.
- 아이콘 SVG나 Radix 구현을 Comins 소스에 복사하거나 수정하지 않는다.
- MIT 원문, WorkOS 저작권, 정확한 버전·revision·source를 배포 notice에
  기록하고 package artifact에서 검증한다.
- 브랜드·로고 아이콘은 사용하지 않는다.
- 이 결정은
  `2026-08-03-playground-quality-remediation-design.md`의 “외부 아이콘
  패키지를 추가하지 않는다” 항목만 대체한다. 해당 문서의 나머지 제품,
  공개 API, 상호작용 계약은 유지한다.

## 검토한 적용 방식

### 선택: exact runtime dependency와 external bundle

정식 npm 패키지를 설치하고 Comins bundle에는 포함하지 않는다. 소비자의
패키지 매니저가 Radix Icons를 설치하고 최종 애플리케이션 bundler가 실제로
사용한 named export를 처리한다.

- 장점: upstream 소스와 라이선스 파일을 그대로 사용하고 복사·수정 자산을
  만들지 않는다.
- 장점: Comins 공개 tarball과 source map에 `node_modules` 소스를 포함하지
  않는다.
- 장점: dependency 버전, SPDX, integrity drift를 자동 검사할 수 있다.
- 비용: 소비자 dependency graph에 패키지 하나가 추가된다.

### 제외: 선택한 SVG를 Comins 소스에 내장

필요한 SVG만 복사하면 runtime dependency는 줄지만, 각 복사본의 출처,
revision, 수정 여부, 원문 고지를 영구 추적해야 한다. 현재 목표는 공식 모듈을
그대로 사용하는 것이므로 제외한다.

### 제외: 문자와 CSS 아이콘 유지

dependency는 없지만 OS·폰트별 glyph 차이와 분산된 크기·정렬 규격을 해결하지
못한다. 이번 표준화 목표와 맞지 않는다.

## 패키지와 빌드 경계

### Dependency

- `package.json#dependencies`에
  `"@radix-ui/react-icons": "1.3.2"`를 추가한다.
- caret, tilde, tag, Git URL 범위는 사용하지 않는다.
- `package-lock.json`은 같은 exact version과 npm integrity를 보존한다.
- Radix Icons의 React peer 범위는 Comins의 React 18 이상 20 미만 범위와
  호환되어야 한다.

### Bundle

- `vite.config.ts`의 `rollupOptions.external`에
  `@radix-ui/react-icons`를 추가한다.
- `dist`는 Radix named import를 유지하되 Radix 구현이나 SVG path를 복제하지
  않는다.
- source map에는 Radix 또는 다른 `node_modules` source path가 없어야 한다.
- consumer smoke는 packed Comins package를 설치한 뒤 Radix dependency가
  자동 설치·해석되고 production import가 성공하는지 검증한다.
- 최종 소비자 애플리케이션 bundler는 Radix 구현을 포함할 수 있다. Comins
  package notice는 이 downstream MIT 고지 의무를 삭제하거나 대신하지 않는다.

### 공개 API

- 기존 `comins-table`, `/core`, `/clipboard`, `/selection`, `/styles.css`
  export를 변경하지 않는다.
- Radix component, prop, type을 Comins public declaration에 노출하지 않는다.
- `/icons`, `IconButton`, icon registry, consumer override API를 이번 범위에서
  공개하지 않는다.
- 향후 override 요구가 실제로 확인되면 의미 기반 `icons` API를 별도 설계한다.

## 내부 컴포넌트 경계

### Core 아이콘

Core는 Radix named export를 직접 여러 위치에서 조합하지 않고 내부 전용
아이콘 모듈을 거친다.

- `CominsTableIcon`: 크기, `currentColor`, decorative 접근성 속성을 통일한다.
- `CominsTableIconButton`: native button props, 기본 `type="button"`, 크기,
  focus-visible, disabled 상태를 통일한다.
- 두 컴포넌트 모두 public entrypoint에서 export하지 않는다.
- 아이콘 이름이 아니라 `rowDetailCollapsed`, `sortAscending` 같은 의미를
  호출 지점에서 식별할 수 있어야 한다.

### Playground 아이콘

- Playground는 기존 `Button` primitive를 유지한다.
- Playground 전용 아이콘 사용 지점은 Radix named export를 사용하되 Core의
  private 컴포넌트를 import하지 않는다.
- Playground는 public library export를 우회하는 내부 import를 만들지 않는다.

## 의미와 아이콘 매핑

| 의미 | Radix Icons named export | 적용 위치 |
|---|---|---|
| 접힌 Detail·Tree | `ChevronRightIcon` | Core disclosure button |
| 펼친 Detail·Tree | `ChevronDownIcon` | Core disclosure button |
| 정렬 가능·미정렬 | `CaretSortIcon` | Core Header indicator |
| 오름차순 | `TriangleUpIcon` | Core Header indicator |
| 내림차순 | `TriangleDownIcon` | Core Header indicator |
| 첫 페이지 | `DoubleArrowLeftIcon` | Playground Pagination |
| 이전 페이지 | `ChevronLeftIcon` | Playground Pagination |
| 다음 페이지 | `ChevronRightIcon` | Playground Pagination |
| 마지막 페이지 | `DoubleArrowRightIcon` | Playground Pagination |
| 검색 | `MagnifyingGlassIcon` | Playground search |
| 드래그 핸들 | `DragHandleDots2Icon` | Column Move feedback |

Discord, GitHub, Instagram, LinkedIn, Figma 등 브랜드·로고 아이콘은 MIT
저작권 허용과 별개인 상표·오인 가능성을 피하기 위해 금지한다.

## 시각·상호작용 계약

- Core compact icon button의 최소 hit area는 `24px × 24px`다.
- Playground icon button은 기존 `32px × 32px` 규격을 유지한다.
- 기본 SVG viewport는 Radix 원본 `15px × 15px`를 유지한다.
- 색상은 `currentColor`를 사용하고 hover, active, focus-visible, disabled는
  button이 소유한다.
- Row Detail과 Tree expander는 현재 Row 높이와 indentation 계산을 변경하지
  않는다.
- Sort indicator는 기존 sort state와 click target을 유지하고 CSS pseudo
  triangle만 SVG로 대체한다.
- Column Move drag handle은 기존 pointer target, drag threshold, placeholder,
  valid/invalid target 계약을 변경하지 않는다.

## 접근성 계약

- decorative SVG는 `aria-hidden="true"`, `focusable="false"`다.
- icon-only button은 기존 `aria-label` 또는 `aria-labelledby`를 유지한다.
- disclosure button은 `aria-expanded`를 유지한다.
- 버튼의 accessible name은 아이콘 component 이름이나 영문 glyph에 의존하지
  않는다.
- locale 전환은 accessible name을 현재 `ko`/`en` locale에 맞게 유지한다.
- disabled 상태, keyboard activation, focus order는 기존 native button 계약을
  유지한다.

## 라이선스와 provenance 계약

### 고정된 upstream 증거

- Component: `@radix-ui/react-icons`
- Version: `1.3.2`
- Revision: `bde33b13aa5848555f5512ac12155930fb4beb7d`
- Source: `https://github.com/radix-ui/icons`
- License: `MIT`
- Copyright: `Copyright (c) 2022 WorkOS`
- npm integrity:
  `sha512-fyQIhGDhzfc9pK2kH6Pl9c4BDJGfMkPqkyIgYDthyNYoNg3wVhoJMMh19WS4Up/1KMPFVpNsT2q3WmXn2N1m6g==`
- Use surface: Comins library bundle에서는 external runtime dependency이며,
  Playground 또는 최종 소비자 application build에서는 bundle될 수 있음
- Modified or copied by Comins: no

### Repository notice

- `THIRD_PARTY_NOTICES.md` 제목을 현재와 legacy 고지를 모두 포괄하도록
  정리한다.
- 기존 Lucide·Feather legacy notice를 삭제하거나 축약하지 않는다.
- 현재 Radix Icons section에 component, version, revision, source, use surface,
  modification state, 사용 named export 목록을 기록한다.
- upstream MIT permission과 warranty disclaimer 전체를 포함한다.
- 최종 애플리케이션에 Radix를 bundle하여 배포하는 소비자가 MIT 고지를
  보존해야 한다는 downstream 경계를 기록한다.

### Fail-closed license gate

`check-licenses.mjs`와 license fixture는 다음 drift를 실패로 처리한다.

- dependency 누락 또는 non-exact range;
- root manifest와 lock root 불일치;
- installed/locked version이 `1.3.2`가 아님;
- lockfile의 SPDX가 `MIT`가 아님;
- npm integrity 또는 known revision 증거 불일치;
- upstream LICENSE 또는 WorkOS copyright 불일치;
- repository notice의 version, source, revision, MIT 원문 누락;
- 실제 사용 named export와 notice inventory 불일치;
- package artifact의 `THIRD_PARTY_NOTICES.md` 누락;
- Radix source가 Comins `dist` 또는 source map에 bundle됨.

Radix version, source revision, license, use surface, distribution 방식 중 하나가
변경되면 기존 승인으로 간주하지 않고 다시 검토한다.

## 오류와 실패 처리

- dependency가 설치되지 않으면 개발 build와 consumer smoke를 실패시킨다.
- Radix import를 찾지 못하는 소비자 환경은 silent fallback glyph로 우회하지
  않는다.
- license evidence가 누락되면 PR·release gate를 실패시킨다.
- license check는 Comins 정책 증거 충족 여부를 판정하며 법률 준수를 보증한다고
  출력하지 않는다.
- npm registry 또는 upstream 조회가 필요한 검증은 dependency 반입·갱신 시
  수행하고, 일반 로컬 build가 네트워크에 의존하지 않게 한다.
- Comins gate는 Comins repository와 npm artifact를 검증한다. 제3자 소비자의
  최종 배포물이 notice를 보존했는지까지 보증하지 않는다.

## 테스트 전략

### Component와 DOM

- Row Detail과 Tree expander의 접힘·펼침 아이콘과 `aria-expanded`를 검증한다.
- sort `none`/`asc`/`desc`에 대응하는 SVG를 검증한다.
- decorative SVG의 `aria-hidden`과 `focusable`을 검증한다.
- icon-only button의 accessible name, disabled, keyboard activation을 검증한다.
- public typecheck fixture에 Radix type이 노출되지 않음을 검증한다.

### Browser

- Row Expand와 Tree Grid에서 아이콘 상태가 실제 expand/fold와 일치하는지
  검증한다.
- compact Core button이 최소 `24px × 24px`인지 검증한다.
- Pagination first/previous/next/last 상태와 disabled 상태를 검증한다.
- Playground 검색 아이콘이 locale·검색 동작에 영향을 주지 않는지 검증한다.
- Column Move drag handle 적용 시 기존 placeholder와 drop target 계약을
  회귀 검증한다.

### License와 package artifact

- valid dependency·notice·artifact fixture가 통과해야 한다.
- version, SPDX, integrity, notice, copyright, artifact file을 각각 훼손한
  negative fixture가 실패해야 한다.
- packed artifact의 `dist`와 source map에 bundled Radix source가 없어야 한다.
- packed consumer가 별도 수동 설치 없이 dependency를 해석해야 한다.

### 전체 게이트

- `npm run test:licenses`
- `npm run check:licenses`
- `npm run verify`
- `npm run test:e2e -- --workers=1`
- `npm run verify:package-artifact`
- `git diff --check`

virtualization layout, scrolling 계산, memory counter는 변경하지 않으므로
performance gate는 기본 범위에서 제외한다. 해당 계산을 건드리게 되면 focused
performance spec과 `npm run test:perf -- --workers=1`을 추가한다.

## 단계적 적용 순서

1. dependency, external bundle, notice, license gate를 먼저 닫는다.
2. private Core icon과 icon button primitive를 추가한다.
3. Row Detail과 Tree expander를 전환한다.
4. Sort indicator를 전환한다.
5. Playground Pagination과 Search를 전환한다.
6. Column Move drag handle을 전환하고 기존 drag feedback을 회귀 검증한다.
7. 전체 package·browser gate를 실행한다.

각 단계는 라이선스 또는 package gate가 실패한 상태로 다음 단계에 진입하지
않는다.

## 비범위

- public `/icons` export
- consumer icon override API
- 별도 `@comins/icons` package
- Radix Primitives 또는 Radix Themes 도입
- 브랜드·로고 아이콘
- 일반 text button 전체 리디자인
- Row height, virtualization, scrolling 알고리즘 변경
- 버전 증가, npm publish, tag, GitHub Release, push, PR, merge

## 잔여 리스크

- external dependency는 소비자 dependency graph를 변경하므로 packed consumer
  검증이 필수다.
- 기존 Lucide 제거 계약과 artifact gate는 Radix의 external 사용만 허용하도록
  좁게 변경해야 하며, 일반적인 bundled third-party source 금지는 유지해야 한다.
- Core와 Playground는 서로의 private UI component를 공유하지 않으므로 시각
  token이 drift하지 않도록 DOM·CSS 검증이 필요하다.
- 현재 구현 기준 branch는 원격에 게시되지 않은 `codex/row-expand`다. push,
  PR, merge는 별도 승인이 없으면 수행하지 않는다.

## 완료 조건

- 위 dependency·public API·accessibility·license 계약을 모두 만족한다.
- 선택한 검증이 모두 통과하고 미실행 필수 gate가 없다.
- package artifact에 Comins LICENSE와 Radix notice가 포함된다.
- package artifact와 source map에 Radix 구현이 bundle되지 않는다.
- 기존 Row Expand, Tree Grid, Sort, Column Move, locale 동작이 유지된다.
