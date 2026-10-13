import type { Category } from '~/types'

// Public category list in the current language (GET /api/categories), shared by the
// hero, footer and list pages. One key for all of them: useFetch keys default to the
// call site, so each caller fetched — and put into the page payload — its own copy.
export function useCategories() {
  const { locale } = useI18n()
  return useFetch<Category[]>('/api/categories', {
    key: computed(() => `categories:${locale.value}`),
    query: computed(() => ({ locale: locale.value }))
  })
}
