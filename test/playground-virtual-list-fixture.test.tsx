import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { PlaygroundLocaleProvider } from "../example/src/i18n/playground-locale";

it("creates and shares the virtual-list data only when the component example renders", async () => {
  const from = vi.spyOn(Array, "from");
  const fixtureAllocations = () => from.mock.calls.filter(([source]) => source.length === 10_000);

  try {
    const { ComponentFeature } = await import("../example/src/features/ComponentFeature");
    expect(fixtureAllocations()).toHaveLength(0);

    const html = renderToStaticMarkup(<PlaygroundLocaleProvider><ComponentFeature /></PlaygroundLocaleProvider>);
    expect(html).toContain("component-example-virtual-list-search");
    expect(html).toContain("검색-1");
    expect(fixtureAllocations()).toHaveLength(1);
  } finally {
    from.mockRestore();
  }
});
