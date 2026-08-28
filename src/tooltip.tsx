import type React from "react";
import { useLayoutEffect, useRef, useState } from "react";

type CominsTooltipPlacement = "above" | "below";

export type CominsTooltipSurfaceProps = {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  tone?: "danger" | "neutral";
};

export function CominsTooltipSurface({
  children,
  className,
  icon,
  tone = "neutral",
}: CominsTooltipSurfaceProps) {
  return (
    <div
      className={[
        "comins-tooltip-surface",
        `comins-tooltip-surface--${tone}`,
        className,
      ].filter(Boolean).join(" ")}
    >
      {icon ? <span aria-hidden="true" className="comins-tooltip-surface__icon">{icon}</span> : null}
      <span className="comins-tooltip-surface__content">{children}</span>
    </div>
  );
}

export type CominsPointerTooltipProps = CominsTooltipSurfaceProps & {
  x: number;
  y: number;
};

export function CominsPointerTooltip({
  children,
  className,
  icon,
  tone,
  x,
  y,
}: CominsPointerTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({
    left: x + 12,
    placement: "below" as CominsTooltipPlacement,
    top: y + 12,
  });

  useLayoutEffect(() => {
    const element = tooltipRef.current;

    if (!element) {
      return;
    }

    const bounds = element.getBoundingClientRect();
    const viewportMargin = 8;
    const pointerOffset = 12;
    const maxLeft = Math.max(viewportMargin, window.innerWidth - bounds.width - viewportMargin);
    const preferredTop = y + pointerOffset;
    const fitsBelow = preferredTop + bounds.height <= window.innerHeight - viewportMargin;
    const placement: CominsTooltipPlacement = fitsBelow ? "below" : "above";
    const top = fitsBelow
      ? preferredTop
      : Math.max(viewportMargin, y - bounds.height - pointerOffset);

    setPosition({
      left: Math.min(Math.max(viewportMargin, x + pointerOffset), maxLeft),
      placement,
      top,
    });
  }, [children, x, y]);

  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="comins-pointer-tooltip"
      data-placement={position.placement}
      data-testid="transfer-rejection-tooltip"
      ref={tooltipRef}
      role="status"
      style={{ left: position.left, top: position.top }}
    >
      <CominsTooltipSurface className={className} icon={icon} tone={tone}>
        {children}
      </CominsTooltipSurface>
    </div>
  );
}
