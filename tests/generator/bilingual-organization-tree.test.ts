import { describe, expect, it } from "vitest";

interface TreeNode {
  dir: string;
  label: string;
  lectureCount?: number;
  children: TreeNode[];
}

function mergeTrees(enNode: TreeNode | undefined, deNode: TreeNode | undefined) {
  const byDir = new Map<string, { en?: TreeNode; de?: TreeNode }>();
  for (const child of enNode?.children ?? []) {
    byDir.set(child.dir, { ...(byDir.get(child.dir) ?? {}), en: child });
  }
  for (const child of deNode?.children ?? []) {
    byDir.set(child.dir, { ...(byDir.get(child.dir) ?? {}), de: child });
  }

  return {
    dir: enNode?.dir ?? deNode?.dir ?? "",
    label: {
      en: enNode?.label,
      de: deNode?.label
    },
    lectureCount: enNode?.lectureCount ?? deNode?.lectureCount,
    children: [...byDir.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, pair]) => mergeTrees(pair.en, pair.de))
  };
}

describe("bilingual organization tree", () => {
  it("merges english and german nodes by stable dir", () => {
    const tree = mergeTrees(
      {
        dir: "techn",
        label: "Faculty of Engineering",
        children: [{ dir: "techn/infor", label: "Department of Computer Science", lectureCount: 35, children: [] }]
      },
      {
        dir: "techn",
        label: "Technische Fakultät",
        children: [{ dir: "techn/infor", label: "Institut für Informatik", lectureCount: 35, children: [] }]
      }
    );

    expect(tree.label.en).toBe("Faculty of Engineering");
    expect(tree.label.de).toBe("Technische Fakultät");
    expect(tree.children[0]?.label.en).toBe("Department of Computer Science");
    expect(tree.children[0]?.label.de).toBe("Institut für Informatik");
    expect(tree.children[0]?.lectureCount).toBe(35);
  });
});
