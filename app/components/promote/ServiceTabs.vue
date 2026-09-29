<script setup lang="ts">
import { services, type ServiceKey } from '~/data/promote'

defineProps<{ active: ServiceKey }>()
const { t, tp } = usePromoteText()
</script>

<template>
  <section class="services">
    <div class="services__bar">{{ t('promote.chooseService') }}</div>
    <div class="services__grid">
      <NuxtLink
        v-for="s in services"
        :key="s.key"
        :to="s.to"
        class="card"
        :class="{ 'card--active': s.key === active }"
      >
        <h3 class="card__title">
          {{ t(`promote.services.${s.i18n}.title`) }}<span v-if="s.hot" class="card__hot" :title="t('promote.popular')">🔥</span>
        </h3>
        <p class="card__desc">{{ tp(`promote.services.${s.i18n}.desc`) }}</p>
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.services__bar {
  background: #1a1a1a;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  padding: 12px 16px;
}
.services__grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--p-border);
  border-top: 0;
}
.card {
  display: block;
  border: 1px solid var(--p-border);
  border-radius: 8px;
  padding: 16px;
  color: var(--p-text);
  text-decoration: none;
  background: #fff;
  transition: border-color .15s, box-shadow .15s;
}
.card:hover { border-color: var(--p-primary); box-shadow: 0 4px 14px rgba(114, 80, 229, .12); }
.card--active { background: var(--p-primary); border-color: var(--p-primary); color: #fff; }
.card--wide { grid-column: 1 / -1; }
.card__title { margin: 0 0 8px; font-size: 17px; font-weight: 700; line-height: 1.25; }
.card__hot { margin-left: 4px; font-size: 14px; }
.card__desc { margin: 0; font-size: 13px; line-height: 1.5; color: var(--p-muted); }
.card--active .card__desc { color: rgba(255, 255, 255, .88); }

@media (max-width: 960px) { .services__grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 600px) { .services__grid { grid-template-columns: repeat(2, 1fr); } }
</style>
