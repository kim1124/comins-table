import {
  CaretSortIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DragHandleDots2Icon,
  TriangleDownIcon,
  TriangleUpIcon,
} from "@radix-ui/react-icons";
import * as React from "react";

export type CominsTableIconName =
  | "columnMove"
  | "disclosureCollapsed"
  | "disclosureExpanded"
  | "sortAscending"
  | "sortDescending"
  | "sortUnsorted";

const icons = {
  columnMove: DragHandleDots2Icon,
  disclosureCollapsed: ChevronRightIcon,
  disclosureExpanded: ChevronDownIcon,
  sortAscending: TriangleUpIcon,
  sortDescending: TriangleDownIcon,
  sortUnsorted: CaretSortIcon,
} as const;

export function CominsTableIcon({ className, name }: { className?: string; name: CominsTableIconName }) {
  const Icon = icons[name];

  return (
    <Icon
      aria-hidden="true"
      className={["comins-table-icon", className].filter(Boolean).join(" ")}
      data-comins-icon={name}
      focusable="false"
    />
  );
}

export type CominsTableIconButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "children"
> & {
  "aria-label": string;
  icon: CominsTableIconName;
};

export const CominsTableIconButton = React.forwardRef<HTMLButtonElement, CominsTableIconButtonProps>(
  function CominsTableIconButton({ className, icon, type = "button", ...buttonProps }, ref) {
    return (
      <button
        className={["comins-table-icon-button", className].filter(Boolean).join(" ")}
        ref={ref}
        type={type}
        {...buttonProps}
      >
        <CominsTableIcon name={icon} />
      </button>
    );
  },
);
