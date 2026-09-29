<script setup lang="ts">
import { stats, type ServiceKey } from '~/data/promote'
import type { FaqItem } from '~/composables/usePromoteText'

defineProps<{ active: ServiceKey; faqTitle?: string; faqs?: FaqItem[] }>()

const { t, tp, list } = usePromoteText()

// Stripe trả người dùng về trang với ?session_id=… (đã trả) hoặc ?canceled=1.
const route = useRoute()
const paid = computed(() => typeof route.query.session_id === 'string')
const canceled = computed(() => route.query.canceled === '1')
</script>

<template>
  <div class="promote">
    <div class="p-container">
      <header class="head">
        <h1 class="head__title">{{ tp('promote.title') }}</h1>
        <NuxtLink to="/orders" class="head__orders">{{ t('promote.myOrders') }} <span aria-hidden="true">›</span></NuxtLink>
      </header>
      <p class="intro">{{ tp('promote.intro') }}</p>

      <ul class="stats">
        <li v-for="s in stats" :key="s.key" class="stat">
          <span class="stat__icon" :style="{ background: s.color }"><PromoteStatIcon :name="s.icon" /></span>
          <span>
            <strong class="stat__value">{{ s.value }}</strong>
            <span class="stat__label">{{ t(`promote.stats.${s.key}`) }}</span>
          </span>
        </li>
      </ul>

      <ul class="highlights">
        <li v-for="h in list('promote.highlights')" :key="h"><span class="tick">✓</span>{{ h }}</li>
      </ul>

      <PromoteServiceTabs :active="active" />

      <i18n-t v-if="paid" keypath="promote.notice.paid" tag="p" class="notice notice--ok">
        <template #link><NuxtLink to="/orders">{{ t('promote.myOrders') }}</NuxtLink></template>
      </i18n-t>
      <p v-else-if="canceled" class="notice">{{ t('promote.notice.canceled') }}</p>

      <slot />
    </div>

    <PromoteFaqList v-if="faqs?.length" :title="faqTitle || t('promote.faqDefaultTitle')" :items="faqs" />
  </div>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.head__title { margin: 0; font-size: 34px; font-weight: 700; }
.head__orders {
  flex: none; border: 1px solid var(--p-border); border-radius: 6px; padding: 8px 12px;
  font-size: 13px; color: var(--p-text); text-decoration: none; background: #fff;
}
.head__orders:hover { border-color: var(--p-primary); color: var(--p-primary); }
.intro { margin: 14px 0 20px; font-size: 14px; line-height: 1.6; color: #333; }

.stats { list-style: none; padding: 0; margin: 0 0 20px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
.stat { display: flex; align-items: center; gap: 10px; }
.stat__icon { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; color: #fff; flex: none; }
.stat__value { display: block; font-size: 26px; line-height: 1.1; }
.stat__label { font-size: 13px; text-transform: uppercase; color: #333; }

.highlights {
  list-style: none; padding: 10px 0; margin: 0; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px 20px;
  font-size: 13px; background: #f4f4f6;
}
.tick { color: var(--p-primary); font-weight: 700; margin: 0 8px 0 6px; }

.notice { margin: 24px 0 0; padding: 12px 16px; border-radius: 6px; font-size: 14px; background: #f2f3f5; }
.notice a { color: var(--p-primary); font-weight: 600; }
.notice--ok { background: #ecfdf3; color: #067647; }

@media (max-width: 600px) {
  .head__title { font-size: 26px; }
  .stats { justify-content: flex-start; }
  .stat { width: calc(50% - 8px); }
  .stat__value { font-size: 20px; }
}
</style>

<!-- Style dùng chung cho mọi trang promote (không scoped, nhưng đều prefix .promote) -->
<style>
.promote {
  --p-primary: #7250e5;
  --p-primary-dark: #5d3dd1;
  --p-primary-soft: #ecebff;
  --p-text: #1a1a1a;
  --p-muted: #555;
  --p-border: #e5e7eb;
  --p-danger: #e5484d;
  color: var(--p-text);
  background: #fafafa;
  font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  padding: 24px 0 1px;
}
.promote *, .promote *::before, .promote *::after { box-sizing: border-box; }
.promote .p-container { max-width: 1160px; margin: 0 auto; padding: 0 16px; }

.promote .p-panel {
  background: #fff; border-radius: 10px; box-shadow: 0 2px 16px rgba(0, 0, 0, .06);
  padding: 32px clamp(16px, 8vw, 112px); margin-top: 24px;
}
.promote .p-panel--narrow { padding-left: clamp(16px, 22vw, 290px); padding-right: clamp(16px, 22vw, 290px); }
.promote .p-panel__title { margin: 0 0 24px; font-size: 22px; font-weight: 700; text-align: center; }

.promote .p-field { margin-bottom: 20px; }
.promote .p-label { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 8px; font-size: 14px; font-weight: 600; }
.promote .p-label .req { color: var(--p-danger); margin-right: 4px; }
.promote .p-label small { font-weight: 400; color: var(--p-muted); font-size: 13px; }
.promote .p-input {
  width: 100%; height: 40px; padding: 0 14px; border: 1px solid #d9d9de; border-radius: 4px;
  font: inherit; font-size: 14px; color: var(--p-text); background: #fff;
}
.promote .p-input:focus { outline: none; border-color: var(--p-primary); box-shadow: 0 0 0 3px var(--p-primary-soft); }
.promote .p-input--error { border-color: var(--p-danger); }
.promote .p-error { margin: 6px 0 0; font-size: 12px; color: var(--p-danger); }
.promote .p-hint { margin: 6px 0 0; font-size: 13px; color: var(--p-muted); }

.promote .p-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: 42px; padding: 0 28px; border: 0; border-radius: 4px;
  background: var(--p-primary); color: #fff; font: inherit; font-weight: 600; cursor: pointer; text-decoration: none;
}
.promote .p-btn:hover { background: var(--p-primary-dark); }
.promote .p-btn:disabled { opacity: .6; cursor: not-allowed; }
</style>
