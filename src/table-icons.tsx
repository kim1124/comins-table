import {
  CaretSortIcon,
  ChevronRightIcon,
  DragHandleDots2Icon,
  MagnifyingGlassIcon,
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
  sortAscending: ChevronRightIcon,
  sortDescending: ChevronRightIcon,
  sortUnsorted: CaretSortIcon,
} as const;

type CominsTableIconProps = {
  className?: string;
  name: CominsTableIconName;
};

function createIcon(name: CominsTableIconName, className?: string) {
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

// Create this fixed element outside render so it captures no table or render owner.
export const cominsColumnMoveIcon = (
  <svg
    width="15"
    height="15"
    viewBox="0 0 15 15"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className="comins-table-icon"
    data-comins-icon="columnMove"
    focusable="false"
  >
    <path d="M5.5 4.625C6.12132 4.625 6.625 4.12132 6.625 3.5C6.625 2.87868 6.12132 2.375 5.5 2.375C4.87868 2.375 4.375 2.87868 4.375 3.5C4.375 4.12132 4.87868 4.625 5.5 4.625ZM9.5 4.625C10.1213 4.625 10.625 4.12132 10.625 3.5C10.625 2.87868 10.1213 2.375 9.5 2.375C8.87868 2.375 8.375 2.87868 8.375 3.5C8.375 4.12132 8.87868 4.625 9.5 4.625ZM10.625 7.5C10.625 8.12132 10.1213 8.625 9.5 8.625C8.87868 8.625 8.375 8.12132 8.375 7.5C8.375 6.87868 8.87868 6.375 9.5 6.375C10.1213 6.375 10.625 6.87868 10.625 7.5ZM5.5 8.625C6.12132 8.625 6.625 8.12132 6.625 7.5C6.625 6.87868 6.12132 6.375 5.5 6.375C4.87868 6.375 4.375 6.87868 4.375 7.5C4.375 8.12132 4.87868 8.625 5.5 8.625ZM10.625 11.5C10.625 12.1213 10.1213 12.625 9.5 12.625C8.87868 12.625 8.375 12.1213 8.375 11.5C8.375 10.8787 8.87868 10.375 9.5 10.375C10.1213 10.375 10.625 10.8787 10.625 11.5ZM5.5 12.625C6.12132 12.625 6.625 12.1213 6.625 11.5C6.625 10.8787 6.12132 10.375 5.5 10.375C4.87868 10.375 4.375 10.8787 4.375 11.5C4.375 12.1213 4.87868 12.625 5.5 12.625Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
  </svg>
);

export const CominsTableIcon = React.memo(function CominsTableIcon({ className, name }: CominsTableIconProps) {
  return createIcon(name, className);
});

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
