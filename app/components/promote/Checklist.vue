<script setup lang="ts">
import type { CheckItem } from '~/composables/usePromoteText'
defineProps<{ items: CheckItem[] }>()
</script>

<template>
  <ul class="checklist">
    <li v-for="(it, i) in items" :key="i">
      <span class="dot" aria-hidden="true">✓</span>
      <div>
        <strong>{{ it.title }}</strong>
        <p v-if="it.desc">{{ it.desc }}</p>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.checklist { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
li { display: flex; gap: 10px; align-items: flex-start; }
.dot {
  flex: none; width: 18px; height: 18px; margin-top: 2px; border-radius: 50%;
  display: grid; place-items: center; background: var(--p-primary); color: #fff; font-size: 11px;
}
strong { font-size: 15px; }
p { margin: 4px 0 0; color: #444; font-size: 14px; line-height: 1.55; }
</style>
