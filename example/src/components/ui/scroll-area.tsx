import type * as React from "react";

import { cn } from "../../lib/utils";

export type ScrollAreaProps = React.HTMLAttributes<HTMLDivElement>;

export function ScrollArea({ className, ...props }: ScrollAreaProps) {
  return <div className={cn("ui-scroll-area", className)} {...props} />;
}
