<script setup lang="ts">
// The "EN ▾" pill and its language menu (same look as the header's Submit menu).
// `alignLeft`: the menu opens from the pill's left edge (a pill on the left of its row,
// like the mobile menu's bottom row) instead of its right edge.
const props = withDefaults(defineProps<{ alignLeft?: boolean }>(), { alignLeft: false })
const { t, locale, locales } = useI18n()
const { switchLanguage, pending } = useSwitchLanguage()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const items = ref<HTMLButtonElement[]>([])
const current = computed(() => pending.value ?? locale.value)
// As tall as the room below the pill allows (the list scrolls inside past that).
const maxHeight = ref(480)

async function toggle() {
  if (pending.value) return
  open.value = !open.value
  if (open.value) {
    const below = window.innerHeight - (trigger.value?.getBoundingClientRect().bottom ?? 0) - 16
    maxHeight.value = Math.max(160, Math.min(480, below))
    await nextTick()
    const i = locales.value.findIndex(l => l.code === current.value)
    items.value[Math.max(0, i)]?.focus()
  }
}
function close(refocus = false) {
  open.value = false
  if (refocus) trigger.value?.focus()
}
async function choose(code: string) {
  close(true)
  if (code !== locale.value) await switchLanguage(code)
}

// Arrow keys move through the list, Escape closes it.
function onKeydown(e: KeyboardEvent) {
  if (!open.value) return
  const i = items.value.indexOf(document.activeElement as HTMLButtonElement)
  if (e.key === 'Escape') { e.preventDefault(); close(true) }
  else if (e.key === 'ArrowDown') { e.preventDefault(); items.value[(i + 1) % items.value.length]?.focus() }
  else if (e.key === 'ArrowUp') { e.preventDefault(); items.value[(i - 1 + items.value.length) % items.value.length]?.focus() }
  else if (e.key === 'Home') { e.preventDefault(); items.value[0]?.focus() }
  else if (e.key === 'End') { e.preventDefault(); items.value[items.value.length - 1]?.focus() }
  else if (e.key === 'Tab') close()
}
function onDocClick(e: MouseEvent) {
  if (open.value && !root.value?.contains(e.target as Node)) close()
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="root" class="relative" @keydown="onKeydown">
    <button
      ref="trigger"
      type="button"
      :aria-label="t('header.language')"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :disabled="!!pending"
      :class="['inline-flex items-center gap-1 whitespace-nowrap rounded-full border bg-white px-3 py-2 text-[13px] font-medium text-ink-800 transition-colors hover:border-ink-400 disabled:cursor-wait disabled:opacity-60', open ? 'border-ink-400' : 'border-ink-200']"
      @click="toggle"
    >
      {{ current.toUpperCase() }}
      <svg :class="['h-3 w-3 text-ink-400 transition-transform duration-200', open && 'rotate-180']" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="m5 7.5 5 5 5-5" />
      </svg>
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="open"
        role="listbox"
        :aria-label="t('header.language')"
        :style="{ maxHeight: `${maxHeight}px` }"
        :class="['absolute z-50 w-56 overflow-y-auto rounded-2xl border border-ink-100 bg-white p-1.5 shadow-[0_16px_40px_-16px_rgba(23,18,26,.25)]', props.alignLeft ? 'left-0 top-full mt-2 origin-top-left' : 'right-0 top-full mt-2 origin-top-right']"
      >
        <button
          v-for="loc in locales"
          :key="loc.code"
          ref="items"
          type="button"
          role="option"
          :aria-selected="loc.code === current"
          :class="['flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm outline-none transition-colors focus-visible:bg-ink-100/70', loc.code === current ? 'bg-brand-50 font-semibold text-ink-900' : 'text-ink-800 hover:bg-ink-100/60']"
          @click="choose(loc.code)"
        >
          <span :class="['w-8 shrink-0 rounded-md py-0.5 text-center text-[11px] font-semibold', loc.code === current ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-700']">{{ loc.code.toUpperCase() }}</span>
          <span class="min-w-0 flex-1 truncate">{{ loc.name }}</span>
          <svg v-if="loc.code === current" class="h-4 w-4 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="m5 12.5 4.5 4.5L19 7" />
          </svg>
        </button>
      </div>
    </Transition>
  </div>
</template>
