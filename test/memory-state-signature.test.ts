// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { memoryStateSignatureExpression } from "./playwright/helpers/memory-state-signature";

const readSignature = () => window.eval(memoryStateSignatureExpression) as string;
afterEach(() => { document.body.replaceChildren(); });

it("distinguishes focus on different controls in the same checkpoint", () => {
  document.body.innerHTML = '<button>Reset</button><input aria-label="Search">';
  document.querySelector("button")!.focus();
  const baseline = readSignature();
  document.querySelector("input")!.focus();
  expect(readSignature()).not.toBe(baseline);
  document.querySelector("button")!.focus();
  expect(readSignature()).toBe(baseline);
});

it.each(['<div data-playground-multi-select-portal></div>', '<div role="dialog"></div>', '<div role="menu"></div>', '<div role="tooltip"></div>'])(
  "distinguishes an open overlay outside the table root (%s)", markup => {
    const baseline = readSignature();
    document.body.innerHTML = markup;
    expect(readSignature()).not.toBe(baseline);
    document.body.replaceChildren();
    expect(readSignature()).toBe(baseline);
  },
);
