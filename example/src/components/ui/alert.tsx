import type * as React from "react";

import { cn } from "../../lib/utils";

export type AlertProps = React.HTMLAttributes<HTMLDivElement>;

export function Alert({ className, ...props }: AlertProps) {
  return <div className={cn("ui-alert", className)} role="alert" {...props} />;
}

export type AlertTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

export function AlertTitle({ className, ...props }: AlertTitleProps) {
  return <h3 className={cn("ui-alert__title", className)} {...props} />;
}

export type AlertDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export function AlertDescription({ className, ...props }: AlertDescriptionProps) {
  return <p className={cn("ui-alert__description", className)} {...props} />;
}
