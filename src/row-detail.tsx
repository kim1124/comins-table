import { useLayoutEffect, useRef } from "react";
import type * as React from "react";

export function CominsRowDetailToggle(props: {
  controlsId?: string;
  disabled: boolean;
  expanded: boolean;
  id: string;
  label: string;
  onElement: (element: HTMLButtonElement | null) => void;
  onToggle: () => void;
  testId: string;
}) {
  return (
    <button
      aria-controls={props.expanded ? props.controlsId : undefined}
      aria-expanded={props.expanded}
      aria-label={props.label}
      className="comins-row-detail-expander"
      data-testid={props.testId}
      disabled={props.disabled}
      id={props.id}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        props.onToggle();
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      ref={props.onElement}
      type="button"
    >
      {props.expanded ? "▾" : "▸"}
    </button>
  );
}

export function CominsRowDetailRow(props: {
  children: React.ReactNode;
  colSpan: number;
  contentId: string;
  fixedHeight?: number;
  labelId: string;
  onContentElement: (element: HTMLDivElement | null) => void;
  ownerId: string;
  testId: string;
  getToggleElement: () => HTMLButtonElement | null;
}) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const getToggleElementRef = useRef(props.getToggleElement);
  const onContentElementRef = useRef(props.onContentElement);
  const automatic = props.fixedHeight === undefined;

  getToggleElementRef.current = props.getToggleElement;
  onContentElementRef.current = props.onContentElement;

  useLayoutEffect(() => {
    const element = contentRef.current;

    onContentElementRef.current(element);

    return () => onContentElementRef.current(null);
  }, [automatic]);

  useLayoutEffect(
    () => () => {
      if (contentRef.current && contentRef.current.contains(document.activeElement)) {
        getToggleElementRef.current()?.focus();
      }
    },
    [],
  );

  return (
    <tr className="comins-table__detail-row" data-detail-for={props.ownerId}>
      <td className="comins-table__detail-cell" colSpan={Math.max(1, props.colSpan)}>
        <div
          aria-labelledby={props.labelId}
          className="comins-table__detail-content"
          data-testid={props.testId}
          id={props.contentId}
          ref={contentRef}
          role="region"
          style={props.fixedHeight === undefined ? undefined : { height: props.fixedHeight }}
        >
          {props.children}
        </div>
      </td>
    </tr>
  );
}
