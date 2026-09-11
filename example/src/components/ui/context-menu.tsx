import type * as React from "react";
import { useLayoutEffect, useRef } from "react";

import { cn } from "../../lib/utils";

export type ContextMenuItem =
  | {
      disabled?: boolean;
      label: string;
      onSelect?: () => void;
      type?: "item";
    }
  | {
      label: string;
      type: "label";
    };

export type ContextMenuProps = {
  "aria-label": string;
  className?: string;
  items: ContextMenuItem[];
  onClose: () => void;
  style?: React.CSSProperties;
};

export function ContextMenu({ "aria-label": ariaLabel, className, items, onClose, style }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const getEnabledItems = () => Array.from(
    menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [],
  );
  useLayoutEffect(() => {
    if (!menuRef.current?.contains(document.activeElement)) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    getEnabledItems()[0]?.focus({ preventScroll: true });
  }, [items]);
  const close = () => {
    openerRef.current?.focus({ preventScroll: true });
    onClose();
  };

  return (
    <div
      aria-label={ariaLabel}
      className={cn("ui-context-menu", className)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape" || event.key === "Tab") {
          if (event.key === "Escape") event.preventDefault();
          close();
          return;
        }
        const buttons = getEnabledItems();
        if (!buttons.length || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
          : (current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next]?.focus({ preventScroll: true });
      }}
      ref={menuRef}
      role="menu"
      style={style}
    >
      {items.map((item) =>
        item.type === "label" ? (
          <div className="ui-context-menu__label" key={`label-${item.label}`}>
            {item.label}
          </div>
        ) : (
          <button
            aria-disabled={item.disabled ? "true" : undefined}
            disabled={item.disabled}
            key={item.label}
            onClick={() => {
              item.onSelect?.();
              close();
            }}
            role="menuitem"
            type="button"
          >
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}
