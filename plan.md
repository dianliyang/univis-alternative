Here’s a practical **agent plan** for building a better, static UnivIS browser with **VitePress** without starting from scratch.

## Goal

Build a **read-only, accessible, searchable static course catalog** from UnivIS data.

The agent should:

* crawl only **allowed** pages
* extract course and schedule data
* normalize it into a clean schema
* generate a VitePress site
* produce a repeatable update pipeline

## Non-goals

Do not build:

* account features
* live timetable sync
* course registration
* write access to UnivIS
* anything that depends on `/prg`

---

## High-level architecture

```text
UnivIS allowed pages
   -> crawler
   -> raw HTML snapshots
   -> parser
   -> normalized JSON
   -> markdown/page generator
   -> VitePress site
   -> static hosting
```

---

## Agent responsibilities

The agent should work in phases.

### Phase 1: Discovery and scope

Purpose: understand which UnivIS pages are safe and useful.

Tasks:

1. Read and respect `robots.txt`.
2. Confirm that `/prg` is excluded.
3. Identify crawl entrypoints in allowed paths, likely under `/form`.
4. Build a map of:

   * semester pages
   * faculty/institute pages
   * lecture/course detail pages
   * staff/lecturer pages
5. Save a sample set of URLs for each page type.

Deliverables:

* `docs/source-map.md`
* `data/discovery/seed-urls.json`
* `data/discovery/page-types.json`

Success criteria:

* the agent can name the main page templates and how they link to each other

---

### Phase 2: Crawl strategy

Purpose: create a safe and repeatable collector.

Tasks:

1. Start from a curated seed list instead of blind full-site crawling.
2. Use low request rates.
3. Deduplicate by canonicalized URL.
4. Store raw responses locally.
5. Record crawl metadata:

   * timestamp
   * URL
   * status code
   * content hash
   * discovered links
6. Skip blocked paths and obvious irrelevant pages.

Rules:

* never fetch `/prg`
* add backoff and retry limits
* stop on repeated failures
* keep crawl resumable

Deliverables:

* `scripts/crawl.ts`
* `data/raw/...`
* `data/logs/crawl-log.jsonl`

Success criteria:

* rerunning the crawl only fetches changed or missing pages

---

### Phase 3: Template classification

Purpose: turn messy UnivIS pages into known content types.

Tasks:

1. Classify raw pages into types:

   * semester index
   * faculty/institute listing
   * course detail
   * lecturer profile
   * schedule listing
2. Create parser rules per page type.
3. Maintain fixtures for each template.
4. Detect parser breakage early.

Deliverables:

* `src/parsers/classify.ts`
* `tests/fixtures/...`
* `tests/classification.test.ts`

Success criteria:

* most pages are classified automatically with high confidence

---

### Phase 4: Structured extraction

Purpose: extract stable data fields.

Core entities:

* `Semester`
* `Faculty`
* `Institute`
* `Course`
* `Session`
* `Lecturer`
* `Room`

Suggested `Course` schema:

```json
{
  "id": "stable-course-id",
  "title": "Intro to ...",
  "subtitle": "",
  "semester": "SoSe 2026",
  "faculty": "",
  "institute": "",
  "description": "",
  "language": "",
  "ects": null,
  "type": "Lecture",
  "lecturers": ["..."],
  "sessions": [
    {
      "day": "Monday",
      "start": "10:15",
      "end": "11:45",
      "room": "AB-123",
      "frequency": "weekly",
      "notes": ""
    }
  ],
  "sourceUrl": "...",
  "lastSeen": "2026-03-07T00:00:00Z"
}
```

Tasks:

1. Extract text content cleanly.
2. Parse repeated structures like sessions and lecturers.
3. Normalize whitespace and labels.
4. Preserve provenance:

   * source URL
   * extraction timestamp
   * original raw snippet if needed
5. Mark uncertain fields explicitly instead of guessing.

Deliverables:

* `src/parsers/course.ts`
* `src/parsers/lecturer.ts`
* `data/normalized/courses.json`
* `data/normalized/lecturers.json`

Success criteria:

* a course page consistently yields the same schema across reruns

---

### Phase 5: Data normalization and IDs

Purpose: make the dataset stable enough for static generation.

Tasks:

1. Generate stable IDs from source URL or normalized content.
2. Deduplicate courses that appear in multiple listings.
3. Normalize:

   * faculty names
   * lecturer names
   * room strings
   * semester labels
4. Link related objects:

   * course -> lecturers
   * course -> institute
   * course -> semester
5. Generate filter-friendly fields:

   * slug
   * searchable text
   * weekday index
   * language tags

Deliverables:

* `src/normalize/index.ts`
* `data/build/catalog.json`

Success criteria:

* one canonical record per real course

---

### Phase 6: Content design for VitePress

Purpose: turn data into pages people can actually browse.

Planned page types:

* homepage
* semester overview
* faculty/institute overview
* course detail page
* lecturer page
* searchable catalog page
* accessibility/help page
* data freshness page

Tasks:

1. Define URL patterns:

   * `/semesters/sose-2026/`
   * `/faculties/computer-science/`
   * `/courses/intro-to-xyz/`
   * `/lecturers/dr-max-mustermann/`
2. Create page templates as markdown plus Vue components.
3. Generate navigation and sidebar data.
4. Add breadcrumbs and related-links sections.

Deliverables:

