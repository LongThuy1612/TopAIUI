<script setup lang="ts">
import { CONTACT_EMAIL } from '~/data/promote'

defineProps<{ title: string; items: { q: string; a: string }[] }>()
const open = ref<number | null>(null)
const { t } = useI18n()
</script>

<template>
  <section class="faq">
    <h2 class="faq__title">{{ title }}</h2>
    <div v-for="(item, i) in items" :key="i" class="faq__item">
      <button
        type="button"
        class="faq__q"
        :aria-expanded="open === i"
        @click="open = open === i ? null : i"
      >
        <span>{{ item.q }}</span>
        <span class="faq__icon" :class="{ 'faq__icon--open': open === i }">+</span>
      </button>
      <div v-show="open === i" class="faq__a">{{ item.a }}</div>
    </div>
    <i18n-t keypath="promote.faqMore" tag="p" class="faq__more">
      <template #link><a :href="`mailto:${CONTACT_EMAIL}`">{{ t('promote.contactUs') }}</a></template>
    </i18n-t>
  </section>
</template>

<style scoped>
.faq { max-width: 1030px; margin: 64px auto 48px; padding: 0 16px; }
.faq__title { text-align: center; font-size: 30px; font-weight: 700; margin: 0 0 32px; }
.faq__item { border-bottom: 1px solid var(--p-border); }
.faq__q {
  width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 16px;
  padding: 20px 0; background: none; border: 0; font: inherit; font-weight: 600; font-size: 16px;
  text-align: left; color: var(--p-text); cursor: pointer;
}
.faq__icon { font-size: 22px; font-weight: 300; transition: transform .2s; }
.faq__icon--open { transform: rotate(45deg); }
.faq__a { padding: 0 0 20px; color: var(--p-muted); line-height: 1.6; }
.faq__more { text-align: center; margin-top: 32px; color: var(--p-muted); }
.faq__more a { color: var(--p-primary); font-weight: 600; }
@media (max-width: 600px) { .faq__title { font-size: 22px; } }
</style>
