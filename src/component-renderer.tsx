import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type React from "react";

import type {
  CominsCellComponentConfig,
  CominsCellComponentPayload,
  CominsTableComponentOption,
  CominsTableMenuItem,
  CominsHeaderComponentConfig,
  CominsHeaderComponentPayload,
  CominsVirtualListItem,
} from "./core";

type CominsAnyComponentPayload<TData, TValue> =
  | CominsCellComponentPayload<TData, TValue>
  | CominsHeaderComponentPayload<TData, TValue>;
type CominsAnyComponentConfig<TData, TValue> =
  | CominsCellComponentConfig<TData, TValue>
  | CominsHeaderComponentConfig<TData, TValue>;

function mergeClassName(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

function resolveComponentProps<TProps>(value: unknown, payload: unknown): TProps {
  return (typeof value === "function" ? (value as (payload: unknown) => TProps)(payload) : value ?? {}) as TProps;
}

function resolveComponentOptions(value: unknown, payload: unknown) {
  return (
    typeof value === "function"
      ? (value as (payload: unknown) => CominsTableComponentOption[])(payload)
      : value
  ) as CominsTableComponentOption[];
}

function resolveComponentMenuItems(value: unknown, payload: unknown) {
  return (
    typeof value === "function" ? (value as (payload: unknown) => CominsTableMenuItem[])(payload) : value
  ) as CominsTableMenuItem[];
}

function resolveVirtualListItems(value: unknown, payload: unknown) {
  return (
    typeof value === "function" ? (value as (payload: unknown) => CominsVirtualListItem[])(payload) : value
  ) as CominsVirtualListItem[];
}

function toSearchableText(value: React.ReactNode): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(toSearchableText).join(" ");
  }

  return "";
}

function isMenuSelectableItem(
  item: CominsTableMenuItem,
): item is Extract<CominsTableMenuItem, { value: string | number | boolean }> {
  return item.type !== "divider" && item.type !== "label";
}

function isNodeInside(element: HTMLElement | null, target: EventTarget | null) {
  return Boolean(element && target instanceof Node && element.contains(target));
}

function stopComponentEvent(event: React.SyntheticEvent | Event) {
  event.stopPropagation();
}

function preventAndStopComponentEvent(event: React.SyntheticEvent | Event) {
  event.preventDefault();
  event.stopPropagation();
}

function toComponentInputValue(value: unknown) {
  return value === undefined || value === null ? "" : String(value);
}

function CominsInputComponent<TData, TValue>({
  component,
  payload,
}: {
  component: Extract<CominsAnyComponentConfig<TData, TValue>, { type: "input" }>;
  payload: CominsAnyComponentPayload<TData, TValue>;
}) {
  const props = resolveComponentProps<React.InputHTMLAttributes<HTMLInputElement>>(component.props, payload);
  const {
    defaultValue,
    onBlur,
    onChange: _propsOnChange,
    onClick,
    onKeyDown,
    onMouseDown,
    onPointerDown,
    value,
    ...inputProps
  } = props;
  const propValue = toComponentInputValue(value ?? defaultValue);
  const [draftValue, setDraftValue] = useState(propValue);
  const lastCommittedValueRef = useRef(propValue);

  useEffect(() => {
    setDraftValue(propValue);
    lastCommittedValueRef.current = propValue;
  }, [propValue]);

  const commitValue = (event: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
    if (draftValue === lastCommittedValueRef.current) {
      return;
    }

    lastCommittedValueRef.current = draftValue;
    component.onChange?.({ ...payload, event, value: draftValue } as never);
    component.onValueChange?.({ ...payload, value: draftValue } as never);
  };

  return (
    <input
      {...inputProps}
      className={mergeClassName("comins-table__component", "comins-table__component-input", props.className)}
      onBlur={(event) => {
        onBlur?.(event);
        stopComponentEvent(event);
        commitValue(event);
      }}
      onChange={(event) => {
        stopComponentEvent(event);
        setDraftValue(event.currentTarget.value);
      }}
      onClick={(event) => {
        onClick?.(event);
        stopComponentEvent(event);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        stopComponentEvent(event);

        if (event.key === "Enter") {
          event.preventDefault();
          commitValue(event);
          event.currentTarget.blur();
        }
      }}
      onMouseDown={(event) => {
        onMouseDown?.(event);
        stopComponentEvent(event);
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        stopComponentEvent(event);
      }}
      value={draftValue}
    />
  );
}

