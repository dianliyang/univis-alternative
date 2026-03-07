# UnivIS Kiel Static Catalog Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a read-only static UnivIS browser for `https://univis.uni-kiel.de` with a repeatable crawl/parse/generate pipeline and strong language filtering for English-taught vs German-only courses.

**Architecture:** A TypeScript pipeline fetches and caches allowed `/form` pages, stores raw HTML snapshots, parses them into typed entities, normalizes the results into stable build assets, and generates a VitePress site that renders browse and detail pages from generated JSON. Language classification is computed during normalization and surfaced in the UI as badges and filters with preserved evidence and confidence.

**Tech Stack:** Node.js, TypeScript, VitePress, Vitest, Cheerio, npm

---

### Task 1: Bootstrap the repository

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `README.md`
- Create: `vitest.config.ts`
- Create: `src/types.ts`

**Step 1: Write the failing test**

Create `tests/smoke/project-structure.test.ts` asserting the project exports shared types and the test runner resolves `src/types.ts`.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/smoke/project-structure.test.ts`
Expected: FAIL because project files and test config do not exist yet.

**Step 3: Write minimal implementation**

Add the Node/TypeScript package manifest, Vitest config, base tsconfig, ignore rules, a short README, and a minimal `src/types.ts` exporting the core type placeholders used by later tasks.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/smoke/project-structure.test.ts`
Expected: PASS

**Step 5: Commit**

Run:
```bash
git add package.json tsconfig.json .gitignore README.md vitest.config.ts src/types.ts tests/smoke/project-structure.test.ts
git commit -m "chore: bootstrap univis kiel catalog project"
```

### Task 2: Add crawl policy and URL utilities

**Files:**
- Create: `src/crawl/policy.ts`
- Create: `src/utils/url.ts`
- Test: `tests/crawl/policy.test.ts`

**Step 1: Write the failing test**

Create tests that:
- reject any URL under `/prg`
- accept allowed `/form` URLs on `https://univis.uni-kiel.de`
- canonicalize equivalent query URLs into one stable form

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/crawl/policy.test.ts`
Expected: FAIL because the policy and canonicalization helpers do not exist.

**Step 3: Write minimal implementation**

Implement:
- host restriction to `univis.uni-kiel.de`
- explicit `/prg` block
- allowed-path checks for public `/form`
- query canonicalization with sorted params and normalized protocol/host handling

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/crawl/policy.test.ts`
Expected: PASS

**Step 5: Commit**

Run:
```bash
git add src/crawl/policy.ts src/utils/url.ts tests/crawl/policy.test.ts
git commit -m "test: add crawl policy and URL canonicalization"
```

### Task 3: Create discovery seeds and source map generation

**Files:**
- Create: `scripts/discover.ts`
- Create: `docs/source-map.md`
- Create: `data/discovery/seed-urls.json`
- Create: `data/discovery/page-types.json`
- Test: `tests/discovery/discover.test.ts`

**Step 1: Write the failing test**

Add a test that verifies the discovery script writes the expected seed URLs and page-type metadata for the known UnivIS entrypoints.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/discovery/discover.test.ts`
Expected: FAIL because the script and generated artifacts do not exist.

**Step 3: Write minimal implementation**

Implement a discovery script that emits:
- curated seed URLs for teaching listings and organization pages
- a minimal source map doc describing page classes and crawl entrypoints
- a JSON page-type registry used by the classifier

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/discovery/discover.test.ts`
Expected: PASS

**Step 5: Commit**

Run:
```bash
git add scripts/discover.ts docs/source-map.md data/discovery/seed-urls.json data/discovery/page-types.json tests/discovery/discover.test.ts
git commit -m "feat: add discovery seeds and source map"
```

### Task 4: Build the crawler with cache and crawl log

**Files:**
- Create: `src/crawl/client.ts`
- Create: `src/crawl/store.ts`
- Create: `scripts/crawl.ts`
- Create: `data/logs/.gitkeep`
- Test: `tests/crawl/crawl-store.test.ts`

**Step 1: Write the failing test**

