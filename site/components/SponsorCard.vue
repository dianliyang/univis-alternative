<script setup lang="ts">
defineProps<{
  title: string;
  lead: string;
  cta: string;
}>();

const sponsorUrl = "https://github.com/sponsors/dianliyang";
const profileUrl = "https://github.com/dianliyang";
const avatarUrl = "https://github.com/dianliyang.png";
</script>

<template>
  <div class="sponsor-card">
    <div class="sponsor-card__panel">
      <img class="sponsor-card__avatar" :src="avatarUrl" alt="dianliyang GitHub avatar" width="56" height="56" />
      <div class="sponsor-card__body">
        <p class="sponsor-card__eyebrow">GitHub Sponsors</p>
        <h3 class="sponsor-card__title">{{ title }}</h3>
        <p class="sponsor-card__meta">
          <a :href="profileUrl" target="_blank" rel="noreferrer">@dianliyang</a>
        </p>
        <p class="sponsor-card__cta">
          <span class="sponsor-card__lead">{{ lead }}</span
          ><span class="sponsor-card__cta-sep">&nbsp;</span>
          <a :href="sponsorUrl" target="_blank" rel="noreferrer">{{ cta }}</a>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sponsor-card {
  margin: 1rem 0 0;
}

.sponsor-card__panel {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 0.9rem 1rem;
  background: var(--vp-c-bg-soft);
}

.sponsor-card__avatar {
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--vp-c-bg);
}

.sponsor-card__body {
  min-width: 0;
}

.sponsor-card__eyebrow {
  margin: 0 0 0.15rem;
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
  line-height: 1.4;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sponsor-card__title {
  margin: 0;
  font-size: 1rem;
  line-height: 1.4;
}

.sponsor-card__meta {
  margin: 0.2rem 0 0;
  color: var(--vp-c-text-2);
}

.sponsor-card__meta a {
  color: inherit;
  text-decoration: none;
}

.sponsor-card__cta {
  margin: 0.45rem 0 0;
  color: var(--vp-c-text-2);
  line-height: 1.55;
}

.sponsor-card__lead {
  color: inherit;
}

.sponsor-card__cta a {
  font-weight: 600;
}
</style>
