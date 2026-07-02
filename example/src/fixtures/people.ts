export type PersonRow = {
  active?: boolean;
  age: number;
  id: string;
  locked?: string;
  name: string;
  role: string;
};

export const baseRows: PersonRow[] = [
  { active: true, age: 31, id: "a", locked: "Data 1", name: "Data 1", role: "Owner" },
  { active: false, age: 42, id: "b", locked: "Data 2", name: "Data 2", role: "Editor" },
  { active: false, age: 27, id: "c", locked: "Data 3", name: "Data 3", role: "Viewer" },
];

export function cloneBaseRows() {
  return baseRows.map((row) => ({ ...row }));
}

export function createRows(count: number): PersonRow[] {
  return Array.from({ length: count }, (_value, index) => ({
    active: index % 2 === 0,
    age: index,
    id: `row-${index}`,
    locked: `Data ${index + 1}`,
    name: `Data ${index + 1}`,
    role: index % 2 === 0 ? "Owner" : "Viewer",
  }));
}

const virtualRowTemplate: PersonRow = {
  active: true,
  age: 0,
  id: "virtual-row",
  locked: "Data 1",
  name: "Data 1",
  role: "Owner",
};

export function createVirtualRows(count: number): PersonRow[] {
  return Array.from({ length: count }, () => virtualRowTemplate);
}

export function createExampleRows(count = 100): PersonRow[] {
  const rows = cloneBaseRows();

  for (let index = rows.length; index < count; index += 1) {
    rows.push({
      active: index % 2 === 0,
      age: index,
      id: `row-${index}`,
      locked: `Data ${index + 1}`,
      name: `Data ${index + 1}`,
      role: index % 2 === 0 ? "Owner" : "Viewer",
    });
  }

  return rows.slice(0, count);
}
