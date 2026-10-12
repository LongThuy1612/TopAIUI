<script setup lang="ts">
import source from '~/content/legal/editorial-guidelines.md?raw'

const { t } = useI18n()
</script>

<template>
  <LegalPage :source="source" :seo-title="t('legalPage.editorial.title')" :seo-description="t('legalPage.editorial.description')" />
</template>
