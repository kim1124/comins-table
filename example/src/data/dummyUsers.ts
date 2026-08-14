import type { PersonRow } from "../fixtures/people";

export type DummyUser = {
  age: number;
  email: string;
  firstName: string;
  id: number;
  lastName: string;
  role?: string;
};

export type DummyUsersResponse = {
  limit: number;
  skip: number;
  total: number;
  users: DummyUser[];
};

export function buildDummyUsersUrl(offset: number, limit: number, delay = 500) {
  const params = new URLSearchParams({
    delay: String(delay),
    limit: String(limit),
    select: "id,firstName,lastName,age,email,role",
    skip: String(offset),
  });

  return `https://dummyjson.com/users?${params.toString()}`;
}

export function toPersonRows(response: DummyUsersResponse): PersonRow[] {
  return response.users.map((user) => ({
    active: user.id % 2 === 0,
    age: user.age,
    id: `dummy-${user.id}`,
    locked: user.email,
    name: `${user.firstName} ${user.lastName}`,
    role: user.role ?? (user.id % 2 === 0 ? "Owner" : "Viewer"),
  }));
}
