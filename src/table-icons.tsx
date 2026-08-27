import {
  CaretSortIcon,
  ChevronRightIcon,
  DragHandleDots2Icon,
  MagnifyingGlassIcon,
  ThickArrowDownIcon,
  ThickArrowUpIcon,
} from "@radix-ui/react-icons";
import * as React from "react";

export type CominsTableIconName =
  | "columnMove"
  | "disclosureCollapsed"
  | "disclosureExpanded"
  | "filter"
  | "sortAscending"
  | "sortDescending"
  | "sortUnsorted";

const icons = {
  columnMove: DragHandleDots2Icon,
  disclosureCollapsed: ChevronRightIcon,
  disclosureExpanded: ChevronRightIcon,
  filter: MagnifyingGlassIcon,
  sortAscending: ThickArrowUpIcon,
  sortDescending: ThickArrowDownIcon,
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
