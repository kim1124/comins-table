import type React from "react";

import { Button, type ButtonProps } from "./ui/button";

type ActionTone = "danger" | "filter" | "primary";

type FeatureControlsProps = {
  actions?: React.ReactNode;
  options?: React.ReactNode;
};

export function FeatureControls({ actions, options }: FeatureControlsProps) {
  return (
    <div className="feature-controls" data-testid="feature-controls">
      <div className="feature-control-row" data-testid="feature-control-row">
        {options ? (
          <span className="feature-control-group" data-testid="feature-options">
            {options}
          </span>
        ) : null}
        {actions ? (
          <span className="feature-control-group" data-testid="feature-actions">
            {actions}
          </span>
        ) : null}
      </div>
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
