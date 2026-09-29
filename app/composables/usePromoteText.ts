import { SITE_NAME } from '~/data/promote'

export type FaqItem = { q: string; a: string }
export type CheckItem = { title: string; desc?: string }

type Params = Record<string, unknown>

// Chữ của khu vực promote nằm trong i18n (key "promote"). Các hàm ở đây đọc
// mảng / object bằng tm + rt và luôn truyền sẵn {site}. Gọi trong template
// hoặc computed để tự đổi theo ngôn ngữ.
export function usePromoteText() {
  const { t, tm, rt } = useI18n()

  const withSite = (params?: Params) => ({ site: SITE_NAME, ...params })
  const arr = (key: string) => (tm(key) as unknown as unknown[]) ?? []
  const r = (msg: unknown, params?: Params) => rt(msg as Parameters<typeof rt>[0], withSite(params))

  return {
    t,
    tp: (key: string, params?: Params) => t(key, withSite(params)),
    list: (key: string, params?: Params) => arr(key).map(m => r(m, params)),
    faqs: (key: string, params?: Params): FaqItem[] =>
      arr(key).map(f => ({ q: r((f as any).q, params), a: r((f as any).a, params) })),
    items: (key: string, params?: Params): CheckItem[] =>
      arr(key).map(i => ({ title: r((i as any).title, params), desc: (i as any).desc ? r((i as any).desc, params) : undefined })),
  }
}
