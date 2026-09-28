export function setCominsNestedInputValue<TData>(row: TData, field: string, value: string): TData {
  if (!row || typeof row !== "object") {
    return row;
  }

  const keys = field.split(".");
  const [firstKey] = keys;

  if (!firstKey) {
    return row;
  }

  if (keys.length === 1) {
    return { ...row, [firstKey]: value };
  }

  const root = { ...(row as Record<string, unknown>) };
  let current: Record<string, unknown> = root;

  keys.slice(0, -1).forEach((key, index) => {
    const nextKey = keys[index + 1];
    const existing = current[key];
    const next =
      existing && typeof existing === "object" && !Array.isArray(existing)
        ? { ...(existing as Record<string, unknown>) }
        : {};

    current[key] = next;

    if (nextKey) {
      current = next;
    }
  });

  current[keys.at(-1)!] = value;

  return root as TData;
}
