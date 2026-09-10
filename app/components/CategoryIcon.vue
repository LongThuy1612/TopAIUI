<script setup lang="ts">
defineProps<{ icon: string }>()
</script>

<template>
  <Icon v-if="icon.includes(':')" :name="icon" class="h-[1em] w-[1em]" />
  <span v-else>{{ icon }}</span>
</template>
