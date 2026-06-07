export type PersonRow = {
  active?: boolean;
  age: number;
  id: string;
  locked?: string;
  name: string;
  role: string;
};

export const baseRows: PersonRow[] = [
  { active: true, age: 31, id: "a", locked: "A-lock", name: "Alpha", role: "Owner" },
  { active: false, age: 42, id: "b", locked: "B-lock", name: "Beta", role: "Editor" },
  { active: false, age: 27, id: "c", locked: "C-lock", name: "Gamma", role: "Viewer" },
];

export function cloneBaseRows() {
  return baseRows.map((row) => ({ ...row }));
}

export function createRows(count: number): PersonRow[] {
  return Array.from({ length: count }, (_value, index) => ({
    active: index % 2 === 0,
    age: index,
    id: `row-${index}`,
    locked: `lock-${index}`,
    name: `Row ${index}`,
    role: index % 2 === 0 ? "Owner" : "Viewer",
  }));
}
