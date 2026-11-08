import { expect, it } from "vitest";
import { dataTableOptionGuide, getDataTableOptionGuide, getImplementedDataTableOptionGuide } from "../example/src/docs/dataTableOptionGuide";
import type { PlaygroundLocale } from "../example/src/i18n/types";

it.each(["en", "ko"] as const)("reuses pure %s option data across repeated route entries", locale => {
  const first = getDataTableOptionGuide(locale);
  for (let entry = 0; entry < 300; entry += 1) {
    expect(getDataTableOptionGuide(locale)).toBe(first);
  }
});

it.each(["en", "ko"] as const)("preserves every localized %s value and isolates the two languages", locale => {
  expect(getDataTableOptionGuide(locale)).toEqual(dataTableOptionGuide.map(group => ({
    title: group.title[locale],
    items: group.items.map(item => ({ name: item.name, description: item.description[locale] })),
  })));
  expect(getDataTableOptionGuide("en")).not.toBe(getDataTableOptionGuide("ko"));
});

it("prevents one document consumer from mutating shared localized data", () => {
  for (const locale of ["en", "ko"] satisfies PlaygroundLocale[]) {
    const guide = getDataTableOptionGuide(locale);
    expect(Object.isFrozen(guide)).toBe(true);
    for (const group of guide) {
      expect(Object.isFrozen(group)).toBe(true);
      expect(Object.isFrozen(group.items)).toBe(true);
      for (const item of group.items) {
        expect(Object.isFrozen(item)).toBe(true);
        expect(Reflect.set(item, "description", "changed by another consumer")).toBe(false);
      }
    }
  }
});

it.each(["en", "ko"] as const)("reuses the implemented %s reference view without changing roadmap filtering", locale => {
  const guide = getDataTableOptionGuide(locale);
  const isRoadmap = (group: (typeof guide)[number]) => group.title === "Roadmap" || group.title === "로드맵";
  const usage = guide.find(isRoadmap)?.items.filter(item => item.name === "data + onChangeData" || item.name === "CSR");
  const expected = [
    ...guide.filter(group => !isRoadmap(group)),
    ...(usage?.length ? [{ title: locale === "en" ? "Usage Contract" : "사용 계약", items: usage }] : []),
  ];
  const first = getImplementedDataTableOptionGuide(locale);
  expect(first).toEqual(expected);
  for (let entry = 0; entry < 300; entry += 1) expect(getImplementedDataTableOptionGuide(locale)).toBe(first);
  expect(Object.isFrozen(first)).toBe(true);
  for (const group of first) {
    expect(Object.isFrozen(group)).toBe(true);
    expect(Object.isFrozen(group.items)).toBe(true);
  }
});
