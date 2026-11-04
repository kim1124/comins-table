import type { MouseEvent } from "react";

export function prepareDocsSidebarNavigation(event: MouseEvent<HTMLAnchorElement>): void {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = event.currentTarget;
  const doc = anchor.ownerDocument;
  const view = doc.defaultView;
  if (!view || anchor.hasAttribute("download") || (anchor.target && anchor.target.toLowerCase() !== "_self")) return;
  const next = new URL(anchor.href, view.location.href);
  const current = new URL(view.location.href);
  // Routes는 pathname을 key로 사용한다. 같은 경로의 query/hash 이동은 입력을 종료하지 않는다.
  if (next.origin !== current.origin || next.pathname === current.pathname) return;
  const focused = doc.activeElement;
  if (!(focused instanceof view.HTMLInputElement) || !focused.closest(".comins-table")) return;
  const ownedListSearch = focused.classList.contains("comins-table__component-virtual-list-search")
    && focused.closest(".comins-table__component-virtual-list") !== null;
  const ownedFilterValue = focused.dataset.cominsColumnFilterValueInput === "true"
    && focused.closest(".comins-column-filter__popover") !== null;
  if (!ownedListSearch && !ownedFilterValue) return;
  // React가 제거 commit 중 focusout을 억제하기 전에 내장 입력의 선택 추적 참조를 해제한다.
  // 내장 필터는 onChange로 즉시 반영한다. 표시 없는 사용자 입력의 blur 저장 계약은 보존한다.
  focused.blur();
}