function CominsCheckboxComponent<TData, TValue>({
  component,
  payload,
}: {
  component: Extract<CominsAnyComponentConfig<TData, TValue>, { type: "checkbox" }>;
  payload: CominsAnyComponentPayload<TData, TValue>;
}) {
  const props = resolveComponentProps<React.InputHTMLAttributes<HTMLInputElement>>(component.props, payload);
  const { checked, defaultChecked, onChange, onClick, onKeyDown, onMouseDown, onPointerDown, style, ...inputProps } = props;
  const [optimisticChecked, setOptimisticChecked] = useState(Boolean(checked ?? defaultChecked));

  useEffect(() => {
    if (checked !== undefined) {
      setOptimisticChecked(Boolean(checked));
    }
  }, [checked]);

  return (
    <input
      {...inputProps}
      checked={optimisticChecked}
      className={mergeClassName("comins-table__component", "comins-table__component-checkbox", props.className)}
      onClick={(event) => {
        onClick?.(event);
        stopComponentEvent(event);
      }}
      onChange={(event) => {
        onChange?.(event);
        stopComponentEvent(event);
        setOptimisticChecked(event.currentTarget.checked);
        component.onCheckedChange?.({ ...payload, checked: event.currentTarget.checked } as never);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        stopComponentEvent(event);
      }}
      onMouseDown={(event) => {
        onMouseDown?.(event);
        stopComponentEvent(event);
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        stopComponentEvent(event);
      }}
      style={{ height: 20, width: 20, ...style }}
      type="checkbox"
    />
  );
}

function CominsToggleComponent<TData, TValue>({
  component,
  payload,
}: {
  component: Extract<CominsAnyComponentConfig<TData, TValue>, { type: "toggle" }>;
  payload: CominsAnyComponentPayload<TData, TValue>;
}) {
  const props = resolveComponentProps<React.ButtonHTMLAttributes<HTMLButtonElement> & { checked?: boolean }>(
    component.props,
    payload,
  );
  const { checked, ...buttonProps } = props;
  const { onClick, onKeyDown, onMouseDown, onPointerDown, ...restButtonProps } = buttonProps;
  const [optimisticChecked, setOptimisticChecked] = useState(Boolean(checked));

  useEffect(() => {
    if (checked !== undefined) {
      setOptimisticChecked(Boolean(checked));
    }
  }, [checked]);

  const buttonChildren =
    typeof buttonProps.children === "string" && (buttonProps.children === "ON" || buttonProps.children === "OFF")
      ? optimisticChecked
        ? "ON"
        : "OFF"
      : buttonProps.children;

  return (
    <button
      {...restButtonProps}
      aria-pressed={optimisticChecked}
      className={mergeClassName(
        "comins-table__component",
        "comins-table__component-toggle",
        buttonProps.className,
      )}
      onClick={(event) => {
        onClick?.(event);
        stopComponentEvent(event);
        const nextChecked = !optimisticChecked;
        setOptimisticChecked(nextChecked);
        component.onCheckedChange?.({ ...payload, checked: nextChecked } as never);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        stopComponentEvent(event);
      }}
      onMouseDown={(event) => {
        onMouseDown?.(event);
        stopComponentEvent(event);
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        stopComponentEvent(event);
      }}
      type={buttonProps.type ?? "button"}
    >
      {buttonChildren}
    </button>
  );
}

