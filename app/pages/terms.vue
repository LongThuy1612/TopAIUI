<script setup lang="ts">
import source from '~/content/legal/terms.md?raw'

const { t } = useI18n()
</script>

<template>
  <LegalPage :source="source" :seo-title="t('footer.terms')" :seo-description="t('legalPage.termsDescription')" />
</template>
