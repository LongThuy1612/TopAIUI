<script setup lang="ts">
// Chips (pricing, categories, badges…) on at most `rows` lines. What doesn't fit goes
// behind a "⋯" button at the end of the last line, which opens a scrollable popover with
// the rest. The server renders every chip (links stay in the HTML); the browser then
// measures where the lines break and hides the overflow.
export interface Chip { key: string; label: string; to?: string; class: string }

const props = withDefaults(defineProps<{ chips: Chip[]; rows?: number; moreLabel: string }>(), { rows: 2 })

const box = ref<HTMLElement | null>(null)
// Each chip's element by index (a link chip's ref is the component: its $el).
const chipEls: HTMLElement[] = []
function setChip(el: unknown, i: number) {
  const node = (el as { $el?: HTMLElement } | null)?.$el ?? (el as HTMLElement | null)
  if (node) chipEls[i] = node
}
const moreBtn = ref<HTMLElement | null>(null)
const shown = ref(props.chips.length) // how many chips stay on the lines
const measured = ref(false)
const open = ref(false)
const hidden = computed(() => props.chips.slice(shown.value))

// Line tops of the visible chips, top to bottom.
const lineTops = (els: HTMLElement[]) => [...new Set(els.map(el => el.offsetTop))].sort((a, b) => a - b)

async function layout() {
  if (!box.value) return
  open.value = false
  shown.value = props.chips.length
  await nextTick()
  const els = chipEls.slice(0, props.chips.length)
  const tops = lineTops(els)
  if (tops.length <= props.rows) { measured.value = true; return }
  const lastTop = tops[props.rows - 1]!
  shown.value = els.findIndex(el => el.offsetTop > lastTop)
  await nextTick()
  // Make room for the button on the last line.
  while (shown.value > 1 && moreBtn.value && moreBtn.value.offsetTop > lastTop) {
    shown.value--
    await nextTick()
  }
  measured.value = true
}

let observer: ResizeObserver | null = null
let lastWidth = 0
onMounted(() => {
  layout()
  observer = new ResizeObserver(([entry]) => {
    const width = Math.round(entry!.contentRect.width)
    if (width !== lastWidth) { lastWidth = width; layout() }
  })
  if (box.value) observer.observe(box.value)
})
onBeforeUnmount(() => observer?.disconnect())
watch(() => props.chips.map(c => c.key).join('|'), () => layout())

// Close on a click outside or Escape.
const popover = ref<HTMLElement | null>(null)
function onDocClick(e: MouseEvent) {
  const target = e.target as Node
  if (open.value && !popover.value?.contains(target) && !moreBtn.value?.contains(target)) open.value = false
}
function onKey(e: KeyboardEvent) { if (e.key === 'Escape') open.value = false }
onMounted(() => { document.addEventListener('click', onDocClick); document.addEventListener('keydown', onKey) })
onBeforeUnmount(() => { document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKey) })
</script>

<template>
  <div class="relative">
    <!-- Until measured, cut at about `rows` lines so the page doesn't jump. -->
    <div ref="box" :class="['relative flex flex-wrap gap-3', !measured && 'overflow-hidden']" :style="!measured ? { maxHeight: `${rows * 32 + (rows - 1) * 12}px` } : undefined">
      <template v-for="(chip, i) in chips" :key="chip.key">
        <NuxtLinkLocale v-if="chip.to" v-show="i < shown" :ref="el => setChip(el, i)" :to="chip.to" :class="['rounded-full px-3 py-1 text-sm', chip.class]">{{ chip.label }}</NuxtLinkLocale>
        <span v-else v-show="i < shown" :ref="el => setChip(el, i)" :class="['rounded-full px-3 py-1 text-sm', chip.class]">{{ chip.label }}</span>
      </template>
      <button
        v-if="hidden.length"
        ref="moreBtn"
        type="button"
        :aria-label="moreLabel"
        :aria-expanded="open"
        :class="['flex h-[30px] items-center rounded-full px-3 text-base font-bold leading-none transition', open ? 'bg-brand-600 text-white' : 'bg-brand-500 text-white hover:bg-brand-600']"
        @click="open = !open"
      >
        ⋯
      </button>
    </div>

    <div
      v-if="open && hidden.length"
      ref="popover"
      class="absolute left-0 right-0 top-full z-30 mt-2 max-h-60 overflow-y-auto rounded-xl border border-ink-100 bg-white p-3 shadow-[0_12px_32px_-12px_rgba(23,18,26,.35)] sm:right-auto sm:w-[440px]"
    >
      <div class="flex flex-wrap gap-2.5">
        <template v-for="chip in hidden" :key="chip.key">
          <NuxtLinkLocale v-if="chip.to" :to="chip.to" :class="['rounded-full px-3 py-1 text-sm', chip.class]" @click="open = false">{{ chip.label }}</NuxtLinkLocale>
          <span v-else :class="['rounded-full px-3 py-1 text-sm', chip.class]">{{ chip.label }}</span>
        </template>
      </div>
    </div>
  </div>
</template>