function CominsHeaderMenuComponent<TData, TValue>({
  component,
  payload,
}: {
  component: Extract<CominsHeaderComponentConfig<TData, TValue>, { type: "menu" }>;
  payload: CominsHeaderComponentPayload<TData, TValue>;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<React.CSSProperties>({
    left: 0,
    position: "fixed",
    top: 0,
  });
  const props = resolveComponentProps<React.ButtonHTMLAttributes<HTMLButtonElement>>(component.props, payload);
  const items = useMemo(() => resolveComponentMenuItems(component.items, payload), [component.items, payload]);

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;

    if (!trigger || typeof window === "undefined") {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const menuWidth = Math.max(menuRef.current?.offsetWidth ?? 136, 136);

    setMenuPosition({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8)),
      position: "fixed",
      top: Math.min(rect.bottom + 4, window.innerHeight - 8),
      zIndex: 9999,
    });
  };

  const requestOpen = (nextOpen: boolean, event?: Event | React.SyntheticEvent) => {
    if (nextOpen === open) {
      return;
    }

    const beforeResult = component.onBeforeChange?.({ ...payload, event, open: nextOpen } as never);

    if (beforeResult === false) {
      return;
    }

    setOpen(nextOpen);
    component.onOpenChange?.({ ...payload, event, open: nextOpen } as never);
  };

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (isNodeInside(triggerRef.current, event.target) || isNodeInside(menuRef.current, event.target)) {
        return;
      }

      requestOpen(false, event);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        requestOpen(false, event);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      return undefined;
    }

    updateMenuPosition();

    if (typeof window === "undefined") {
      return undefined;
    }

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  const menu = open ? (
    <span
      aria-label="Header menu"
      className="comins-table__component-menu-popover"
      id={menuId}
      ref={menuRef}
      role="menu"
      style={menuPosition}
    >
      {items.map((item, index) => {
        if (item.type === "divider") {
          return (
            <span
              aria-orientation="horizontal"
              className="comins-table__component-menu-divider"
              key={`divider-${index}`}
              role="separator"
            />
          );
        }

        if (item.type === "label") {
          return (
            <span className="comins-table__component-menu-label" key={`label-${index}`} role="presentation">
              {item.label}
            </span>
          );
        }

        return (
          <button
            className="comins-table__component-menu-item"
            disabled={item.disabled}
            key={`${String(item.value)}-${index}`}
            onClick={(event) => {
              preventAndStopComponentEvent(event);

              if (item.disabled || !isMenuSelectableItem(item)) {
                return;
              }

              requestOpen(false, event);
              component.onSelect?.({ ...payload, event, item, value: item.value } as never);
            }}
            onKeyDown={stopComponentEvent}
            onMouseDown={stopComponentEvent}
            onPointerDown={stopComponentEvent}
            role="menuitem"
            type="button"
          >
            {item.label}
          </button>
        );
      })}
    </span>
  ) : null;

  return (
    <span className="comins-table__component comins-table__component-menu">
      <button
        {...props}
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={props["aria-label"] ?? "Header menu"}
        className={mergeClassName("comins-table__component-menu-trigger", props.className)}
        onClick={(event) => {
          preventAndStopComponentEvent(event);
          requestOpen(!open, event);
        }}
        onKeyDown={(event) => {
          props.onKeyDown?.(event);

          if (event.key === "Escape" && open) {
            preventAndStopComponentEvent(event);
            requestOpen(false, event);
            return;
          }

          stopComponentEvent(event);
        }}
        onMouseDown={stopComponentEvent}
        onPointerDown={(event) => {
          props.onPointerDown?.(event);
          stopComponentEvent(event);
        }}
        ref={triggerRef}
        type={props.type ?? "button"}
      >
        {props.children ?? "메뉴"}
      </button>
      {menu}
    </span>
  );
}

