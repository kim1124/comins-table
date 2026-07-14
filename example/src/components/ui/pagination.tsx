import type * as React from "react";

import { cn } from "../../lib/utils";
import { Button, type ButtonProps } from "./button";

export type PaginationProps = React.HTMLAttributes<HTMLElement>;

export function Pagination({ className, ...props }: PaginationProps) {
  return <nav className={cn("ui-pagination", className)} role="navigation" {...props} />;
}

export type PaginationContentProps = React.HTMLAttributes<HTMLUListElement>;

export function PaginationContent({ className, ...props }: PaginationContentProps) {
  return <ul className={cn("ui-pagination__content", className)} {...props} />;
}

export type PaginationItemProps = React.HTMLAttributes<HTMLLIElement>;

export function PaginationItem({ className, ...props }: PaginationItemProps) {
  return <li className={cn("ui-pagination__item", className)} {...props} />;
}

export type PaginationButtonProps = ButtonProps;

export function PaginationButton({ className, variant = "outline", ...props }: PaginationButtonProps) {
  return <Button className={cn("ui-pagination__button", className)} variant={variant} {...props} />;
}
