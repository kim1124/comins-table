import type * as React from "react";

import { cn } from "../../lib/utils";

export type ContextMenuItem =
  | {
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
  style?: React.CSSProperties;
};

export function ContextMenu({ "aria-label": ariaLabel, className, items, style }: ContextMenuProps) {
  return (
    <div
      aria-label={ariaLabel}
      className={cn("ui-context-menu", className)}
      onClick={(event) => event.stopPropagation()}
      role="menu"
      style={style}
    >
      {items.map((item) =>
        item.type === "label" ? (
          <div className="ui-context-menu__label" key={`label-${item.label}`}>
            {item.label}
          </div>
        ) : (
          <button key={item.label} onClick={item.onSelect} role="menuitem" type="button">
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}
