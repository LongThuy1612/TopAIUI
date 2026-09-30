<script setup lang="ts">
// Choropleth of traffic share by country. Paths are pre-projected (Mercator,
// Antarctica dropped) in /data/world-map.json and keyed by ISO numeric code.
const props = defineProps<{
  regions: { numeric: number | null; pct: number; label: string }[]
}>()

type WorldMapData = { width: number; height: number; countries: { id: number | null; name: string; d: string }[] }

const map = ref<WorldMapData | null>(null)

onMounted(async () => {
  try {
    map.value = await $fetch<WorldMapData>('/data/world-map.json')
  } catch {
    map.value = null
  }
})

const byId = computed(() => new Map(props.regions.filter(r => r.numeric != null).map(r => [r.numeric!, r])))
const maxPct = computed(() => Math.max(...props.regions.map(r => r.pct), 1))

// Top share gets the full colour; smaller shares fade but stay clearly tinted.
const fillOpacity = (pct: number) => 0.35 + 0.65 * (pct / maxPct.value)
</script>

<template>
  <svg
    v-if="map"
    :viewBox="`0 0 ${map.width} ${map.height}`"
    class="h-auto w-full"
    role="img"
  >
    <path
      v-for="(c, i) in map.countries"
      :key="c.id ?? `x-${i}`"
      :d="c.d"
      :fill="c.id != null && byId.has(c.id) ? '#2A7BFF' : '#EDEDED'"
      :fill-opacity="c.id != null && byId.has(c.id) ? fillOpacity(byId.get(c.id)!.pct) : 1"
      stroke="#BDBDBD"
      stroke-width="0.5"
      stroke-linejoin="round"
    >
      <title v-if="c.id != null && byId.has(c.id)">{{ byId.get(c.id)!.label }}: {{ byId.get(c.id)!.pct.toFixed(2) }}%</title>
    </path>
  </svg>
  <div v-else class="w-full" :style="{ aspectRatio: '800 / 518' }" />
</template>