function CominsCellVirtualListComponent<TData, TValue>({
  component,
  payload,
}: {
  component: Extract<CominsCellComponentConfig<TData, TValue>, { type: "virtual-list" }>;
  payload: CominsCellComponentPayload<TData, TValue>;
}) {
  const props = resolveComponentProps<
    React.HTMLAttributes<HTMLDivElement> & {
      height?: number | string;
      itemHeight?: number;
      limit?: number;
      more?: boolean;
      searchable?: boolean;
    }
  >(component.props, payload);
  const {
    height,
    itemHeight: itemHeightProp,
    limit: limitProp,
    more = false,
    searchable = false,
    style,
    ...rootProps
  } = props;
  const items = useMemo(() => resolveVirtualListItems(component.items, payload), [component.items, payload]);
  const limit = Math.max(1, Number(limitProp ?? 5));
  const itemHeight = Math.max(1, Number(itemHeightProp ?? 28));
  const defaultHeight = itemHeight * 5;
  const hasExplicitHeight = height !== undefined || style?.height !== undefined;
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [selectedValue, setSelectedValue] = useState<string | number | boolean | null>(null);
  const [viewportHeight, setViewportHeight] = useState(defaultHeight);
  const itemsViewportRef = useRef<HTMLDivElement>(null);
  const isSingleRowSelected = payload.row.selected && payload.selection.selectedRowCount === 1;
  const searchEnabled = Boolean(searchable && isSingleRowSelected);
  const moreEnabled = Boolean(more && isSingleRowSelected);
  const activeQuery = searchEnabled ? query : "";

  useEffect(() => {
    setExpanded(false);
    setScrollTop(0);
  }, [items.length, limit]);

  useLayoutEffect(() => {
    const viewport = itemsViewportRef.current;

    if (!viewport) {
      return;
    }

    const measuredHeight = viewport.clientHeight > 0 ? viewport.clientHeight : defaultHeight;

    setViewportHeight(hasExplicitHeight ? measuredHeight : Math.min(measuredHeight, defaultHeight));
  }, [defaultHeight, expanded, activeQuery, hasExplicitHeight]);

  useEffect(() => {
    const viewport = itemsViewportRef.current;

    if (!viewport) {
      return;
    }

    viewport.scrollTop = 0;
    setScrollTop(0);
  }, [activeQuery]);

  useEffect(() => {
    if (isSingleRowSelected) {
      return;
    }

    const viewport = itemsViewportRef.current;

    if (viewport) {
      viewport.scrollTop = 0;
    }

    setExpanded(false);
    setQuery("");
    setScrollTop(0);
  }, [isSingleRowSelected]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = activeQuery.trim().toLowerCase();

    return items
      .map((item, itemIndex) => ({ item, itemIndex }))
      .filter(({ item, itemIndex }) => {
        if (!normalizedQuery) {
          return true;
        }

        if (component.searchFilter) {
          return component.searchFilter({ item, itemIndex, value: activeQuery });
        }

        return toSearchableText(item.label).toLowerCase().includes(normalizedQuery);
      });
  }, [activeQuery, component, items]);
  const hasOverflow = filteredEntries.length > limit;
  const virtualized = Boolean(
    isSingleRowSelected && (expanded || activeQuery.trim().length > 0 || (!more && hasOverflow)),
  );
  const showOverflowControl = hasOverflow && !virtualized;
  const overscan = searchEnabled && !expanded ? 0 : 2;
  const safeViewportHeight = Math.max(
    itemHeight,
    hasExplicitHeight ? viewportHeight || defaultHeight : Math.min(viewportHeight || defaultHeight, defaultHeight),
  );
  const visibleStart = Math.max(0, Math.floor(Math.max(0, scrollTop) / itemHeight) - overscan);
  const visibleEnd = Math.min(
    filteredEntries.length,
    Math.ceil((Math.max(0, scrollTop) + safeViewportHeight) / itemHeight) + overscan,
  );
  const renderedEntries = virtualized
    ? filteredEntries.slice(visibleStart, visibleEnd)
    : filteredEntries.slice(0, hasOverflow ? limit : filteredEntries.length);
  const topSpacerHeight = virtualized ? visibleStart * itemHeight : 0;
  const bottomSpacerHeight = virtualized ? Math.max(0, filteredEntries.length - visibleEnd) * itemHeight : 0;
  const listId = `${String(payload.row.id)}-${payload.column.id}`;
  const rootStyle = {
    ...style,
    "--comins-table-virtual-list-item-height": `${itemHeight}px`,
    height: height ?? style?.height ?? defaultHeight,
  } as React.CSSProperties;

  const selectItem = (
    item: CominsVirtualListItem,
    itemIndex: number,
    event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (item.disabled) {
      return;
    }

    setSelectedValue(item.value);
    component.onClickItem?.({ ...payload, event, item, itemIndex, value: item.value } as never);
  };

  return (
    <div
      {...rootProps}
      aria-label={rootProps["aria-label"] ?? "Virtual list"}
      className={mergeClassName("comins-table__component", "comins-table__component-virtual-list", rootProps.className)}
      data-comins-virtual-list-expanded={virtualized ? "true" : undefined}
      data-comins-virtual-list-visible-count={renderedEntries.length}
      data-testid={`virtual-list-${listId}`}
      onClick={(event) => {
        rootProps.onClick?.(event);
        stopComponentEvent(event);
      }}
      onKeyDown={stopComponentEvent}
      onMouseDown={stopComponentEvent}
      onContextMenu={stopComponentEvent}
      onDoubleClick={stopComponentEvent}
      onMouseUp={stopComponentEvent}
      onPointerUp={stopComponentEvent}
      onPointerMove={stopComponentEvent}
      onPointerEnter={stopComponentEvent}
      onMouseOver={stopComponentEvent}
      onMouseOut={stopComponentEvent}
      onPointerLeave={stopComponentEvent}
      onBlur={stopComponentEvent}
      onFocus={stopComponentEvent}
      onInput={stopComponentEvent}
      onChange={stopComponentEvent}
      onMouseMove={stopComponentEvent}
      onMouseEnter={stopComponentEvent}
      onMouseLeave={stopComponentEvent}
      onTouchStart={stopComponentEvent}
      onTouchMove={stopComponentEvent}
      onTouchEnd={stopComponentEvent}
      onWheel={(event) => {
        rootProps.onWheel?.(event);
        stopComponentEvent(event);
      }}
      onPointerDown={(event) => {
        rootProps.onPointerDown?.(event);
        stopComponentEvent(event);
      }}
      role="listbox"
      style={rootStyle}
    >
      <div
        className="comins-table__component-virtual-list-items"
        onScroll={(event) => {
          stopComponentEvent(event);
          setScrollTop(event.currentTarget.scrollTop);
          const measuredHeight = event.currentTarget.clientHeight > 0 ? event.currentTarget.clientHeight : defaultHeight;
          setViewportHeight(hasExplicitHeight ? measuredHeight : Math.min(measuredHeight, defaultHeight));
        }}
        ref={itemsViewportRef}
        role="presentation"
      >
        {topSpacerHeight > 0 ? (
          <span aria-hidden="true" className="comins-table__component-virtual-list-spacer" style={{ height: topSpacerHeight }} />
        ) : null}
        {renderedEntries.map(({ item, itemIndex }) => (
          <button
            aria-selected={selectedValue === item.value}
            className="comins-table__component-virtual-list-item"
            data-comins-virtual-list-item="true"
            disabled={item.disabled}
            key={`${String(item.value)}-${itemIndex}`}
            onClick={(event) => {
              preventAndStopComponentEvent(event);
              selectItem(item, itemIndex, event);
            }}
            onContextMenu={(event) => {
              stopComponentEvent(event);

              if (item.disabled) {
                return;
              }

              component.onContextMenuItem?.({ ...payload, event, item, itemIndex, value: item.value } as never);
            }}
            onKeyDown={(event) => {
              stopComponentEvent(event);

              if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
                event.preventDefault();
                selectItem(item, itemIndex, event);
              }
            }}
            onMouseDown={stopComponentEvent}
            onPointerDown={stopComponentEvent}
            role="option"
            type="button"
          >
            <span className="comins-table__component-virtual-list-item-label">{item.label}</span>
          </button>
        ))}
        {bottomSpacerHeight > 0 ? (
          <span
            aria-hidden="true"
            className="comins-table__component-virtual-list-spacer"
            style={{ height: bottomSpacerHeight }}
          />
        ) : null}
      </div>
      <div className="comins-table__component-virtual-list-controls">
        {showOverflowControl ? (
          moreEnabled ? (
            <button
              aria-label="전체 목록 보기"
              className="comins-table__component-virtual-list-overflow comins-table__component-virtual-list-more"
              data-testid={`virtual-list-overflow-${listId}`}
              onClick={(event) => {
                preventAndStopComponentEvent(event);
                setExpanded(true);
              }}
              onKeyDown={stopComponentEvent}
              onMouseDown={stopComponentEvent}
              onPointerDown={stopComponentEvent}
              type="button"
            >
              ...
            </button>
          ) : (
            <span
              aria-hidden="true"
              className="comins-table__component-virtual-list-overflow comins-table__component-virtual-list-more"
              data-testid={`virtual-list-overflow-${listId}`}
            >
              ...
            </span>
          )
        ) : null}
        {searchEnabled ? (
          <input
            aria-label={`${rootProps["aria-label"] ?? "Virtual list"} 검색`}
            className="comins-table__component-virtual-list-search"
            data-testid={`virtual-list-search-${listId}`}
            onChange={(event) => {
              stopComponentEvent(event);
              setQuery(event.currentTarget.value);
            }}
            onClick={stopComponentEvent}
            onKeyDown={stopComponentEvent}
            onMouseDown={stopComponentEvent}
            onPointerDown={stopComponentEvent}
            placeholder="검색"
            value={query}
          />
        ) : null}
      </div>
    </div>
  );
}

