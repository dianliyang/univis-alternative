<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useData } from "vitepress";
import lecturesBrowser from "../../data/build/lectures-browser.json";
import { getBrowserState, type BrowserLecture, type BrowserNode } from "./browser-tree.js";

interface LecturesBrowserDataNode {
  text: string;
  textDe?: string;
  path: string;
  lectures: BrowserLecture[];
  children: LecturesBrowserDataNode[];
}

interface LecturesBrowserData {
  roots: LecturesBrowserDataNode[];
}

const { lang } = useData();
const browser = ref<BrowserNode[]>(toBrowserNodes((lecturesBrowser as LecturesBrowserData).roots));
const selectedPath = ref<string>("");
const isGerman = computed(() => lang.value === "de");

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const requestedPath = params.get("path") ?? "";
  selectedPath.value = requestedPath;
  syncUrl(requestedPath);
});

const state = computed(() => getBrowserState(browser.value, selectedPath.value));

function labelFor(node: BrowserNode): string {
  return isGerman.value ? node.textDe ?? node.text : node.text;
}

function lectureLabelFor(lecture: BrowserLecture): string {
  return isGerman.value ? lecture.textDe ?? lecture.text : lecture.text;
}

function lectureHref(lecture: BrowserLecture): string {
  return lecture.route
    ? (isGerman.value ? `/de${lecture.route}` : lecture.route)
    : isGerman.value
      ? lecture.sourceUrlDe ?? lecture.sourceUrl
      : lecture.sourceUrl;
}

function hasLectures(node: BrowserNode): boolean {
  return node.lectures.length > 0;
}

function nodeJumpHref(path: string): string {
  const target = browser.value.flatMap(flattenNodes).find((node) => node.path === path);
  if (!target) {
    return "#";
  }

  const detailRoute = target.lectures[0]?.detailRoute ?? target.route;
  return isGerman.value ? `/de${detailRoute}` : detailRoute;
}

function select(path: string): void {
  selectedPath.value = path;
  syncUrl(path);
}

function syncUrl(path: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const baseRoute = window.location.pathname.startsWith("/de/") ? "/de/lectures/" : "/lectures/";
  const params = new URLSearchParams();
  if (path) {
    params.set("path", path);
  }
  const query = params.toString();
  window.history.replaceState({}, "", query ? `${baseRoute}?${query}` : baseRoute);
}

function toBrowserNodes(nodes: LecturesBrowserDataNode[]): BrowserNode[] {
  return nodes.map((node) => ({
    text: node.text,
    textDe: node.textDe,
    path: node.path,
    route: node.route,
    lectures: node.lectures ?? [],
    children: toBrowserNodes(node.children ?? [])
  }));
}

function flattenNodes(node: BrowserNode): BrowserNode[] {
  return [node, ...node.children.flatMap(flattenNodes)];
}
</script>

<template>
  <section class="browser-list">
    <ul class="browser-list__list">
      <li v-for="node in state.roots" :key="node.path" :class="{ 'browser-list__item--active': state.breadcrumb[0]?.path === node.path }">
        <div v-if="state.breadcrumb[0]?.path === node.path && state.breadcrumb.length > 1" class="browser-list__breadcrumb">
          <div class="browser-list__breadcrumb-track">
            <template v-for="(breadcrumbNode, index) in state.breadcrumb" :key="breadcrumbNode.path">
              <button
                type="button"
                class="browser-list__link"
                :class="{
                  'browser-list__link--active': index === state.breadcrumb.length - 1,
                  'browser-list__link--secondary': index < state.breadcrumb.length - 1
                }"
                :title="labelFor(breadcrumbNode)"
                @click="select(breadcrumbNode.path)"
              >
                <span class="browser-list__label">{{ labelFor(breadcrumbNode) }}</span>
              </button>
              <span v-if="index < state.breadcrumb.length - 1" class="browser-list__separator">&gt;</span>
            </template>
          </div>
          <div v-if="hasLectures(state.breadcrumb[state.breadcrumb.length - 1])" class="browser-list__tail">
            <span class="browser-list__count">{{ state.breadcrumb[state.breadcrumb.length - 1].lectures.length }}</span>
            <a
              class="browser-list__jump"
              :href="nodeJumpHref(state.breadcrumb[state.breadcrumb.length - 1].path)"
              :title="`Open ${state.breadcrumb[state.breadcrumb.length - 1].lectures.length} lectures`"
              @click.stop
            >
              ↗
            </a>
          </div>
        </div>
        <div v-else class="browser-list__row">
          <button type="button" class="browser-list__link" :title="labelFor(node)" @click="select(node.path)">
            <span class="browser-list__label">{{ labelFor(node) }}</span>
            <span v-if="node.children.length" class="browser-list__chevron" aria-hidden="true">›</span>
          </button>
          <div v-if="hasLectures(node)" class="browser-list__tail">
            <span class="browser-list__count">{{ node.lectures.length }}</span>
            <a class="browser-list__jump" :href="nodeJumpHref(node.path)" :title="`Open ${node.lectures.length} lectures`">↗</a>
          </div>
        </div>

        <template v-if="state.breadcrumb[0]?.path === node.path">
          <ul v-if="state.children.length" class="browser-list__nested">
            <li v-for="child in state.children" :key="child.path">
              <div class="browser-list__row">
                <button type="button" class="browser-list__link" :title="labelFor(child)" @click="select(child.path)">
                  <span class="browser-list__label">{{ labelFor(child) }}</span>
                  <span v-if="child.children.length" class="browser-list__chevron" aria-hidden="true">›</span>
                </button>
                <div v-if="hasLectures(child)" class="browser-list__tail">
                  <span class="browser-list__count">{{ child.lectures.length }}</span>
                  <a class="browser-list__jump" :href="nodeJumpHref(child.path)" :title="`Open ${child.lectures.length} lectures`">↗</a>
                </div>
              </div>
            </li>
          </ul>
          <ul v-if="state.lectures.length" class="browser-list__lectures">
            <li v-for="lecture in state.lectures" :key="lecture.key">
              <a class="browser-list__lecture-link" :href="lectureHref(lecture)">{{ lectureLabelFor(lecture) }}</a>
            </li>
          </ul>
        </template>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.browser-list {
  display: grid;
  gap: 1rem;
}

