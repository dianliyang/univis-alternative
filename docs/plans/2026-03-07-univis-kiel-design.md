# UnivIS Kiel Static Catalog Design

**Date:** 2026-03-07

## Goal

Build a read-only static browser for `https://univis.uni-kiel.de` that makes course discovery easier than raw UnivIS, with special emphasis on identifying English-taught courses and filtering out German-only courses.

## Constraints

- Respect `robots.txt`.
- Never fetch `/prg`.
- Treat `/form` as the public crawl surface.
- Keep the crawl polite, cached, and resumable.
- Preserve source provenance and mark uncertainty instead of guessing.

## Source Observations

As of 2026-03-07:

- `https://univis.uni-kiel.de/robots.txt` disallows `/prg`.
- The public entry page is form-driven and exposes teaching entrypoints under `/form`.
- Relevant public teaching navigation includes:
  - `dsc=anew/tlecture`
  - `dsc=anew/lecture`

## Product Scope

### Included in v1

- Discovery of public teaching pages under `/form`
- Raw HTML snapshot storage
- Page classification and structured extraction
- Normalized course catalog JSON
- VitePress-generated static site
- Browse pages by semester and organization
- Searchable catalog page
- Language badges and filters
- Source links and freshness metadata

### Excluded from v1

- Any authenticated or write workflow
- Live sync inside the UI
- Registration or timetable editing
- Any crawl path under `/prg`

## Architecture

The pipeline is offline-first:

1. A curated crawler fetches allowed UnivIS pages and stores raw HTML plus crawl metadata.
2. Parsers classify each snapshot and extract structured data with provenance.
3. Normalization deduplicates entities and computes stable IDs, slugs, searchable text, and derived language fields.
4. A generator writes JSON assets and VitePress content for a static site.
5. The VitePress app renders browse and detail pages with client-side filtering over precomputed data.

## Data Model

### Core entities

- `Semester`
- `Faculty`
- `Institute`
- `Course`
- `Session`
- `Lecturer`
- `Room`

### Course fields

- `id`
- `slug`
- `title`
- `subtitle`
- `semester`
- `faculty`
- `institute`
- `description`
- `type`
- `language`
- `languageConfidence`
- `languageEvidence`
- `lecturers`
- `sessions`
- `searchText`
- `sourceUrl`
- `lastSeen`

## Language Strategy

This is the main UX requirement, so the language system must be explicit and inspectable.

### Output values

- `english`
- `german`
- `bilingual`
- `unknown`

### Detection order

1. Use explicit language fields from UnivIS when present.
2. Inspect structured course metadata and labels.
3. Inspect title, description, and notes for stable language indicators.
4. If evidence conflicts, mark `bilingual`.
5. If evidence is weak or missing, mark `unknown`.

### Evidence handling

For each course we store:

- `language`
- `languageConfidence` as `high`, `medium`, or `low`
- `languageEvidence` as a short list of matched fields or phrases

That prevents silent misclassification and makes later parser refinement testable.

## UX Design

### Catalog behavior

- Default view shows all courses.
- Every course card and detail page shows a visible language badge.
- The catalog page exposes top-level filters for language, faculty, type, lecturer, weekday, and semester.
- Filter state is encoded in the URL so filtered views are shareable.

### Primary user flows

- Find English-taught courses quickly by toggling `English` and `Bilingual`.
- Hide German-only courses with one filter action.
- Browse by semester or institute, then refine by language and type.
- Open any course detail and click through to the original UnivIS source.

### Accessibility

- Static HTML first
- Semantic headings and tables
- Keyboard-usable filters
- Visible focus states
- No language information conveyed by color alone
- Mobile-first catalog layout

## Technical Choices

- TypeScript for crawler, parser, normalization, and generator
- VitePress for the static site
- Vitest for parser and normalization tests
- Cheerio for HTML parsing
- JSON files for generated build assets

## Repo Layout

```text
data/
  discovery/
  raw/
  normalized/
  build/
  logs/
docs/
  source-map.md
  accessibility-checklist.md
  plans/
scripts/
src/
  crawl/
  parsers/
  normalize/
  generator/
  utils/
tests/
  fixtures/
  parsers/
  normalize/
site/
  docs/
  .vitepress/
  components/
```

## Testing Strategy

- Test-first parser development with saved HTML fixtures
- Classification tests for known page types
- Normalization tests for ID stability and deduplication
- Language detection tests covering English, German, bilingual, and unknown cases
- Generator tests for route and asset outputs

## Risks and Mitigations

- UnivIS markup is old and inconsistent.
  - Mitigation: fixture-based parsing and conservative extraction rules.
- Language signals may be incomplete.
  - Mitigation: confidence levels, evidence capture, and `unknown` as a valid state.
- Crawl scope can drift.
  - Mitigation: curated seed URLs, URL canonicalization, and hard `/prg` blocking.

## Success Criteria

v1 succeeds when:

- allowed public teaching pages are crawled from `https://univis.uni-kiel.de`
- courses are extracted into stable normalized JSON
- the static site is generated from that data
- users can browse by semester and institute
- users can filter by language and reliably find English-taught courses
- every course page links back to UnivIS and shows freshness metadata
