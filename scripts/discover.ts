import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getRecentSemesterCodes } from "../src/utils/semester.js";

const rootDir = process.cwd();
const recentSemesters = process.env.UNIVIS_SEMESTER
  ? [process.env.UNIVIS_SEMESTER]
  : getRecentSemesterCodes(new Date("2026-03-07T00:00:00Z"));
const seedUrls = [
  "https://univis.uni-kiel.de/",
  ...recentSemesters.flatMap((sem) => [
    `https://univis.uni-kiel.de/form?__s=2&dsc=anew/main&anonymous=1&sem=${sem}&__e=519`,
    `https://univis.uni-kiel.de/form?__s=2&dsc=anew/tlecture&anonymous=1&sem=${sem}&__e=519`
  ])
];

const pageTypes = {
  home: ["dsc=anew/main"],
  "semester-index": ["dsc=anew/tlecture"],
  "organization-list": ["dsc=anew/lecture", "dsc=anew/tlecture"],
  "course-detail": ["dsc=anew/lecture_view", "angaben", "zeit und ort"],
  "lecturer-profile": ["dsc=anew/tel_view", "sprechstunde", "telefon", "e-mail"]
};

const sourceMap = `# UnivIS Source Map

## Allowed crawl surface

- \`/\`
- \`/form\`

## Blocked crawl surface

- \`/prg\`

## Teaching entrypoints

- \`dsc=anew/main\`
- \`dsc=anew/tlecture\`
- \`dsc=anew/lecture_view\`
- \`dsc=anew/tel_view\`

## Notes

- The site is form-driven and query-based.
- Session-specific params like \`__s\` and \`__e\` are ignored during canonicalization.
- Recent semester scope: ${recentSemesters.join(", ")}
`;

await mkdir(join(rootDir, "data", "discovery"), { recursive: true });
await mkdir(join(rootDir, "docs"), { recursive: true });
await writeFile(join(rootDir, "data", "discovery", "seed-urls.json"), JSON.stringify(seedUrls, null, 2));
await writeFile(join(rootDir, "data", "discovery", "page-types.json"), JSON.stringify(pageTypes, null, 2));
await writeFile(join(rootDir, "docs", "source-map.md"), sourceMap);

console.log(`Wrote ${seedUrls.length} seed URLs for semesters ${recentSemesters.join(", ")}.`);