.browser-list__list,
.browser-list__nested,
.browser-list__lectures {
  margin: 0;
  list-style: none;
}

.browser-list__list {
  padding-left: 0;
}

.browser-list__nested {
  margin-top: 0.45rem;
  margin-left: 0.9rem;
  padding-left: 1rem;
  border-left: 1px solid var(--vp-c-divider);
}

.browser-list__lectures {
  margin-top: 0.6rem;
  padding-left: 1.95rem;
  display: grid;
  gap: 0.35rem;
}

.browser-list__list > li + li {
  margin-top: 0.85rem;
}

.browser-list__list > li {
  padding: 0.2rem 0 0.35rem 0.75rem;
  border-bottom: 1px solid color-mix(in srgb, var(--vp-c-divider) 70%, transparent);
}

.browser-list__nested > li + li {
  margin-top: 0.45rem;
}

.browser-list__link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  border: 0;
  background: transparent;
  font: inherit;
  text-align: left;
  padding: 0.05rem 0;
  color: inherit;
}

.browser-list__list > li > .browser-list__row > .browser-list__link {
  font-weight: 600;
  letter-spacing: -0.01em;
  font-size: 1rem;
}

.browser-list__breadcrumb {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.1rem 0 0.15rem;
}

.browser-list__breadcrumb-track {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.35rem;
  align-items: center;
  overflow-x: auto;
  white-space: nowrap;
  min-width: 0;
  flex: 1 1 auto;
}

.browser-list__breadcrumb .browser-list__link {
  display: inline-flex;
  width: auto;
  flex: 0 1 auto;
}

.browser-list__label {
  min-width: 0;
}

.browser-list__breadcrumb .browser-list__link--secondary {
  max-width: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.browser-list__breadcrumb .browser-list__link--secondary .browser-list__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.browser-list__chevron {
  flex: 0 0 auto;
  color: var(--vp-c-text-3);
  font-size: 0.95em;
}

.browser-list__separator {
  color: var(--vp-c-text-3);
  font-size: 0.9em;
}

.browser-list__nested .browser-list__link {
  color: var(--vp-c-text-2);
  line-height: 1.45;
  padding-left: 0.1rem;
}

.browser-list__row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.browser-list__tail {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  flex: 0 0 auto;
  position: relative;
  z-index: 1;
  color: var(--vp-c-text-3);
}

.browser-list__count {
  font-size: 0.85rem;
  min-width: 1.5rem;
  text-align: right;
}

.browser-list__jump {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  text-decoration: none;
  font-size: 0.95rem;
  pointer-events: auto;
}

.browser-list__jump:hover {
  color: var(--vp-c-brand-1);
}

.browser-list__lecture-link {
  color: var(--vp-c-text-2);
  line-height: 1.45;
}

.browser-list__lecture-link:hover {
  color: var(--vp-c-brand-1);
}

.browser-list__link--secondary {
  color: var(--vp-c-text-2);
  font-weight: 400;
  font-size: 0.94rem;
}

.browser-list__link:hover,
.browser-list__link--active,
.browser-list__jump:hover {
  color: var(--vp-c-brand-1);
}

.browser-list__link--active {
  font-weight: 700;
}
</style>
