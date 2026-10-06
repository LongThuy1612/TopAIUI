<script setup lang="ts">
// Choropleth of traffic share by country. Paths are pre-projected (Mercator,
// Antarctica dropped) in /data/world-map.json and keyed by ISO numeric code.
const props = defineProps<{
  regions: { numeric: number | null; pct: number; label: string }[]
}>()

// ISO numeric code of the highlighted country — set by hovering the map, or by
// the parent (e.g. hovering a row of the region list next to it).
const active = defineModel<number | null>('active', { default: null })

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

// The highlighted country is drawn last so its outline isn't hidden under neighbours.
const activeCountry = computed(() => (active.value == null ? null : map.value?.countries.find(c => c.id === active.value) ?? null))

// Tooltip follows the cursor; position is relative to the wrapper, in px.
const wrapper = ref<HTMLElement | null>(null)
const tip = ref<{ x: number; y: number } | null>(null)
const tipText = computed(() => {
  const c = activeCountry.value
  if (!c || !tip.value) return null
  const region = byId.value.get(c.id!)
  return region ? `${region.label}: ${region.pct.toFixed(2)}%` : c.name
})

function onMove(e: MouseEvent, id: number | null) {
  active.value = id
  const box = wrapper.value?.getBoundingClientRect()
  tip.value = box ? { x: e.clientX - box.left, y: e.clientY - box.top } : null
}

function onLeave() {
  active.value = null
  tip.value = null
}
</script>

<template>
  <div v-if="map" ref="wrapper" class="relative" @mouseleave="onLeave">
    <svg :viewBox="`0 0 ${map.width} ${map.height}`" class="h-auto w-full" role="img">
      <path
        v-for="(c, i) in map.countries"
        :key="c.id ?? `x-${i}`"
        :d="c.d"
        :fill="c.id != null && byId.has(c.id) ? '#2A7BFF' : '#EDEDED'"
        :fill-opacity="c.id != null && byId.has(c.id) ? fillOpacity(byId.get(c.id)!.pct) : 1"
        stroke="#BDBDBD"
        stroke-width="0.5"
        stroke-linejoin="round"
        class="cursor-pointer"
        @mousemove="onMove($event, c.id)"
        @mouseleave="onLeave"
      />
      <!-- Highlight layer: the active country redrawn on top, brighter and outlined -->
      <path
        v-if="activeCountry"
        :d="activeCountry.d"
        :fill="byId.has(activeCountry.id!) ? '#1D63E0' : '#D6D6D6'"
        :stroke="byId.has(activeCountry.id!) ? '#0F47B0' : '#8F8F8F'"
        stroke-width="1"
        stroke-linejoin="round"
        class="pointer-events-none"
      />
    </svg>
    <div
      v-if="tipText && tip"
      class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-900 shadow-lg"
      :style="{ left: `${tip.x}px`, top: `${tip.y}px` }"
    >
      {{ tipText }}
    </div>
  </div>
  <div v-else class="w-full" :style="{ aspectRatio: '800 / 518' }" />
</template>
