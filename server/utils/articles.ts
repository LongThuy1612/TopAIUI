import type { Prisma } from '@prisma/client'
import { guestPost, type PostSubmissionType } from '#shared/promote'
import { markdownRenderer } from '#shared/markdown'

// Guest posts / link inserts (model PostSubmission) and the articles they end up in
// (model Article, public under /ai-news).
//
//   customer buys credits (/post-or-insert, User.postCredits)
//   → submits a guest post (2 credits) or a link insert (1 credit): credits taken, PENDING
//   → admin: publish (guest post → new Article) / done (link placed in an Article)
//            request changes (CHANGES_REQUESTED, customer edits → PENDING again)
//            reject (REJECTED, credits back)
//   customer can withdraw while PENDING / CHANGES_REQUESTED (WITHDRAWN, credits back)

const bad = (message: string) => createError({ statusCode: 400, statusMessage: 'Invalid submission', message })
const conflict = (message: string) => createError({ statusCode: 409, statusMessage: 'Conflict', message })

export const articleRenderer = () => markdownRenderer(guestPost.linkRel)
export const OPEN_STATUSES = ['PENDING', 'CHANGES_REQUESTED']

export function slugifyTitle(title: string) {
  return title
    .replace(/[đĐ]/g, 'd')
    .normalize('NFKD').replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 70)
    .replace(/^-+|-+$/g, '') || 'article'
}

// Serializes slug choice: two articles with the same title saved at once would otherwise
// both pick the same free slug and the second would fail on the unique index.
export async function lockArticleSlugs(tx: Prisma.TransactionClient) {
  await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext('article-slug'))) AS l`
}

// A slug no other article has (title-based, "-2", "-3"… on a clash). Call inside a
// transaction after lockArticleSlugs().
export async function uniqueArticleSlug(db: Prisma.TransactionClient, title: string, excludeId?: string) {
  const base = slugifyTitle(title)
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`
    const taken = await db.article.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } })
    if (!taken) return slug
  }
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const isHttp = (v: string) => { try { return ['http:', 'https:'].includes(new URL(v).protocol) } catch { return false } }

// Validates a customer's submission (what the editor form sends) and returns the fields
// to store. Same rules as the form shows (shared/promote.ts guestPost).
export async function cleanSubmission(type: PostSubmissionType, body: Record<string, unknown>) {
  if (type === 'GUEST_POST') {
    const title = str(body.title)
    const excerpt = str(body.excerpt)
    const content = typeof body.content === 'string' ? body.content.replace(/\r\n/g, '\n').trim() : ''
    const coverUrl = str(body.coverUrl)
    if (title.length < 10 || title.length > 120) throw bad('The title must be 10–120 characters.')
    if (excerpt.length > 300) throw bad('The summary must be 300 characters or less.')
    if (content.length > 100_000) throw bad('The article is too long.')
    const { words, externalLinks, images } = articleRenderer().stats(content)
    if (words < guestPost.minWords) throw bad(`The article needs at least ${guestPost.minWords} words (it has ${words}).`)
    if (externalLinks.length > guestPost.maxLinks) throw bad(`A guest post can contain at most ${guestPost.maxLinks} links (it has ${externalLinks.length}).`)
    // Our own uploads only: an outside image could change (or track readers) after review.
    if (!coverUrl.startsWith(UPLOAD_PREFIX) || !isImageUrl(coverUrl)) throw bad('Upload a cover image.')
    if (images.some(src => !src.startsWith(UPLOAD_PREFIX) || !isImageUrl(src))) throw bad('Images in the article must be uploaded with the "Add image" button.')
    return { title, excerpt: excerpt || null, content, coverUrl, targetUrl: null, anchorText: null, note: null, articleId: null }
  }
  const targetUrl = str(body.targetUrl)
  const anchorText = str(body.anchorText)
  const note = str(body.note)
  const articleId = str(body.articleId)
  if (!isHttp(targetUrl) || targetUrl.length > 2000) throw bad('Enter the full link to insert (https://…).')
  if (anchorText.length < 2 || anchorText.length > 80) throw bad('The anchor text must be 2–80 characters.')
  if (note.length > 500) throw bad('The note must be 500 characters or less.')
  if (articleId && !await prisma.article.findFirst({ where: { id: articleId, status: 'PUBLISHED' }, select: { id: true } })) {
    throw bad('That article is not available.')
  }
  return { title: null, excerpt: null, content: null, coverUrl: null, targetUrl, anchorText, note: note || null, articleId: articleId || null }
}

