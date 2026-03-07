<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { loadPublishedJson } from "./data-source.js";

interface BrowserNode {
  label: string;
  path: string;
  sourceUrl: string;
  treeUrl: string;
  children: BrowserNode[];
}

interface FacultyItem extends BrowserNode {
  faculty: string;
  totalCount: number;
  englishCount: number;
  germanCount: number;
  bilingualCount: number;
  unknownCount: number;
  highConfidenceCount: number;
}

interface BrowserData {
  semester?: string;
  faculties: FacultyItem[];
}

const browser = ref<BrowserData>({ faculties: [] });
const selectedPath = ref<string>("");
const expanded = ref<string[]>([]);

onMounted(async () => {
  browser.value = await loadPublishedJson<BrowserData>("faculty-browser.json");
  const firstFaculty = browser.value.faculties[0];
  if (firstFaculty) {
    selectedPath.value = firstFaculty.path;
    expanded.value = [firstFaculty.path];
  }
});

const selectedEntry = computed(() => {
  for (const faculty of browser.value.faculties) {
    const match = findNode(faculty, selectedPath.value);
    if (match) {
      return {
        faculty,
        node: match
      };
    }
  }

  return null;
});

function findNode(node: BrowserNode, path: string): BrowserNode | null {
  if (node.path === path) {
    return node;
  }

  for (const child of node.children) {
    const match = findNode(child, path);
    if (match) {
      return match;
    }
  }

  return null;
}

function toggle(path: string): void {
  expanded.value = expanded.value.includes(path)
    ? expanded.value.filter((item) => item !== path)
    : [...expanded.value, path];
}

function isExpanded(path: string): boolean {
  return expanded.value.includes(path);
}

function select(path: string): void {
  selectedPath.value = path;
}

function filteredHref(faculty: string, language?: string): string {
  const params = new URLSearchParams({ faculty });
  if (language) {
    params.set("language", language);
  }
  return `/courses/catalog?${params.toString()}`;
}
</script>

<template>
  <section class="faculty-browser">
    <aside class="faculty-browser__sidebar">
      <div class="faculty-browser__sidebar-header">
        <p class="faculty-browser__eyebrow">Lecture Directory</p>
        <h2>Faculties</h2>
        <p v-if="browser.semester">Semester {{ browser.semester }}</p>
      </div>

      <ul class="faculty-browser__tree">
        <li v-for="faculty in browser.faculties" :key="faculty.path" class="faculty-browser__tree-item">
          <div class="faculty-browser__row">
            <button type="button" class="faculty-browser__expand" @click="toggle(faculty.path)">
              {{ isExpanded(faculty.path) ? "−" : "+" }}
            </button>
            <button
              type="button"
              class="faculty-browser__node"
              :class="{ 'is-active': selectedPath === faculty.path }"
              @click="select(faculty.path)"
            >
              {{ faculty.label }}
            </button>
          </div>

          <ul v-if="isExpanded(faculty.path)" class="faculty-browser__branch">
            <li v-for="department in faculty.children" :key="department.path">
              <div class="faculty-browser__row">
                <button
                  v-if="department.children.length"
                  type="button"
                  class="faculty-browser__expand"
                  @click="toggle(department.path)"
                >
                  {{ isExpanded(department.path) ? "−" : "+" }}
                </button>
                <span v-else class="faculty-browser__spacer" />
                <button
                  type="button"
                  class="faculty-browser__node faculty-browser__node--child"
                  :class="{ 'is-active': selectedPath === department.path }"
                  @click="select(department.path)"
                >
                  {{ department.label }}
                </button>
              </div>

              <ul v-if="department.children.length && isExpanded(department.path)" class="faculty-browser__leaf-list">
                <li v-for="program in department.children" :key="program.path">
                  <button
                    type="button"
                    class="faculty-browser__node faculty-browser__node--leaf"
                    :class="{ 'is-active': selectedPath === program.path }"
                    @click="select(program.path)"
                  >
                    {{ program.label }}
                  </button>
                </li>
              </ul>
            </li>
          </ul>
        </li>
      </ul>
    </aside>

    <main class="faculty-browser__panel">
      <template v-if="selectedEntry">
        <p class="faculty-browser__eyebrow">{{ selectedEntry.node.path || "lecture-directory" }}</p>
        <h1>{{ selectedEntry.node.label }}</h1>
        <p>{{ selectedEntry.node.children.length }} child node(s)</p>

        <div class="faculty-browser__actions">
          <a v-if="selectedEntry.node.sourceUrl" :href="selectedEntry.node.sourceUrl" target="_blank" rel="noreferrer">Open in UnivIS</a>
          <a v-if="selectedEntry.node.treeUrl" :href="selectedEntry.node.treeUrl" target="_blank" rel="noreferrer">Open tree view</a>
          <a :href="filteredHref(selectedEntry.faculty.faculty)">Open faculty catalog</a>
          <a :href="filteredHref(selectedEntry.faculty.faculty, 'english')">Open English courses</a>
        </div>

        <dl v-if="selectedEntry.node.path === selectedEntry.faculty.path" class="faculty-browser__stats">
          <div>
            <dt>Total</dt>
            <dd>{{ selectedEntry.faculty.totalCount }}</dd>
          </div>
          <div>
            <dt>English</dt>
            <dd>{{ selectedEntry.faculty.englishCount }}</dd>
          </div>
          <div>
            <dt>German</dt>
            <dd>{{ selectedEntry.faculty.germanCount }}</dd>
          </div>
          <div>
            <dt>Unknown</dt>
            <dd>{{ selectedEntry.faculty.unknownCount }}</dd>
          </div>
        </dl>

        <div v-if="selectedEntry.node.children.length" class="faculty-browser__children">
          <h2>Children</h2>
          <ul>
            <li v-for="child in selectedEntry.node.children" :key="child.path">
              <button type="button" class="faculty-browser__child-link" @click="select(child.path)">
                {{ child.label }}
              </button>
            </li>
          </ul>
        </div>
      </template>
    </main>
  </section>
