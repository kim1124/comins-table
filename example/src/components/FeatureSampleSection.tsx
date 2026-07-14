import type React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

type FeatureSampleSectionProps = {
  children: React.ReactNode;
  className?: string;
  description: React.ReactNode;
  id?: string;
  title: string;
};

export function FeatureSampleSection({ children, className, description, id, title }: FeatureSampleSectionProps) {
  return (
    <Card
      className={["feature-option-container", className].filter(Boolean).join(" ")}
      data-feature-option={id}
      data-testid="feature-sample-card"
      role="region"
    >
      <div className="feature-option-container__body" data-testid="feature-option-container">
        <CardHeader className="feature-option-copy" data-testid="feature-sample-card-header">
          <CardTitle data-testid="feature-option-heading">{title}</CardTitle>
          <CardDescription className="feature-option-description" data-testid="feature-option-description">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="feature-option-sample" data-testid="feature-sample-card-content">
          <div className="feature-option-sample__inner" data-testid="feature-option-sample">
            {children}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
