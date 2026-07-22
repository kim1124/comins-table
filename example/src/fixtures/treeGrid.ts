import type { CominsTreeNode } from "../../../src";

import type { PersonRow } from "./people";

export function createThirtyNodeTree(): Array<CominsTreeNode<PersonRow>> {
  return Array.from({ length: 3 }, (_departmentValue, departmentIndex) => {
    const departmentNumber = departmentIndex + 1;

    return {
      children: Array.from({ length: 3 }, (_teamValue, teamIndex) => {
        const teamNumber = teamIndex + 1;

        return {
          children: Array.from({ length: 2 }, (_memberValue, memberIndex) => {
            const memberNumber = memberIndex + 1;

            return {
              item: {
                active: memberNumber % 2 === 1,
                age: 20 + memberNumber,
                id: `member-${departmentNumber}-${teamNumber}-${memberNumber}`,
                name: `Member ${departmentNumber}-${teamNumber}-${memberNumber}`,
                role: "Viewer",
              },
            };
          }),
          item: {
            active: teamNumber % 2 === 1,
            age: 30 + teamNumber,
            id: `team-${departmentNumber}-${teamNumber}`,
            name: `Team ${departmentNumber}-${teamNumber}`,
            role: "Editor",
          },
        };
      }),
      item: {
        active: departmentNumber % 2 === 1,
        age: 40 + departmentNumber,
        id: `department-${departmentNumber}`,
        name: `Department ${departmentNumber}`,
        role: "Owner",
      },
    };
  });
}

export function createTenThousandNodeTree(): Array<CominsTreeNode<PersonRow>> {
  return Array.from({ length: 100 }, (_departmentValue, departmentIndex) => {
    const departmentNumber = departmentIndex + 1;

    return {
      children: Array.from({ length: 9 }, (_teamValue, teamIndex) => {
        const teamNumber = teamIndex + 1;

        return {
          children: Array.from({ length: 10 }, (_memberValue, memberIndex) => {
            const memberNumber = memberIndex + 1;

            return {
              item: {
                active: memberNumber % 2 === 1,
                age: 20 + (memberNumber % 30),
                id: `virtual-member-${departmentNumber}-${teamNumber}-${memberNumber}`,
                name: `Virtual Member ${departmentNumber}-${teamNumber}-${memberNumber}`,
                role: "Viewer",
              },
            };
          }),
          item: {
            active: teamNumber % 2 === 1,
            age: 30 + (teamNumber % 20),
            id: `virtual-team-${departmentNumber}-${teamNumber}`,
            name: `Virtual Team ${departmentNumber}-${teamNumber}`,
            role: "Editor",
          },
        };
      }),
      item: {
        active: departmentNumber % 2 === 1,
        age: 40 + (departmentNumber % 20),
        id: `virtual-department-${departmentNumber}`,
        name: `Virtual Department ${departmentNumber}`,
        role: "Owner",
      },
    };
  });
}
