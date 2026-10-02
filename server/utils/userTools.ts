import type { Prisma } from '@prisma/client'

// Tools submitted by users through the paid "Submit AI" flow.
//
// Lifecycle (Tool.ownerId = the submitter):
//   paid order        → Tool { status: PENDING, step1: true, step2: false }
//   content ready     → step2 = true   (user pressed "Submit for review", or
//                                       right away in "auto" mode where our team writes it)
//   admin publishes   → status PUBLISHED (approval — isApproved + addedOn — is
//                       the separate Approved toggle in the admin ToolForm)
//   admin rejects     → status CANCELED + rejectionReason; the user fixes it
//                       and resubmits → back to PENDING
// Once PUBLISHED the owner can no longer edit it directly (paid Update AI).
//
// Tool.aiSync queues the crawler's sync-user-tool cron (TopAICrawler), which reads
// the tool's website, writes the English listing when it's missing (auto mode) and
// translates it into every locale. Queued on payment in auto mode and on every
// "Submit for review"; an admin can queue it again from the tool page.
export const AI_SYNC = { QUEUED: 0, DONE: 1, FAILED: -1, INVALID: 2 } as const

// Fields that (re)queue the AI job: a fresh job starts with a clean retry budget.
export const QUEUE_AI = { aiSync: AI_SYNC.QUEUED, aiSyncAttempts: 0 } as const

export type SubmitMode = 'auto' | 'manual'

export const USER_TOOL_FIELDS = ['name', 'logoUrl', 'pricingType', 'twitterUrl', 'discordUrl', 'productHuntUrl'] as const
export const USER_CONTENT_FIELDS = ['shortDesc', 'description', 'whatIs', 'howToUse'] as const
export const USER_LIST_FIELDS = ['coreFeatures', 'useCases'] as const
// Owners write the English listing; other locales are translated from it.
export const USER_CONTENT_LOCALE = 'en'

// "www.Example.ai" → "example.ai"; null for anything that isn't an http(s) URL.
export function hostOf(url: unknown): string | null {
  try {
    const u = new URL(String(url).trim())
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

// What makes two listings "the same website": host without www + path, ignoring
// case, query, hash and trailing slashes. The path matters for tools that live on
// a shared platform (huggingface.co/spaces/…, chromewebstore.google.com/detail/…,
// apps.apple.com/…) — those are different products on the same host.
export function siteKeyOf(url: unknown): string | null {
  const host = hostOf(url)
  if (!host) return null
  const path = new URL(String(url).trim()).pathname.replace(/\/+$/, '').toLowerCase()
  return host + path
}

// A live (not deleted, not rejected) tool already listed for this website.
export async function findDuplicateTool(url: string, excludeId?: string) {
  const host = hostOf(url)
  const key = siteKeyOf(url)
  if (!host || !key) return null
  // Pre-filter on "://host" / "://www.host" (no row limit, so the real match can't be cut
  // off), then compare exact keys — "://ai.com" also matches "://ai.company.io".
  const candidates = await prisma.tool.findMany({
    where: {
      deletedAt: null,
      status: { not: 'CANCELED' },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [
        { website: { contains: `://${host}`, mode: 'insensitive' } },
        { website: { contains: `://www.${host}`, mode: 'insensitive' } }
      ]
    },
    select: { id: true, name: true, website: true }
  })
  return candidates.find(t => siteKeyOf(t.website) === key) ?? null
}

// Stripe Checkout sessions stay payable for 24 hours.
const CHECKOUT_TTL_MS = 24 * 60 * 60 * 1000

// Another buyer's unpaid "Submit AI" checkout for the same website. Blocking it at
// checkout keeps two people from paying for the same site at once (the tool only
// exists after payment, so findDuplicateTool alone can't see the first one yet).
// The buyer's own earlier, abandoned checkout doesn't block them.
export async function findPendingSubmission(url: string, userId: string) {
  const key = siteKeyOf(url)
  if (!key) return null
  return prisma.promoteOrder.findFirst({
    where: {
      type: 'submit-ai',
      status: 'PENDING',
      userId: { not: userId },
      createdAt: { gt: new Date(Date.now() - CHECKOUT_TTL_MS) },
      payload: { path: ['siteKey'], equals: key }
    },
    select: { id: true }
  })
}

function slugify(s: string) {
  return s
    .replace(/[đĐ]/g, 'd')
    .normalize('NFKD').replace(/\p{M}/gu, '') // drop accents left by NFKD (e.g. Vietnamese diacritics)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 60)
    .replace(/^-+|-+$/g, '')
}

async function uniqueSlug(tx: Prisma.TransactionClient, name: string, url: string) {
  const base = slugify(name) || slugify(hostOf(url) ?? '') || 'tool'
  for (let n = 1; ; n++) {
    // Keep the "-n" suffix inside the 60-char limit (cut the base, never the suffix).
    const suffix = n === 1 ? '' : `-${n}`
    const slug = base.slice(0, 60 - suffix.length).replace(/-+$/, '') + suffix
    if (!(await tx.tool.findUnique({ where: { slug }, select: { id: true } }))) return slug
  }
}

// Called from fulfillPromoteOrder (inside its transaction) when a submit-ai
// order flips to PAID. Returns the new tool's id.
export async function createSubmittedTool(
  tx: Prisma.TransactionClient,
  userId: string,
  payload: { name?: unknown; url?: unknown; mode?: unknown }
) {
  const name = String(payload.name ?? '').trim()
  const url = String(payload.url ?? '').trim()
  const mode: SubmitMode = payload.mode === 'manual' ? 'manual' : 'auto'

  const tool = await tx.tool.create({
    data: {
      name,
      slug: await uniqueSlug(tx, name, url),
      website: url,
      ownerId: userId,
      status: 'PENDING',
      isApproved: false,
      step1: true,
      // In auto mode there is nothing for the user to fill in — it goes
      // straight to the admin queue, where our team writes the listing.
      step2: mode === 'auto',
      ...(mode === 'auto' ? QUEUE_AI : { aiSync: null })
    },
    select: { id: true }
  })
  return tool.id
}

// The mode chosen when the tool was ordered. Tools that got an owner some
// other way (no order) are treated as self-written.
export async function submitModeOf(toolId: string): Promise<SubmitMode> {
  const order = await prisma.promoteOrder.findFirst({
    where: { toolId, type: 'submit-ai' },
    orderBy: { createdAt: 'desc' },
    select: { payload: true }
  })
  const mode = (order?.payload as Record<string, unknown> | undefined)?.mode
  return mode === 'auto' ? 'auto' : 'manual'
}

// The owner may edit until the tool is published. In auto mode our team
// writes the listing, so the owner only gets the form back after a rejection.
export function ownerCanEdit(tool: { status: string }, mode: SubmitMode) {
  if (tool.status === 'PUBLISHED') return false
  return mode === 'manual' || tool.status === 'CANCELED'
}

type ContentLike = Partial<Record<(typeof USER_CONTENT_FIELDS)[number], string | null>> &
  Partial<Record<(typeof USER_LIST_FIELDS)[number], string[]>>

// Same bar the admin form uses before approving: every English field filled.
export function contentComplete(tr: ContentLike | null | undefined) {
  if (!tr) return false
  return USER_CONTENT_FIELDS.every(k => Boolean(tr[k]?.trim())) &&
    USER_LIST_FIELDS.every(k => (tr[k]?.length ?? 0) > 0)
}
