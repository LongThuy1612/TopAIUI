// User text for a Prisma `contains` / `startsWith` filter. Prisma turns those into SQL
// LIKE without escaping it, so "%" or "_" typed in a search box would act as wildcards
// ("%" matching every row); escaped, they match themselves. (Backslash is
// PostgreSQL's default LIKE escape character.)
export function likeText(text: string): string {
  return text.replace(/[\\%_]/g, '\\$&')
}
