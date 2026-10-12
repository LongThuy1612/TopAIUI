// The current path without its language prefix (/vi/dashboard → /dashboard), for
// "which page am I on" checks written against the English paths. Links and
// navigation go through NuxtLinkLocale / useLocalePath instead.
export function useBasePath() {
  const route = useRoute()
  const { localeCodes } = useI18n()
  return computed(() => {
    const [, first, ...rest] = route.path.split('/')
    if (first && localeCodes.value.includes(first)) return `/${rest.join('/')}`
    return route.path
  })
}
