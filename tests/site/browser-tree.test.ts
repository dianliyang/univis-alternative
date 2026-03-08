import { describe, expect, it } from "vitest";
import { getBrowserState, type BrowserNode } from "../../site/components/browser-tree.js";

const nodes: BrowserNode[] = [
  {
    text: "Engineering",
    path: "techn",
    route: "/institutions/engineering",
    lectures: [],
    children: [
      {
        text: "Department of Electrical and Information Engineering",
        path: "techn/elekt",
        route: "/institutions/engineering/electrical-and-information-engineering",
        lectures: [],
        children: [
          {
            text: "Institute of Microelectronics",
            path: "techn/elekt/micro",
            route: "/institutions/engineering/electrical-and-information-engineering/microelectronics",
            lectures: [],
            children: []
          }
        ]
      },
      {
        text: "Department of Computer Science",
        path: "techn/infor",
        route: "/institutions/engineering/computer-science",
        lectures: [{ key: "Lecture.1", id: "1", text: "Distributed Systems", sourceUrl: "https://example.test/lecture/1" }],
        children: []
      }
    ]
  },
  {
    text: "Law",
    path: "rechts",
    route: "/institutions/law",
    lectures: [],
    children: []
  }
];

describe("browser tree", () => {
  it("shows only top-level roots when nothing is selected", () => {
    const state = getBrowserState(nodes, "");

    expect(state.roots).toHaveLength(2);
    expect(state.breadcrumb).toEqual([]);
    expect(state.children).toEqual([]);
    expect(state.lectures).toEqual([]);
  });

  it("shows a root node's direct children when that node is selected", () => {
    const state = getBrowserState(nodes, "techn");

    expect(state.breadcrumb.map((node) => node.text)).toEqual(["Engineering"]);
    expect(state.children.map((node) => node.text)).toEqual([
      "Department of Electrical and Information Engineering",
      "Department of Computer Science"
    ]);
    expect(state.lectures).toEqual([]);
  });

  it("shows only the selected branch children when a department is selected", () => {
    const state = getBrowserState(nodes, "techn/elekt");

    expect(state.breadcrumb.map((node) => node.text)).toEqual(["Engineering", "Department of Electrical and Information Engineering"]);
    expect(state.children.map((node) => node.text)).toEqual(["Institute of Microelectronics"]);
    expect(state.lectures).toEqual([]);
  });

  it("keeps the full active branch in the breadcrumb when a deeper child is selected", () => {
    const state = getBrowserState(nodes, "techn/elekt/micro");

    expect(state.breadcrumb.map((node) => node.text)).toEqual([
      "Engineering",
      "Department of Electrical and Information Engineering",
      "Institute of Microelectronics"
    ]);
    expect(state.children).toEqual([]);
    expect(state.lectures).toEqual([]);
  });

  it("returns related lectures for the active node", () => {
    const state = getBrowserState(nodes, "techn/infor");

    expect(state.lectures.map((lecture) => lecture.text)).toEqual(["Distributed Systems"]);
  });
});