Add tests that verify:
- responses are stored under `data/raw`
- crawl metadata is appended to `data/logs/crawl-log.jsonl`
- unchanged canonical URLs are skipped on rerun

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/crawl/crawl-store.test.ts`
Expected: FAIL because the crawler store and script are missing.

**Step 3: Write minimal implementation**

Implement:
- a polite fetch client with delay and retry caps
- raw HTML snapshot storage keyed by canonical URL hash
- crawl metadata logging
- resumable skip logic based on existing snapshots or unchanged hash

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/crawl/crawl-store.test.ts`
Expected: PASS

**Step 5: Commit**

Run:
```bash
git add src/crawl/client.ts src/crawl/store.ts scripts/crawl.ts data/logs/.gitkeep tests/crawl/crawl-store.test.ts
git commit -m "feat: add cached crawler and crawl log"
```

### Task 5: Classify raw pages by template

**Files:**
- Create: `src/parsers/classify.ts`
- Create: `tests/fixtures/classification/`
- Test: `tests/parsers/classification.test.ts`

**Step 1: Write the failing test**

Create fixture-based tests for:
- semester index
- faculty or institute listing
- course detail
- lecturer profile
- schedule listing

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/parsers/classification.test.ts`
Expected: FAIL because the classifier and fixtures are not present.

**Step 3: Write minimal implementation**

Implement a conservative classifier that uses title text, heading markers, and known URL or query patterns to map snapshots into page types.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/parsers/classification.test.ts`
Expected: PASS

**Step 5: Commit**

Run:
```bash
git add src/parsers/classify.ts tests/fixtures/classification tests/parsers/classification.test.ts
git commit -m "test: classify UnivIS page templates"
```

### Task 6: Parse course pages into structured entities

**Files:**
- Create: `src/parsers/course.ts`
- Create: `tests/fixtures/courses/`
- Test: `tests/parsers/course.test.ts`

**Step 1: Write the failing test**

Create fixture-based tests that assert extraction of:
- title
- semester
- course type
- description
- lecturers
- sessions
- source URL provenance

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/parsers/course.test.ts`
Expected: FAIL because the parser is missing.

**Step 3: Write minimal implementation**

Implement the course parser using table and labeled-field extraction with whitespace cleanup and structured session parsing.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/parsers/course.test.ts`
Expected: PASS

**Step 5: Commit**

Run:
```bash
git add src/parsers/course.ts tests/fixtures/courses tests/parsers/course.test.ts
git commit -m "feat: parse course detail pages"
```

### Task 7: Parse lecturer pages and shared entities

**Files:**
- Create: `src/parsers/lecturer.ts`
- Create: `tests/fixtures/lecturers/`
- Test: `tests/parsers/lecturer.test.ts`

**Step 1: Write the failing test**

Create tests that verify lecturer extraction for name, role, organization, contact fields when present, and source URL provenance.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/parsers/lecturer.test.ts`
Expected: FAIL because the lecturer parser does not exist.

**Step 3: Write minimal implementation**

Implement a parser for lecturer profile pages that extracts stable fields and tolerates missing data.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/parsers/lecturer.test.ts`
Expected: PASS

**Step 5: Commit**

Run:
```bash
git add src/parsers/lecturer.ts tests/fixtures/lecturers tests/parsers/lecturer.test.ts
git commit -m "feat: parse lecturer profile pages"
```

### Task 8: Normalize courses and compute language metadata

**Files:**
- Create: `src/normalize/index.ts`
- Create: `src/normalize/language.ts`
- Create: `data/normalized/.gitkeep`
- Test: `tests/normalize/language.test.ts`
- Test: `tests/normalize/catalog.test.ts`

**Step 1: Write the failing test**

Create tests that verify:
- stable course IDs and slugs
- deduplication across multiple listings
- language classification into `english`, `german`, `bilingual`, and `unknown`
- confidence and evidence capture

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/normalize/language.test.ts tests/normalize/catalog.test.ts`
Expected: FAIL because normalization and language logic do not exist.

**Step 3: Write minimal implementation**

Implement:
- stable ID generation
- deduplication and related-entity linking
- normalized searchable text
- language detection with explicit-field preference, heuristic evidence capture, and confidence scoring

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/normalize/language.test.ts tests/normalize/catalog.test.ts`
Expected: PASS

**Step 5: Commit**

Run:
```bash
git add src/normalize/index.ts src/normalize/language.ts data/normalized/.gitkeep tests/normalize/language.test.ts tests/normalize/catalog.test.ts
git commit -m "feat: normalize catalog and detect course language"
```

### Task 9: Generate build assets and static content

