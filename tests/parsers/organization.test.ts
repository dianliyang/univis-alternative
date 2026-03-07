import { describe, expect, it } from "vitest";
import { parseOrganizationPage } from "../../src/parsers/organization.js";

describe("organization parser", () => {
  it("extracts child organization nodes and lecture listing metadata", () => {
    const html = `
      <h2>Department of Computer Science</h2>
      <a href="form?dsc=anew/lecture&lecture_zentr=1&dir=techn/infor&sem=2025w">Lectures of this institution: 35 entries</a>
      <h4>Workgroups and Services</h4>
      <ul>
        <li><a href="form?dsc=anew/lecture&dir=techn/infor/inform&sem=2025w">Research groups</a></li>
        <li><a href="form?dsc=anew/lecture&dir=techn/infor/servic&sem=2025w">Service Departments</a></li>
      </ul>
    `;

    const parsed = parseOrganizationPage("https://univis.uni-kiel.de/form?dsc=anew/lecture&dir=techn/infor&sem=2025w", html);
    expect(parsed.label).toBe("Department of Computer Science");
    expect(parsed.lectureCount).toBe(35);
    expect(parsed.children).toEqual([
      {
        label: "Research groups",
        dir: "techn/infor/inform",
        sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/lecture&dir=techn/infor/inform&sem=2025w",
        section: "Workgroups and Services"
      },
      {
        label: "Service Departments",
        dir: "techn/infor/servic",
        sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/lecture&dir=techn/infor/servic&sem=2025w",
        section: "Workgroups and Services"
      }
    ]);
  });
});
