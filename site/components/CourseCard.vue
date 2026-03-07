<script setup lang="ts">
import type { NormalizedCourse } from "../../src/types.js";

defineProps<{
  course: NormalizedCourse;
}>();
</script>

<template>
  <article class="course-card">
    <header class="course-card__header">
      <h3 class="course-card__title">
        <a :href="`/courses/${course.slug}`">{{ course.title }}</a>
      </h3>
      <span class="course-card__badge" :data-language="course.language">{{ course.language }}</span>
    </header>
    <p class="course-card__meta">{{ course.semester || "Unknown semester" }} · {{ course.type || "Course" }}</p>
    <p class="course-card__description">{{ course.description || "No description available." }}</p>
  </article>
</template>

<style scoped>
.course-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  padding: 1rem;
  background: linear-gradient(180deg, rgba(242, 242, 236, 0.9), rgba(255, 255, 255, 0.95));
}

.course-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.course-card__title {
  margin: 0;
  font-size: 1.05rem;
}

.course-card__badge {
  display: inline-flex;
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
  font-size: 0.8rem;
  text-transform: capitalize;
  background: #123524;
  color: #f7f3e9;
}

.course-card__description {
  margin-bottom: 0;
}
</style>
