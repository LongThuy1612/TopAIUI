<script setup lang="ts">
import source from '~/content/legal/review-methodology.md?raw'

const { t } = useI18n()
</script>

<template>
  <LegalPage :source="source" :seo-title="t('legalPage.reviewMethodology.title')" :seo-description="t('legalPage.reviewMethodology.description')" />
</template>
