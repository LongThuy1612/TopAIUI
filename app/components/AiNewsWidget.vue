<script setup lang="ts">
const { t } = useI18n()

const news: string[] = [
  'Regulators publish a sandbox framework for generative AI services',
  'New open model tops reading-comprehension benchmarks',
  'Inference API prices drop sharply after infrastructure update',
  'Marketplaces open sales-assistant APIs to merchants',
  'New research on bias detection in large language models',
  'A new benchmark suite for autonomous coding agents',
  'Dubbing tools add regional accent support',
  'Small businesses raise AI tool spending this quarter',
  'Why video generation is still expensive: a survey of efficiency work',
  '3D-native urban world model ships an early preview'
]
</script>

<template>
  <div class="rounded-[18px] border border-ink-200 p-5">
    <div class="border-b border-ink-100 pb-3.5 text-base font-semibold text-ink-900">{{ t('sidebar.aiNews') }}</div>
    <div class="flex flex-col gap-3.5 pt-3.5">
      <a
        v-for="(item, i) in news"
        :key="item"
        href="#"
        class="grid grid-cols-[18px_minmax(0,1fr)] gap-2.5 text-base leading-[1.5] text-ink-900 hover:text-brand-500"
      >
        <span :class="['font-semibold', i < 3 ? 'text-brand-500' : 'text-ink-400']">{{ i + 1 }}</span>
        <span>{{ item }}</span>
      </a>
    </div>
    <div class="mt-4 border-t border-ink-100 pt-4 text-center">
      <a href="#" class="text-base font-bold text-brand-500 hover:text-brand-600">{{ t('sidebar.readMoreNews') }} →</a>
    </div>
  </div>
</template>