</template>

<style scoped>
.faculty-browser {
  display: grid;
  grid-template-columns: minmax(260px, 340px) minmax(0, 1fr);
  gap: 1.5rem;
}

.faculty-browser__sidebar,
.faculty-browser__panel {
  border: 1px solid var(--vp-c-divider);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(252, 247, 238, 0.98), rgba(255, 255, 255, 0.98));
}

.faculty-browser__sidebar {
  padding: 1rem;
  position: sticky;
  top: 88px;
  align-self: start;
}

.faculty-browser__panel {
  padding: 1.5rem;
}

.faculty-browser__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
}

.faculty-browser__tree,
.faculty-browser__branch,
.faculty-browser__leaf-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.faculty-browser__tree {
  display: grid;
  gap: 0.75rem;
}

.faculty-browser__branch {
  margin: 0.45rem 0 0 1.1rem;
  display: grid;
  gap: 0.45rem;
}

.faculty-browser__leaf-list {
  margin: 0.3rem 0 0 1.6rem;
  display: grid;
  gap: 0.2rem;
}

.faculty-browser__row {
  display: flex;
  align-items: start;
  gap: 0.45rem;
}

.faculty-browser__expand,
.faculty-browser__spacer {
  width: 1.5rem;
  flex: 0 0 1.5rem;
}

.faculty-browser__expand {
  border: 0;
  background: transparent;
  font: inherit;
  color: var(--vp-c-text-2);
  padding: 0.1rem 0;
}

.faculty-browser__node,
.faculty-browser__child-link {
  border: 0;
  background: transparent;
  font: inherit;
  text-align: left;
  padding: 0.15rem 0;
}

.faculty-browser__node {
  font-weight: 600;
}

.faculty-browser__node--child {
  font-weight: 500;
}

.faculty-browser__node--leaf,
.faculty-browser__child-link {
  color: var(--vp-c-text-2);
}

.faculty-browser__node.is-active,
.faculty-browser__child-link:hover {
  color: var(--vp-c-brand-1);
}

.faculty-browser__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin: 1rem 0 1.25rem;
}

.faculty-browser__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.9rem;
  margin: 0 0 1.25rem;
}

.faculty-browser__stats div {
  padding: 0.8rem;
  border-radius: 16px;
  background: rgba(222, 167, 84, 0.12);
}

.faculty-browser__stats dt {
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
}

.faculty-browser__stats dd {
  margin: 0.2rem 0 0;
  font-size: 1.2rem;
  font-weight: 700;
}

@media (max-width: 960px) {
  .faculty-browser {
    grid-template-columns: 1fr;
  }

  .faculty-browser__sidebar {
    position: static;
  }

  .faculty-browser__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
