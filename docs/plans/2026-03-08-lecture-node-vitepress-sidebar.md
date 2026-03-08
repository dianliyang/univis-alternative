# Lecture Node VitePress Sidebar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the custom lecture node split-view with native VitePress sidebar plus content pages for each lecture-tree node.

**Architecture:** Generate each lecture-tree node as a directory route with an `index.md` overview and one generated child page per lecture. Build a VitePress sidebar config from `data/build/lectures-browser.json` so every node route gets its lecture list in the native sidebar. Reuse existing course data when available for the lecture child page content, and fall back to lightweight membership pages when the lecture is outside the local catalog.

**Tech Stack:** VitePress, TypeScript, Vitest, generated Markdown routes

---

### Task 1: Add failing tests for native lecture sidebars

**Files:**
- Modify: `tests/site/config.test.ts`

**Step 1: Write the failing test**

Assert that VitePress config defines lecture sidebars for generated lecture node routes and that the sidebar contains lecture child links.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/site/config.test.ts`

Expected: FAIL because the config currently has no lecture sidebar definitions.

**Step 3: Write minimal implementation**

Update `site/.vitepress/config.ts` to load the built lecture browser JSON and generate sidebar sections for lecture node prefixes.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/site/config.test.ts`

Expected: PASS

### Task 2: Add failing tests for generated node index routes and lecture child routes

**Files:**
- Modify: `tests/generator/browser-artifacts.test.ts`

**Step 1: Write the failing test**

Assert that lecture node routes are generated as directories with `index.md`, and that lecture child Markdown pages exist under that node directory.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/generator/browser-artifacts.test.ts`

Expected: FAIL because lecture routes are currently flat `.md` files.

**Step 3: Write minimal implementation**

Update `src/generator/index.ts` to write lecture node routes as directory `index.md` files and generate one child Markdown file per lecture.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/generator/browser-artifacts.test.ts`

Expected: PASS

### Task 3: Generate lecture child page content from local lecture data

**Files:**
- Modify: `src/generator/index.ts`
- Test: `tests/generator/browser-artifacts.test.ts`

**Step 1: Write the failing test**

Assert that generated lecture child pages include breadcrumb/navigation context plus lecture details sourced from the matching course or membership fallback.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/generator/browser-artifacts.test.ts`

Expected: FAIL because lecture child pages do not exist yet.

**Step 3: Write minimal implementation**

Generate lecture child pages using the best available local content:
- full local course details when the lecture ID exists in `courses`
- fallback membership summary when only membership data exists

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/generator/browser-artifacts.test.ts`

Expected: PASS

### Task 4: Remove dependence on the custom lecture node split component

**Files:**
- Modify: `site/components/LecturesBrowser.vue`
- Modify: `site/.vitepress/theme/index.ts`
- Modify: `tests/site/lectures-browser-component.test.ts`
- Modify: `tests/site/lectures-node-page-component.test.ts`

**Step 1: Write the failing test**

Assert that lecture browser jump actions target generated lecture child pages and that the theme no longer needs `LecturesNodePage`.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/site/lectures-browser-component.test.ts tests/site/lectures-node-page-component.test.ts`

Expected: FAIL because the current UI still points to the custom lecture node shell.

**Step 3: Write minimal implementation**

Point jump actions to the first generated lecture child route for each node and remove the unused component registration.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/site/lectures-browser-component.test.ts tests/site/lectures-node-page-component.test.ts`

Expected: PASS

### Task 5: Regenerate and verify the full flow

**Files:**
- Generated: `site/docs/lectures/**`
- Generated: `site/docs/de/lectures/**`

**Step 1: Run focused verification**

Run:
- `npm test -- tests/site/config.test.ts tests/site/lectures-browser-component.test.ts tests/generator/browser-artifacts.test.ts tests/generator/generate.test.ts`

Expected: PASS

**Step 2: Regenerate site artifacts**

Run: `npm run generate`

Expected: `Generated ... course records.`

**Step 3: Commit**

```bash
git add docs/plans/2026-03-08-lecture-node-vitepress-sidebar.md site/.vitepress/config.ts site/.vitepress/theme/index.ts site/components/LecturesBrowser.vue src/generator/index.ts tests/site/config.test.ts tests/site/lectures-browser-component.test.ts tests/site/lectures-node-page-component.test.ts tests/generator/browser-artifacts.test.ts
git commit -m "feat: use native lecture sidebars for node pages"
```
