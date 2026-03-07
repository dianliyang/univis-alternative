<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import CourseCard from "./CourseCard.vue";
import { filterCourses } from "./catalog.js";
import { loadPublishedJson } from "./data-source.js";
import type { NormalizedCourse } from "../../src/types.js";

const courses = ref<NormalizedCourse[]>([]);
const query = ref("");
const language = ref("all");
const semester = ref("all");
const type = ref("all");
const lecturer = ref("all");
const confidence = ref("all");
const faculty = ref("all");

const filteredCourses = computed(() =>
  filterCourses(courses.value, {
    query: query.value,
    language: language.value,
    semester: semester.value,
    type: type.value,
    lecturer: lecturer.value,
    confidence: confidence.value,
    faculty: faculty.value
  })
);

const semesters = computed(() => [...new Set(courses.value.map((course) => course.semester).filter(Boolean))]);
const courseTypes = computed(() => [...new Set(courses.value.map((course) => course.type).filter(Boolean))].sort());
const lecturers = computed(() =>
  [...new Set(courses.value.flatMap((course) => course.lecturers.map((item) => item.name)).filter(Boolean))].sort()
);
const faculties = computed(() => [...new Set(courses.value.map((course) => course.faculty).filter(Boolean))].sort());

onMounted(async () => {
  courses.value = await loadPublishedJson<NormalizedCourse[]>("catalog.json");

  const params = new URLSearchParams(window.location.search);
  query.value = params.get("q") ?? "";
  language.value = params.get("language") ?? "all";
  semester.value = params.get("semester") ?? "all";
  type.value = params.get("type") ?? "all";
  lecturer.value = params.get("lecturer") ?? "all";
  confidence.value = params.get("confidence") ?? "all";
  faculty.value = params.get("faculty") ?? "all";
});

function syncUrl(): void {
  const params = new URLSearchParams();
  if (query.value) params.set("q", query.value);
  if (language.value !== "all") params.set("language", language.value);
  if (semester.value !== "all") params.set("semester", semester.value);
  if (type.value !== "all") params.set("type", type.value);
  if (lecturer.value !== "all") params.set("lecturer", lecturer.value);
  if (confidence.value !== "all") params.set("confidence", confidence.value);
  if (faculty.value !== "all") params.set("faculty", faculty.value);
  const queryString = params.toString();
  window.history.replaceState({}, "", queryString ? `?${queryString}` : window.location.pathname);
}

function setFaculty(nextFaculty: string): void {
  faculty.value = nextFaculty;
  syncUrl();
}
</script>

<template>
  <section class="catalog-shell">
    <aside class="faculty-panel">
      <div class="faculty-panel__header">
        <h2>Browse by faculty</h2>
        <button v-if="faculty !== 'all'" type="button" class="faculty-panel__clear" @click="setFaculty('all')">Clear</button>
      </div>
      <nav class="faculty-panel__list" aria-label="Faculty browse">
        <button
          type="button"
          class="faculty-chip"
          :data-active="faculty === 'all'"
          @click="setFaculty('all')"
        >
          All faculties
        </button>
        <button
          v-for="item in faculties"
          :key="item"
          type="button"
          class="faculty-chip"
          :data-active="faculty === item"
          @click="setFaculty(item)"
        >
          {{ item }}
        </button>
      </nav>
    </aside>

    <div class="catalog-toolbar">
      <label>
        Search
        <input v-model="query" type="search" placeholder="Course title, lecturer, keyword" @input="syncUrl" />
      </label>
      <label>
        Language
        <select v-model="language" @change="syncUrl">
          <option value="all">All</option>
          <option value="english">English</option>
          <option value="german">German</option>
          <option value="bilingual">Bilingual</option>
          <option value="unknown">Unknown</option>
        </select>
      </label>
      <label>
        Semester
        <select v-model="semester" @change="syncUrl">
          <option value="all">All</option>
          <option v-for="item in semesters" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
      <label>
        Type
        <select v-model="type" @change="syncUrl">
          <option value="all">All</option>
          <option v-for="item in courseTypes" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
      <label>
        Lecturer
        <select v-model="lecturer" @change="syncUrl">
          <option value="all">All</option>
          <option v-for="item in lecturers" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
      <label>
        Language confidence
        <select v-model="confidence" @change="syncUrl">
          <option value="all">All</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </label>
    </div>

    <p class="catalog-summary">{{ filteredCourses.length }} course(s)</p>

    <div class="catalog-grid">
      <CourseCard v-for="course in filteredCourses" :key="course.id" :course="course" />
    </div>
  </section>
</template>

<style scoped>
.catalog-shell {
  display: grid;
  gap: 1rem;
}

.faculty-panel {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  background:
    linear-gradient(135deg, rgba(18, 53, 36, 0.05), rgba(246, 240, 228, 0.9)),
    radial-gradient(circle at right top, rgba(219, 188, 115, 0.25), transparent 30%);
}

.faculty-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.faculty-panel__header h2 {
  margin: 0;
  font-size: 1rem;
}

.faculty-panel__clear {
  border: 0;
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  background: #123524;
  color: #fff9ee;
}

.faculty-panel__list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.faculty-chip {
  border: 1px solid #8c8c7f;
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  background: #fffdf8;
}

.faculty-chip[data-active="true"] {
  background: #123524;
  color: #fff9ee;
  border-color: #123524;
}

.catalog-toolbar {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  padding: 1rem;
  border-radius: 20px;
  background:
    radial-gradient(circle at top left, rgba(209, 223, 182, 0.6), transparent 30%),
    linear-gradient(135deg, #f6f0e4, #fdfcf8);
}

.catalog-toolbar label {
  display: grid;
  gap: 0.35rem;
  font-weight: 600;
}

.catalog-toolbar input,
.catalog-toolbar select {
  border: 1px solid #8c8c7f;
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  background: white;
}

.catalog-grid {
  display: grid;
  gap: 1rem;
}
</style>
