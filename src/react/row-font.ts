import type { Dispatch, SetStateAction } from "react";

// Native font subscriptions can outlive the render that installed them.
// Keep their callback context separate from the table's row data and state.
export function createCominsRowFontChangeHandler(setRevision: Dispatch<SetStateAction<number>>) {
  return () => setRevision(value => value + 1);
}