// Takes `n` credits from the user inside `tx`; refuses when the balance is short.
async function spendCredits(tx: Prisma.TransactionClient, userId: string, n: number) {
  const { count } = await tx.user.updateMany({ where: { id: userId, postCredits: { gte: n } }, data: { postCredits: { decrement: n } } })
  if (count !== 1) throw createError({ statusCode: 402, statusMessage: 'Not enough credits', message: `This needs ${n} credit${n > 1 ? 's' : ''}. Buy more on the Guest Post page.` })
}

export async function createSubmission(userId: string, type: PostSubmissionType, body: Record<string, unknown>) {
  const fields = await cleanSubmission(type, body)
  const credits = guestPost.credits[type]
  return prisma.$transaction(async (tx) => {
    await spendCredits(tx, userId, credits)
    return tx.postSubmission.create({ data: { userId, type, credits, status: 'PENDING', ...fields } })
  })
}

// The owner edits a submission still open for changes; it goes back into the queue.
export async function updateSubmission(userId: string, id: string, body: Record<string, unknown>) {
  const sub = await prisma.postSubmission.findFirst({ where: { id, userId } })
  if (!sub) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  if (!OPEN_STATUSES.includes(sub.status)) throw conflict('This submission can no longer be edited.')
  const fields = await cleanSubmission(sub.type as PostSubmissionType, body)
  const { count } = await prisma.postSubmission.updateMany({
    where: { id, status: sub.status },
    data: { ...fields, status: 'PENDING', submittedAt: new Date() }
  })
  if (count !== 1) throw conflict('This submission changed meanwhile, please reload.')
  return { id }
}

// Withdrawn by its owner before it was handled: credits back.
export async function withdrawSubmission(userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const sub = await tx.postSubmission.findFirst({ where: { id, userId } })
    if (!sub) throw createError({ statusCode: 404, statusMessage: 'Not found' })
    const { count } = await tx.postSubmission.updateMany({ where: { id, status: { in: OPEN_STATUSES } }, data: { status: 'WITHDRAWN', reviewedAt: new Date() } })
    if (count !== 1) throw conflict('This submission can no longer be withdrawn.')
    await tx.user.update({ where: { id: userId }, data: { postCredits: { increment: sub.credits } } })
    return { id, refunded: sub.credits }
  })
}

/* ------------------------------------------------------------------ */
/* Admin review                                                        */
/* ------------------------------------------------------------------ */

export type ReviewAction =
  | { action: 'publish'; title?: string; excerpt?: string | null; content?: string; coverUrl?: string } // guest post → new article
  | { action: 'done'; articleId: string } // link insert placed in that article
  | { action: 'requestChanges'; note: string }
  | { action: 'reject'; note: string }

