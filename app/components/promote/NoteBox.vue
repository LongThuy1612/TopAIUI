<script setup lang="ts">
defineProps<{ items: { text: string; strong?: boolean }[]; title?: string }>()
const { t } = useI18n()
</script>

<template>
  <div class="notes">
    <h4>{{ title || t('promote.needToKnow') }}</h4>
    <ol>
      <li v-for="(n, i) in items" :key="i" :class="{ strong: n.strong }">{{ n.text }}</li>
    </ol>
  </div>
</template>

<style scoped>
.notes { background: #f2f3f5; padding: 16px 20px; text-align: left; font-size: 14px; line-height: 1.6; margin-top: 20px; }
h4 { margin: 0 0 8px; font-size: 16px; }
ol { margin: 0; padding-left: 20px; }
li { margin-bottom: 8px; }
.strong { font-weight: 700; }
</style>
