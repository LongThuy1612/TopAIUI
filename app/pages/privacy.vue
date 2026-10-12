<script setup lang="ts">
import source from '~/content/legal/privacy.md?raw'

const { t } = useI18n()
</script>

<template>
  <LegalPage :source="source" :seo-title="t('footer.privacy')" :seo-description="t('legalPage.privacyDescription')" />
</template>