export async function reviewSubmission(id: string, input: ReviewAction) {
  return prisma.$transaction(async (tx) => {
    const sub = await tx.postSubmission.findUnique({ where: { id }, include: { user: { select: { name: true, company: true, email: true } } } })
    if (!sub) throw createError({ statusCode: 404, statusMessage: 'Not found' })
    // Claim it: only one admin action can move a submission out of PENDING, and only the
    // version that was read here (an edit by the customer meanwhile changes updatedAt).
    // A rejection may also close one left waiting for the customer's changes.
    const claim = async (data: Prisma.PostSubmissionUncheckedUpdateManyInput, from: string[] = ['PENDING']) => {
      const { count } = await tx.postSubmission.updateMany({ where: { id, status: { in: from }, updatedAt: sub.updatedAt }, data: { ...data, reviewedAt: new Date() } })
      if (count !== 1) throw conflict('This submission is not waiting for review (it may have been handled or edited meanwhile).')
    }

    switch (input.action) {
      case 'publish': {
        if (sub.type !== 'GUEST_POST') throw bad('Only a guest post is published as an article.')
        // The admin may tidy the text before publishing; the result must still meet the rules.
        const fields = await cleanSubmission('GUEST_POST', {
          title: input.title ?? sub.title, excerpt: input.excerpt ?? sub.excerpt, content: input.content ?? sub.content, coverUrl: input.coverUrl ?? sub.coverUrl
        })
        await claim({ status: 'PUBLISHED', adminNote: null })
        await lockArticleSlugs(tx)
        const article = await tx.article.create({
          data: {
            slug: await uniqueArticleSlug(tx, fields.title!),
            title: fields.title!,
            excerpt: fields.excerpt,
            content: fields.content!,
            coverUrl: fields.coverUrl,
            kind: 'GUEST_POST',
            status: 'PUBLISHED',
            authorId: sub.userId,
            authorName: sub.user.name || sub.user.company || null,
            publishedAt: new Date()
          }
        })
        await tx.postSubmission.update({ where: { id }, data: { articleId: article.id } })
        return { id, status: 'PUBLISHED', articleSlug: article.slug }
      }
      case 'done': {
        if (sub.type !== 'LINK_INSERT') throw bad('Only a link insert is marked as done.')
        // Locked so it can't be deleted / unpublished between this check and the claim.
        await tx.$queryRaw`SELECT id FROM "Article" WHERE id = ${input.articleId} FOR UPDATE`
        const article = await tx.article.findFirst({ where: { id: input.articleId, status: 'PUBLISHED' } })
        if (!article) throw bad('Pick a published article.')
        // The admin edits the article first; make sure the link really is in it — as a link
        // (not just text, nor a longer URL that merely starts the same). A trailing slash
        // doesn't matter.
        const renderer = articleRenderer()
        const bare = (url: string) => url.replace(/\/+$/, '')
        const want = sub.targetUrl ? bare(renderer.normalizeLink(sub.targetUrl)) : ''
        if (!want || !renderer.stats(article.content).externalLinks.some(href => bare(href) === want)) {
          throw bad('The link is not in that article yet — edit the article to add it first.')
        }
        await claim({ status: 'PUBLISHED', articleId: article.id, adminNote: null })
        return { id, status: 'PUBLISHED', articleSlug: article.slug }
      }
      case 'requestChanges': {
        if (!input.note) throw bad('Say what needs to change.')
        await claim({ status: 'CHANGES_REQUESTED', adminNote: input.note })
        return { id, status: 'CHANGES_REQUESTED' }
      }
      case 'reject': {
        if (!input.note) throw bad('Give a reason.')
        await claim({ status: 'REJECTED', adminNote: input.note }, OPEN_STATUSES)
        await tx.user.update({ where: { id: sub.userId }, data: { postCredits: { increment: sub.credits } } })
        return { id, status: 'REJECTED', refunded: sub.credits }
      }
      default:
        throw bad('Unknown action.')
    }
  })
}

/* ------------------------------------------------------------------ */
/* Public                                                              */
/* ------------------------------------------------------------------ */

export const articleCardSelect = {
  slug: true, title: true, excerpt: true, coverUrl: true, kind: true, authorName: true, publishedAt: true
} satisfies Prisma.ArticleSelect

// A summary for cards when the author left none: the start of the text, without markup.
export function autoExcerpt(content: string, max = 180) {
  const text = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(?:[-+*]|\d+\.)\s+/gm, ' ') // list markers (a hyphen inside a word stays)
    .replace(/[#>*_`~]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, '')}…` : text
}

/* ------------------------------------------------------------------ */
/* Admin CMS                                                           */
/* ------------------------------------------------------------------ */

// Validates the admin article form. Editorial rules are looser than guest posts (no word /
// link limits, cover optional); a custom slug is accepted when it is URL-safe.
export function cleanArticleInput(body: Record<string, unknown>) {
  const title = str(body.title)
  const excerpt = str(body.excerpt)
  const content = typeof body.content === 'string' ? body.content.replace(/\r\n/g, '\n').trim() : ''
  const coverUrl = str(body.coverUrl)
  const authorName = str(body.authorName)
  const slug = str(body.slug).toLowerCase()
  const status = body.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'
  if (title.length < 3 || title.length > 200) throw bad('The title must be 3–200 characters.')
  if (excerpt.length > 300) throw bad('The summary must be 300 characters or less.')
  if (!content) throw bad('The article is empty.')
  if (content.length > 200_000) throw bad('The article is too long.')
  if (coverUrl && !isImageUrl(coverUrl)) throw bad('Invalid cover image.')
  if (authorName.length > 80) throw bad('The author name is too long.')
  if (slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw bad('The slug may only contain a–z, 0–9 and dashes.')
  return { title, excerpt: excerpt || null, content, coverUrl: coverUrl || null, authorName: authorName || null, slug, status }
}
