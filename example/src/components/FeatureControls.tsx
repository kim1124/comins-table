import type React from "react";

import { Button, type ButtonProps } from "./ui/button";

type ActionTone = "danger" | "filter" | "primary";

type FeatureControlsProps = {
  actions?: React.ReactNode;
  options?: React.ReactNode;
};

export function FeatureControls({ actions, options }: FeatureControlsProps) {
  return (
    <div className="feature-controls">
      {options ? (
        <div className="feature-options" data-testid="feature-options">
          <span className="feature-control-label">옵션</span>
          <div className="feature-control-items">{options}</div>
        </div>
      ) : null}
      {actions ? (
        <div className="feature-actions" data-testid="feature-actions">
          <span className="feature-control-label">조작</span>
          <div className="feature-control-items">{actions}</div>
        </div>
      ) : null}
    </div>
  );
}

type ActionButtonProps = Omit<ButtonProps, "variant"> & {
  icon: React.ReactNode;
  tone?: ActionTone;
};

export function ActionButton({ children, className, icon, tone = "primary", ...props }: ActionButtonProps) {
  return (
    <Button
      className={["feature-action-button", className].filter(Boolean).join(" ")}
      data-action-tone={tone}
      variant={tone}
      {...props}
    >
      <span aria-hidden="true" className="feature-action-button__icon">
        {icon}
      </span>
      <span>{children}</span>
    </Button>
  );
}
