import type * as React from "react";
import { createContext, useContext, useMemo, useState } from "react";

import { cn } from "../../lib/utils";

type TabsContextValue = {
  setValue: (value: string) => void;
  value: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);

  if (!context) {
    throw new Error("Tabs components must be used within Tabs.");
  }

  return context;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue: string;
}

export function Tabs({ children, className, defaultValue, ...props }: TabsProps) {
  const [value, setValue] = useState(defaultValue);
  const context = useMemo(() => ({ setValue, value }), [value]);

  return (
    <TabsContext.Provider value={context}>
      <div className={cn("ui-tabs", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export type TabsListProps = React.HTMLAttributes<HTMLDivElement>;

export function TabsList({ className, ...props }: TabsListProps) {
  return <div className={cn("ui-tabs__list", className)} role="tablist" {...props} />;
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({ children, className, onClick, type = "button", value, ...props }: TabsTriggerProps) {
  const context = useTabsContext();
  const selected = context.value === value;

  return (
    <button
      aria-selected={selected}
      className={cn("ui-tabs__trigger", className)}
      onClick={(event) => {
        context.setValue(value);
        onClick?.(event);
      }}
      role="tab"
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string;
};

export function TabsContent({ className, value, ...props }: TabsContentProps) {
  const context = useTabsContext();

  if (context.value !== value) {
    return null;
  }

  return <div className={cn("ui-tabs__content", className)} role="tabpanel" {...props} />;
}
