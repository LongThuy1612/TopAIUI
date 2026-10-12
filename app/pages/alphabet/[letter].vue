<script setup lang="ts">
import type { Tool, ToolsResponse } from '~/types'

const { t, locale } = useI18n()
const route = useRoute()

// /alphabet/a — published tools whose name starts with that letter, A → Z.
const letter = computed(() => String(route.params.letter).toUpperCase())
if (!/^[A-Z]$/.test(letter.value)) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found' })
}
// One URL per letter: /alphabet/C → /alphabet/c, so search engines and the
// page cache don't see two copies of the same page.
if (route.params.letter !== letter.value.toLowerCase()) {
  await navigateTo(`/alphabet/${letter.value.toLowerCase()}`, { redirectCode: 301, replace: true })
}

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const page = ref(1)
const tools = ref<Tool[]>([])
const pageCount = ref(1)
const total = ref(0)
const loadingMore = ref(false)

watch([locale, letter], () => { page.value = 1 })

// Deeper pages carry the login token: guests stop at PUBLIC_LIMITS.guestListTools tools.
const { authHeaders } = useAuth()
const { data: toolsRes, error: toolsError, refresh: refreshTools } = await useFetch<ToolsResponse>('/api/tools', {
  headers: computed(() => (page.value > 1 ? authHeaders() : {})),
  query: computed(() => ({
    letter: letter.value,
    page: page.value,
    limit: 100,
    locale: locale.value
  }))
})

watch(toolsRes, (res) => {
  if (!res) return
  tools.value = page.value === 1 ? res.items : [...tools.value, ...res.items]
  pageCount.value = res.loginRequired ? page.value : res.pageCount
  total.value = res.total
  loadingMore.value = false
}, { immediate: true })

// A failed page leaves data empty, so the watcher above never clears
// loadingMore and scrolling would stop for good. Clear it here instead; the
// next time the sentinel comes into view loadMore() retries that same page.
watch(toolsError, (err) => { if (err) loadingMore.value = false })

function loadMore() {
  if (loadingMore.value) return
  if (toolsError.value) {
    loadingMore.value = true
    refreshTools()
    return
  }
  if (page.value >= pageCount.value) return
  loadingMore.value = true
  page.value += 1
}

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!import.meta.client) return
  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) loadMore()
  })
  if (sentinel.value) observer.observe(sentinel.value)
})

onBeforeUnmount(() => observer?.disconnect())

useSeoMeta({
  title: () => `${t('alphabet.title')} ${letter.value} — TopAICollection`,
  description: () => `AI tools starting with ${letter.value}: browse the TopAICollection directory alphabetically.`,
  ogTitle: () => `${t('alphabet.title')} ${letter.value} — TopAICollection`,
  ogDescription: () => `AI tools starting with ${letter.value}: browse the TopAICollection directory alphabetically.`
})
</script>

<template>
  <div class="bg-white">
    <div class="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
      <nav class="flex flex-wrap items-center gap-3 text-sm text-ink-900">
        <NuxtLink to="/" class="hover:text-brand-600">{{ t('category.breadcrumbHome') }}</NuxtLink>
        <span>/</span>
        <span>{{ t('alphabet.title') }}</span>
        <span>/</span>
        <span class="text-brand-600">{{ letter }}</span>
      </nav>

      <div class="mt-6 grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_325px]">
        <div class="overflow-hidden rounded-lg border border-ink-200 shadow-sm">
          <table class="w-full text-base">
            <thead class="bg-brand-500 text-left text-white">
              <tr>
                <th class="w-[120px] px-4 py-2.5 text-center font-medium">#</th>
                <th class="px-4 py-2.5 font-medium md:w-[30%]">{{ t('archive.name') }} <span v-if="total" class="font-normal text-white/80">({{ total }})</span></th>
                <th class="hidden px-4 py-2.5 font-medium md:table-cell">{{ t('archive.introduction') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ink-100">
              <tr v-for="(tool, i) in tools" :key="tool.slug" class="hover:bg-ink-100/40">
                <td class="px-4 py-2.5 text-center text-ink-600">{{ i + 1 }}</td>
                <td class="px-4 py-2.5">
                  <NuxtLink :to="`/tools/${tool.slug}`" class="text-ink-600 hover:text-brand-600">{{ tool.name }}</NuxtLink>
                </td>
                <td class="hidden px-4 py-2.5 text-ink-500 md:table-cell">
                  <span class="line-clamp-2">{{ tool.shortDesc }}</span>
                </td>
              </tr>
              <tr v-if="!tools.length">
                <td colspan="3" class="px-4 py-12 text-center text-sm text-ink-400">{{ t('empty.noResults') }}.</td>
              </tr>
            </tbody>
          </table>
          <div ref="sentinel" class="h-px"></div>
          <p v-if="loadingMore" class="py-4 text-center text-sm text-ink-400">{{ t('tool.loadingMore') }}</p>
        </div>

        <div class="overflow-hidden rounded-lg border border-ink-200">
          <div class="bg-brand-500 px-4 py-2.5 text-base font-medium text-white">{{ t('alphabet.browse') }}</div>
          <div class="grid grid-cols-6 gap-1 p-3 text-center text-sm">
            <NuxtLink
              v-for="l in alphabet"
              :key="l"
              :to="`/alphabet/${l.toLowerCase()}`"
              :class="['flex h-9 items-center justify-center rounded-md', l === letter ? 'bg-brand-500 font-semibold text-white' : 'text-ink-700 hover:bg-ink-100 hover:text-brand-600']"
            >{{ l }}</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
