import type * as React from "react";

import { cn } from "../../lib/utils";

type ButtonSize = "default" | "icon";
type ButtonVariant = "danger" | "filter" | "ghost" | "outline" | "primary" | "secondary";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ButtonSize;
  variant?: ButtonVariant;
}

export function Button({ className, size = "default", type = "button", variant = "ghost", ...props }: ButtonProps) {
  return (
    <button
      className={cn("ui-button", `ui-button--${variant}`, `ui-button--${size}`, className)}
      type={type}
      {...props}
    />
  );
}