**Files:**
- Create: `src/generator/index.ts`
- Create: `scripts/parse.ts`
- Create: `scripts/normalize.ts`
- Create: `scripts/generate.ts`
- Create: `scripts/build-all.ts`
- Create: `data/build/.gitkeep`
- Test: `tests/generator/generate.test.ts`

**Step 1: Write the failing test**

Create tests that verify the generator writes:
- `data/build/catalog.json`
- `data/build/search-index.json`
- `data/build/manifest.json`
- course and semester route data needed by the site

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/generator/generate.test.ts`
Expected: FAIL because the generator and scripts are missing.

**Step 3: Write minimal implementation**

Implement the parse, normalize, generate, and build-all scripts so the pipeline can run end to end on local data and emit JSON assets for the site.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/generator/generate.test.ts`
Expected: PASS

**Step 5: Commit**

Run:
```bash
git add src/generator/index.ts scripts/parse.ts scripts/normalize.ts scripts/generate.ts scripts/build-all.ts data/build/.gitkeep tests/generator/generate.test.ts
git commit -m "feat: generate catalog build assets"
```

### Task 10: Scaffold the VitePress site shell

**Files:**
- Create: `site/.vitepress/config.ts`
- Create: `site/docs/index.md`
- Create: `site/docs/about/accessibility.md`
- Create: `site/docs/semesters/index.md`
- Create: `site/docs/courses/index.md`
- Create: `site/docs/lecturers/index.md`
- Create: `site/components/`
- Test: `tests/site/config.test.ts`

**Step 1: Write the failing test**

Create a test that verifies the VitePress config loads and the required top-level docs routes exist.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/site/config.test.ts`
Expected: FAIL because the site scaffold is missing.

**Step 3: Write minimal implementation**

Add the VitePress config, top-level docs pages, and placeholders for generated content sections and site components.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/site/config.test.ts`
Expected: PASS

**Step 5: Commit**

Run:
```bash
git add site/.vitepress/config.ts site/docs/index.md site/docs/about/accessibility.md site/docs/semesters/index.md site/docs/courses/index.md site/docs/lecturers/index.md tests/site/config.test.ts
git commit -m "feat: scaffold VitePress catalog shell"
```

### Task 11: Build browse and detail components with language filters

**Files:**
- Create: `site/components/CourseCard.vue`
- Create: `site/components/CourseTable.vue`
- Create: `site/components/CourseFilters.vue`
- Create: `site/components/CourseSearch.vue`
- Modify: `site/docs/courses/index.md`
- Test: `tests/site/language-filter.test.ts`

**Step 1: Write the failing test**

Create tests that verify the catalog UI:
- renders visible language badges
- supports language filtering without hiding all courses by default
- keeps filter state in the URL

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/site/language-filter.test.ts`
Expected: FAIL because the components and route integration do not exist.

**Step 3: Write minimal implementation**

Implement the site components and wire the catalog page to generated JSON so users can search and filter by language, faculty, type, lecturer, weekday, and semester.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/site/language-filter.test.ts`
Expected: PASS

**Step 5: Commit**

Run:
```bash
git add site/components/CourseCard.vue site/components/CourseTable.vue site/components/CourseFilters.vue site/components/CourseSearch.vue site/docs/courses/index.md tests/site/language-filter.test.ts
git commit -m "feat: add searchable course catalog with language filters"
```

### Task 12: Add accessibility checklist and completion verification

**Files:**
- Create: `docs/accessibility-checklist.md`
- Modify: `package.json`
- Modify: `README.md`
- Test: `tests/site/accessibility-docs.test.ts`

**Step 1: Write the failing test**

Create tests that verify:
- the accessibility doc exists
- npm scripts expose `crawl`, `parse`, `normalize`, `generate`, and `build`
- the README documents the one-command rebuild flow

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/site/accessibility-docs.test.ts`
Expected: FAIL because the docs and scripts are incomplete.

**Step 3: Write minimal implementation**

Add the accessibility checklist, final npm scripts, and README usage instructions for local rebuilds and site development.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/site/accessibility-docs.test.ts`
Expected: PASS

**Step 5: Commit**

Run:
```bash
git add docs/accessibility-checklist.md package.json README.md tests/site/accessibility-docs.test.ts
git commit -m "docs: add rebuild flow and accessibility checklist"
```