* `site/docs/...`
* `site/.vitepress/config.ts`
* `site/components/CourseCard.vue`
* `site/components/CourseTable.vue`

Success criteria:

* a user can reach any course in a few clicks

---

### Phase 7: Search and browse UX

Purpose: make it much easier than UnivIS.

Minimum UX features:

* semester landing page
* course cards/table
* full-text search
* filters for:

  * faculty
  * course type
  * lecturer
  * weekday
  * language
* mobile-friendly layout
* clear typography
* deep links to source page

Agent tasks:

1. Build a precomputed search index.
2. Add client-side filter controls using the generated JSON.
3. Keep JS light; default to static HTML first.
4. Make every page useful without JavaScript.

Deliverables:

* `data/build/search-index.json`
* `site/components/CourseFilters.vue`
* `site/components/CourseSearch.vue`

Success criteria:

* browsing and search are faster and clearer than raw UnivIS

---

### Phase 8: Accessibility requirements

Purpose: fix one of the main original problems.

The agent must enforce:

* semantic headings
* keyboard navigability
* visible focus states
* sufficient contrast
* descriptive link text
* proper table markup
* mobile responsiveness
* no information conveyed by color alone

Tasks:

1. Use accessible HTML by default.
2. Test keyboard-only navigation.
3. Run automated accessibility checks.
4. Add a page explaining limitations and source data issues.

Deliverables:

* `docs/accessibility-checklist.md`
* CI accessibility audit step
* `site/docs/about/accessibility.md`

Success criteria:

* pages are navigable without a mouse and readable on mobile

---

### Phase 9: Freshness and update pipeline

Purpose: keep the catalog current with minimal effort.

Tasks:

1. Split the pipeline into commands:

   * `crawl`
   * `parse`
   * `normalize`
   * `generate`
   * `build`
2. Support incremental refresh.
3. Flag deleted or changed courses.
4. Stamp each generated page with:

   * last build date
   * source page link
   * data freshness note

Deliverables:

* `package.json` scripts
* `scripts/build-all.ts`
* `data/build/manifest.json`

Success criteria:

* one command rebuilds the site from fresh crawl data

---

### Phase 10: Deployment

Purpose: publish cheaply and safely.

Suggested targets:

* GitHub Pages
* Cloudflare Pages
* Netlify

Tasks:

1. Build static output.
2. Add CI for scheduled rebuilds.
3. Publish preview builds for parser changes.
4. Keep raw crawl data private if needed; publish only normalized/generated output.

Deliverables:

* CI workflow
* deployment config
* build artifact

Success criteria:

* the site can be rebuilt and deployed automatically

---

## Recommended repo structure

```text
univis-browser/
  data/
    discovery/
    raw/
    normalized/
    build/
    logs/
  docs/
    source-map.md
    accessibility-checklist.md
  scripts/
    crawl.ts
    parse.ts
    normalize.ts
    generate.ts
    build-all.ts
  src/
    crawl/
    parsers/
    normalize/
    generator/
    utils/
  tests/
    fixtures/
    parsers/
  site/
    docs/
    .vitepress/
    components/
  package.json
  README.md
```

---

## Agent operating rules

The agent must:

* respect `robots.txt`
* never touch `/prg`
* use caching
* keep requests slow and polite
* avoid guessing missing values
* log all extraction failures
* preserve source provenance
* prefer static generation over live scraping in the UI

The agent should not:

* scrape everything indiscriminately
* depend on fragile CSS selectors without tests
* ship pages without source links
* hide uncertainty in the extracted data

---

## Implementation order

Best order for the agent:

1. discovery
2. small crawler
3. classifier
4. course parser
5. normalization
6. page generation
7. VitePress shell
8. search/filter UI
9. accessibility pass
10. CI and deployment

---

## Definition of done for v1

v1 is done when:

* the agent can crawl allowed UnivIS pages
* courses are extracted into stable JSON
* a VitePress site is generated from that data
* users can browse by semester and institute
* users can search courses locally
* pages are mobile-friendly and keyboard-usable
* each page links back to the original source
* rebuilding is one command or one CI job

---

## Nice-to-have later

After v1, the agent can add:

* weekly timetable view
* diff pages showing what changed since last crawl
* lecturer-centric browse pages
* room pages
* export to ICS or CSV
* multilingual labels
* “favorites” stored locally in browser storage

---

## Compact agent prompt

You can give an implementation agent this:

```text
Build a static, accessible UnivIS course browser using VitePress.

Constraints:
- Respect robots.txt.
- Never crawl or use /prg.
- Use only allowed public pages, likely under /form.
- Crawl politely with caching, deduplication, and logs.
- Extract structured course, lecturer, institute, semester, and session data.
- Normalize the data into stable JSON with canonical IDs and source provenance.
- Generate a VitePress site from the normalized data.
- Provide pages for semesters, institutes, courses, and lecturers.
- Add local search and client-side filters over generated JSON.
- Ensure keyboard accessibility, semantic HTML, mobile responsiveness, and clear navigation.
- Make the pipeline repeatable with commands for crawl, parse, normalize, generate, and build.
- Add tests using saved HTML fixtures so parser changes are detectable.
- Prefer static output and progressive enhancement over heavy client-side logic.

Output:
- runnable repo structure
- scripts for crawl/build pipeline
- VitePress site with generated pages
- documentation for architecture, accessibility, and update workflow
```

If you want, I can turn this into a **task checklist**, a **README spec**, or a **system prompt for a coding agent**.