export function renderCominsBuiltInComponent<TData, TValue>(
  component: CominsCellComponentConfig<TData, TValue>,
  payload: CominsCellComponentPayload<TData, TValue>,
): React.ReactNode;
export function renderCominsBuiltInComponent<TData, TValue>(
  component: CominsHeaderComponentConfig<TData, TValue>,
  payload: CominsHeaderComponentPayload<TData, TValue>,
): React.ReactNode;
export function renderCominsBuiltInComponent<TData, TValue>(
  component: CominsAnyComponentConfig<TData, TValue>,
  payload: CominsAnyComponentPayload<TData, TValue>,
): React.ReactNode {
  if (component.type === "menu") {
    return <CominsHeaderMenuComponent component={component} payload={payload as CominsHeaderComponentPayload<TData, TValue>} />;
  }

  if (component.type === "virtual-list") {
    return (
      <CominsCellVirtualListComponent
        component={component}
        payload={payload as CominsCellComponentPayload<TData, TValue>}
      />
    );
  }

  if (component.type === "button") {
    const props = resolveComponentProps<React.ButtonHTMLAttributes<HTMLButtonElement>>(component.props, payload);
    const { onClick, onKeyDown, onMouseDown, onPointerDown, ...buttonProps } = props;

    return (
      <button
        {...buttonProps}
        className={mergeClassName(
          "comins-table__component",
          "comins-table__component-button",
          props.className,
        )}
        onClick={(event) => {
          onClick?.(event);
          stopComponentEvent(event);
          component.onClick?.({ ...payload, event } as never);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          stopComponentEvent(event);
        }}
        onMouseDown={(event) => {
          onMouseDown?.(event);
          stopComponentEvent(event);
        }}
        onPointerDown={(event) => {
          onPointerDown?.(event);
          stopComponentEvent(event);
        }}
        type={props.type ?? "button"}
      />
    );
  }

  if (component.type === "input") {
    return <CominsInputComponent component={component} payload={payload} />;
  }

  if (component.type === "checkbox") {
    return <CominsCheckboxComponent component={component} payload={payload} />;
  }

  if (component.type === "select") {
    const props = resolveComponentProps<React.SelectHTMLAttributes<HTMLSelectElement>>(component.props, payload);
    const options = resolveComponentOptions(component.options, payload);
    const { onChange, onClick, onKeyDown, onMouseDown, onPointerDown, ...selectProps } = props;

    return (
      <select
        {...selectProps}
        className={mergeClassName(
          "comins-table__component",
          "comins-table__component-select",
          props.className,
        )}
        onClick={(event) => {
          onClick?.(event);
          stopComponentEvent(event);
        }}
        onChange={(event) => {
          onChange?.(event);
          stopComponentEvent(event);
          component.onValueChange?.({ ...payload, value: event.currentTarget.value } as never);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          stopComponentEvent(event);
        }}
        onMouseDown={(event) => {
          onMouseDown?.(event);
          stopComponentEvent(event);
        }}
        onPointerDown={(event) => {
          onPointerDown?.(event);
          stopComponentEvent(event);
        }}
      >
        {options.map((option) => (
          <option disabled={option.disabled} key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (component.type === "radio") {
    const props = resolveComponentProps<
      React.HTMLAttributes<HTMLDivElement> & { value?: string | number | boolean }
    >(component.props, payload);
    const options = resolveComponentOptions(component.options, payload);
    const selectedValue =
      props.value ?? ("value" in payload ? (payload as CominsCellComponentPayload<TData, TValue>).value : undefined);
    const groupName =
      "row" in payload
        ? `${payload.column.id}-${String((payload as CominsCellComponentPayload<TData, TValue>).row.id)}-radio`
        : `${payload.column.id}-header-radio`;
    const { value: _value, ...divProps } = props;

    return (
      <div
        {...divProps}
        className={mergeClassName("comins-table__component", "comins-table__component-radio", divProps.className)}
        onClick={(event) => {
          divProps.onClick?.(event);
          stopComponentEvent(event);
        }}
        onKeyDown={(event) => {
          divProps.onKeyDown?.(event);
          stopComponentEvent(event);
        }}
        onMouseDown={(event) => {
          divProps.onMouseDown?.(event);
          stopComponentEvent(event);
        }}
        onPointerDown={(event) => {
          divProps.onPointerDown?.(event);
          stopComponentEvent(event);
        }}
        role="radiogroup"
      >
        {options.map((option) => (
          <label key={String(option.value)} onClick={stopComponentEvent} onMouseDown={stopComponentEvent}>
            <input
              checked={selectedValue === undefined ? undefined : String(selectedValue) === String(option.value)}
              disabled={option.disabled}
              name={groupName}
              onClick={stopComponentEvent}
              onChange={(event) => {
                stopComponentEvent(event);

                if (event.currentTarget.checked) {
                  component.onValueChange?.({ ...payload, value: String(option.value) } as never);
                }
              }}
              onKeyDown={stopComponentEvent}
              onMouseDown={stopComponentEvent}
              onPointerDown={stopComponentEvent}
              style={{ height: 20, width: 20 }}
              type="radio"
              value={String(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    );
  }

  if (component.type === "toggle") {
    return <CominsToggleComponent component={component} payload={payload} />;
  }

  const props = resolveComponentProps<React.HTMLAttributes<HTMLDivElement> & { max?: number; value?: number }>(
    component.props,
    payload,
  );
  const value = Number(props.value ?? 0);
  const max = Math.max(1, Number(props.max ?? 100));
  const percent = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div
      {...props}
      aria-valuemax={max}
      aria-valuemin={0}
      aria-valuenow={value}
      className={mergeClassName("comins-table__component", "comins-table__component-progress", props.className)}
      onClick={stopComponentEvent}
      onKeyDown={stopComponentEvent}
      onMouseDown={stopComponentEvent}
      onPointerDown={stopComponentEvent}
      role="progressbar"
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}
