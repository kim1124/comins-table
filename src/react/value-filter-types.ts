import type * as React from "react";
import type { CominsTableRuntimeColumn } from "../react-types";
import type { CominsColumnFilterOption, CominsColumnFilterOptionsResult } from "../core/rows/values-filter";

type Protected = "checked" | "value" | "disabled" | "type" | "role" | "tabIndex" | "aria-checked" | "aria-disabled" | "aria-expanded" | "aria-controls" | "aria-label";
export type CominsFilterNativeOptions<TElement extends HTMLElement, TProps> = {
  element?: "native"; props?: Omit<TProps, Protected>; ref?: React.Ref<TElement>;
};
export type CominsFilterCustomOptions<TElement extends HTMLElement> = {
  element: "custom"; props?: Omit<React.HTMLAttributes<TElement>, Protected>; ref?: React.Ref<TElement>;
};
export type CominsFilterBinding<TElement extends HTMLElement, TProps> = TProps & { ref: React.RefCallback<TElement> };
export type CominsFilterButtonGetter = {
  (options?: CominsFilterNativeOptions<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>): CominsFilterBinding<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>;
  <TElement extends HTMLElement = HTMLElement>(options: CominsFilterCustomOptions<TElement>): CominsFilterBinding<TElement, React.HTMLAttributes<TElement>>;
};
export type CominsFilterCheckboxGetter = {
  (options?: CominsFilterNativeOptions<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>): CominsFilterBinding<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>;
  <TElement extends HTMLElement = HTMLElement>(options: CominsFilterCustomOptions<TElement>): CominsFilterBinding<TElement, React.HTMLAttributes<TElement>>;
};
export type CominsValueFilterActions = {
  setQuery: (query: string) => void; setOptionSelected: (id: string, checked: boolean) => void;
  setVisibleSelected: (checked: boolean) => void; clear: () => void; close: () => void;
};
export type CominsValueFilterOptionRenderParams<TData> = {
  column: CominsTableRuntimeColumn<TData>; option: CominsColumnFilterOption; query: string; readOnly: boolean;
};
export type CominsValueFilterTriggerRenderParams<TData> = {
  column: CominsTableRuntimeColumn<TData>; columnLabel: string; open: boolean; active: boolean; readOnly: boolean; canOpen: boolean;
  selection?: CominsColumnFilterOptionsResult; getTriggerProps: CominsFilterButtonGetter;
};
export type CominsValueFilterPanelRenderParams<TData> = CominsColumnFilterOptionsResult & {
  column: CominsTableRuntimeColumn<TData>; query: string; readOnly: boolean; actions: CominsValueFilterActions;
  getSearchInputProps: (options?: CominsFilterNativeOptions<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>) => CominsFilterBinding<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>;
  getOptionProps: {
    (option: CominsColumnFilterOption, options?: CominsFilterNativeOptions<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>): CominsFilterBinding<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>;
    <TElement extends HTMLElement = HTMLElement>(option: CominsColumnFilterOption, options: CominsFilterCustomOptions<TElement>): CominsFilterBinding<TElement, React.HTMLAttributes<TElement>>;
  };
  getOptionContainerProps: (option: CominsColumnFilterOption, options?: { props?: React.HTMLAttributes<HTMLElement> }) => React.HTMLAttributes<HTMLElement>;
  getSelectAllProps: CominsFilterCheckboxGetter;
  getClearProps: (options?: CominsFilterNativeOptions<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>) => CominsFilterBinding<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>;
  getCloseProps: CominsValueFilterPanelRenderParams<TData>["getClearProps"];
  renderOption: (option: CominsColumnFilterOption) => React.ReactNode;
};
export type CominsValueFilterPart<TParams> = {
  /** undefined selects built-in content; null/false/empty string clears this render region. */
  render?: (params: TParams) => React.ReactNode;
  props?: { className?: string; style?: React.CSSProperties } | ((params: TParams) => { className?: string; style?: React.CSSProperties });
};
