import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { mailLocale, newsletterText } from './newsletterText'

// The weekly newsletter ("Get the best AI tools, weekly" on the home page).
//
// What it may carry — only what anyone sees free on the site:
//   tools: name, logo, short description, category, pricing type, upvotes (NEWSLETTER_TOOL_SELECT)
//   AI News: title and excerpt
// Never traffic, growth, revenue, bounce rate, rankings or any list sorted by them: those
// are what the Research plans and the Ranking pages sell. The selects below are the
// only columns read, so a template change can't leak them. Every link goes to our own
// pages (where the plan limits apply), never straight to a tool's website.
//
// Sending: plain Gmail allows about 500 recipients a day, shared with the account emails
// (confirm email, password reset). The newsletter uses at most DAILY_LIMIT of them per
// rolling 24 hours, PER_RUN an hour (task newsletter:send), one mail every few seconds —
// a big list simply takes several days. Each address gets an issue once
// (NewsletterDelivery is unique per issue and subscriber).
export const NEWSLETTER_LIMITS = {
  tools: 10,
  articles: 5,
  // Rolling 24 hours, newsletter only. NUXT_NEWSLETTER_DAILY_LIMIT overrides (e.g. on a
  // Workspace account or a mailing service).
  daily: 300,
  perRun: 60,
  gapMs: 3000
}
const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS

export const NEWSLETTER_TOOL_SELECT = {
  id: true,
  slug: true,
  name: true,
  logoUrl: true,
  pricingType: true,
  upvoteCount: true,
  categories: { take: 1, select: { slug: true, name: true, translations: { select: { locale: true, name: true } } } },
  translations: { select: { locale: true, shortDesc: true } }
} satisfies Prisma.ToolSelect

const NEWSLETTER_ARTICLE_SELECT = { id: true, slug: true, title: true, excerpt: true, externalUrl: true } satisfies Prisma.ArticleSelect

type NewsletterTool = Prisma.ToolGetPayload<{ select: typeof NEWSLETTER_TOOL_SELECT }>
type NewsletterArticle = Prisma.ArticleGetPayload<{ select: typeof NEWSLETTER_ARTICLE_SELECT }>

export function newsletterDailyLimit() {
  const n = Math.floor(Number(useRuntimeConfig().newsletterDailyLimit))
  return n > 0 ? n : NEWSLETTER_LIMITS.daily
}

const smtpReady = () => !!useRuntimeConfig().smtpHost

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

const LIVE_TOOL = { status: 'PUBLISHED', deletedAt: null, isApproved: true } satisfies Prisma.ToolWhereInput

// This week's picks: approved tools added in the last 7 days, most upvoted first, and the
// AI News of the week. Only ids are stored on the issue.
export async function pickWeeklyContent(now = new Date()) {
  const since = new Date(now.getTime() - WEEK_MS)
  const [tools, articles] = await Promise.all([
    prisma.tool.findMany({
      where: { ...LIVE_TOOL, addedOn: { gte: since, lte: now } },
      orderBy: [{ upvoteCount: 'desc' }, { addedOn: 'desc' }, { id: 'asc' }],
      take: NEWSLETTER_LIMITS.tools,
      select: { id: true }
    }),
    prisma.article.findMany({
      where: { status: 'PUBLISHED', publishedAt: { gte: since, lte: now } },
      orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
      take: NEWSLETTER_LIMITS.articles,
      select: { id: true }
    })
  ])
  return { toolIds: tools.map(t => t.id), articleIds: articles.map(a => a.id) }
}

// The issue's rows, in its order, minus anything unpublished since.
async function loadContent(toolIds: string[], articleIds: string[]) {
  const [tools, articles] = await Promise.all([
    prisma.tool.findMany({ where: { id: { in: toolIds.slice(0, NEWSLETTER_LIMITS.tools) }, ...LIVE_TOOL }, select: NEWSLETTER_TOOL_SELECT }),
    prisma.article.findMany({ where: { id: { in: articleIds.slice(0, NEWSLETTER_LIMITS.articles) }, status: 'PUBLISHED' }, select: NEWSLETTER_ARTICLE_SELECT })
  ])
  const inOrder = <T extends { id: string }>(ids: string[], rows: T[]) => ids.flatMap(id => rows.filter(r => r.id === id))
  return { tools: inOrder(toolIds, tools), articles: inOrder(articleIds, articles) }
}

/* ------------------------------------------------------------------ */
/* Unsubscribe links                                                   */
/* ------------------------------------------------------------------ */

function unsubscribeToken(subscriberId: string) {
  return createHmac('sha256', String(useRuntimeConfig().userTokenSecret)).update(`newsletter-unsubscribe:${subscriberId}`).digest('base64url')
}

export function checkUnsubscribeToken(subscriberId: string, token: string) {
  const a = Buffer.from(unsubscribeToken(subscriberId))
  const b = Buffer.from(token)
  return a.length === b.length && timingSafeEqual(a, b)
}

const siteBase = () => useRuntimeConfig().public.siteUrl.replace(/\/+$/, '')

function unsubscribeUrls(subscriberId: string, locale: string) {
  const q = `s=${encodeURIComponent(subscriberId)}&t=${unsubscribeToken(subscriberId)}`
  return {
    // The link in the mail opens a page with a button: mail scanners that open every link
    // must not unsubscribe anyone.
    page: `${siteBase()}${localizedPath(locale, '/newsletter/unsubscribe')}?${q}`,
    // List-Unsubscribe-Post (RFC 8058): the mail app's own "Unsubscribe" button POSTs here.
    oneClick: `${siteBase()}/api/newsletter/unsubscribe?${q}`
  }
}

/* ------------------------------------------------------------------ */
/* The email                                                           */
/* ------------------------------------------------------------------ */

const UTM = 'utm_source=newsletter&utm_medium=email'
const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

function emailLogo(url: string | null) {
  const value = resolveToolImage(url)
  if (!value || value.startsWith('data:')) return null
  if (value.startsWith('/uploads/')) return `${siteBase()}${value}`
  return value.startsWith('//') ? `https:${value}` : value
}

export function renderNewsletter(content: { tools: NewsletterTool[]; articles: NewsletterArticle[] }, language: string, unsubscribe: { page: string }) {
  const locale = mailLocale(language)
  const tx = newsletterText(locale)
  const page = (path: string) => `${siteBase()}${localizedPath(locale, path)}?${UTM}`
  const tools = content.tools.map((tool) => {
    const category = tool.categories[0]
    return {
      name: tool.name,
      url: page(`/tools/${tool.slug}`),
      logo: emailLogo(tool.logoUrl),
      desc: truncate(cleanText(pickByLocale(tool.translations, locale)?.shortDesc) ?? '', 160),
      meta: [category ? localizedName(category.translations, locale, category.name, category.slug) : null, tool.pricingType ? tx.pricing[tool.pricingType as keyof typeof tx.pricing] : null].filter(Boolean).join(' · '),
      upvotes: tool.upvoteCount ? tx.upvotes(tool.upvoteCount) : ''
    }
  })
  const articles = content.articles.map(a => ({
    title: a.title,
    // A link item has no page of ours: it goes to the AI News list, where it is shown.
    url: a.externalUrl ? page('/ai-news') : page(`/ai-news/${a.slug}`),
    excerpt: truncate(a.excerpt ?? '', 140)
  }))
  const subject = tools.length ? tx.subject(tools.length) : tx.subjectNoTools
  const e = escapeHtml

  const toolRows = tools.map(t => `
<tr><td style="padding:14px 0;border-bottom:1px solid #EFEFF2">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
    <td width="52" valign="top">${t.logo
      ? `<img src="${e(t.logo)}" width="40" height="40" alt="" style="display:block;width:40px;height:40px;border-radius:10px;object-fit:cover;border:1px solid #EFEFF2">`
      : `<div style="width:40px;height:40px;border-radius:10px;background:#FFEBE4;color:#C0401F;font-weight:bold;font-size:18px;line-height:40px;text-align:center">${e(t.name.charAt(0).toUpperCase())}</div>`}</td>
    <td valign="top">
      <a href="${e(t.url)}" style="font-size:16px;font-weight:bold;color:#17171A;text-decoration:none">${e(t.name)}</a>
      ${t.meta ? `<div style="font-size:12px;color:#8A8A93;margin-top:2px">${e(t.meta)}</div>` : ''}
      ${t.desc ? `<div style="font-size:14px;color:#3F3F46;margin-top:6px;line-height:1.5">${e(t.desc)}</div>` : ''}
      ${t.upvotes ? `<div style="font-size:12px;color:#C0401F;margin-top:6px;font-weight:bold">${e(t.upvotes)}</div>` : ''}
    </td>
  </tr></table>
</td></tr>`).join('')

  const articleRows = articles.map(a => `
<tr><td style="padding:10px 0;border-bottom:1px solid #EFEFF2">
  <a href="${e(a.url)}" style="font-size:15px;font-weight:bold;color:#17171A;text-decoration:none">${e(a.title)}</a>
  ${a.excerpt ? `<div style="font-size:13px;color:#52525B;margin-top:4px;line-height:1.5">${e(a.excerpt)}</div>` : ''}
</td></tr>`).join('')

  const html = `<!doctype html>
<html lang="${e(locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(subject)}</title></head>
<body style="margin:0;padding:0;background:#F6F6F8">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#F6F6F8"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#ffffff;border-radius:16px;font-family:Arial,Helvetica,sans-serif;color:#17171A">
  <tr><td style="padding:28px 28px 8px">
    <a href="${e(page('/'))}" style="font-size:18px;font-weight:bold;color:#17171A;text-decoration:none">TopAICollection</a>
    <h1 style="font-size:24px;line-height:1.25;margin:18px 0 6px">${e(tx.heading)}</h1>
    <p style="font-size:14px;color:#52525B;margin:0">${e(tx.intro)}</p>
  </td></tr>
  ${tools.length ? `<tr><td style="padding:16px 28px 0">
    <div style="font-size:12px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;color:#C0401F">${e(tx.toolsTitle)}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${toolRows}</table>
    <p style="margin:18px 0 0"><a href="${e(page('/new'))}" style="display:inline-block;background:#E45937;color:#ffffff;font-weight:bold;font-size:14px;text-decoration:none;padding:11px 20px;border-radius:999px">${e(tx.seeAll)}</a></p>
  </td></tr>` : ''}
  ${articles.length ? `<tr><td style="padding:24px 28px 0">
    <div style="font-size:12px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;color:#C0401F">${e(tx.newsTitle)}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${articleRows}</table>
  </td></tr>` : ''}
  <tr><td style="padding:24px 28px">
    <div style="background:#FFF3F0;border-radius:12px;padding:16px;font-size:14px;color:#3F3F46">
      ${e(tx.insightsText)} <a href="${e(page('/dashboard/insights'))}" style="color:#C0401F;font-weight:bold">${e(tx.insightsLink)}</a>
    </div>
  </td></tr>
  <tr><td style="padding:0 28px 28px;font-size:12px;color:#8A8A93;line-height:1.6">
    ${e(tx.footer)}<br><a href="${e(unsubscribe.page)}" style="color:#8A8A93">${e(tx.unsubscribe)}</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`

  const text = [
    tx.heading, tx.intro, '',
    ...(tools.length ? [tx.toolsTitle.toUpperCase(), ...tools.flatMap(t => [`• ${t.name}${t.meta ? ` (${t.meta})` : ''}`, ...(t.desc ? [`  ${t.desc}`] : []), `  ${t.url}`]), '', `${tx.seeAll}: ${page('/new')}`, ''] : []),
    ...(articles.length ? [tx.newsTitle.toUpperCase(), ...articles.flatMap(a => [`• ${a.title}`, `  ${a.url}`]), ''] : []),
    `${tx.insightsText} ${page('/dashboard/insights')}`, '',
    tx.footer, `${tx.unsubscribe}: ${unsubscribe.page}`
  ].join('\n')

  return { subject, html, text }
}

// What an issue with this content looks like for one reader (admin preview / test mail).
export async function buildNewsletterMail(content: { toolIds: string[]; articleIds: string[] }, language: string, subscriberId = 'preview') {
  const locale = mailLocale(language)
  const rows = await loadContent(content.toolIds, content.articleIds)
  const links = unsubscribeUrls(subscriberId, locale)
  return { ...renderNewsletter(rows, locale, links), links, counts: { tools: rows.tools.length, articles: rows.articles.length } }
}

/* ------------------------------------------------------------------ */
/* Issues and sending                                                  */
/* ------------------------------------------------------------------ */

export const sentInLastDay = () => prisma.newsletterDelivery.count({ where: { sentAt: { gte: new Date(Date.now() - DAY_MS) } } })

// A new issue with this week's content. Refused while another one is still going out,
// or when the week has nothing to send. One at a time (the admin's "Send now" and the
// hourly task could otherwise both pass the check and send everyone two emails).
let creating: Promise<unknown> = Promise.resolve()
export function createIssue(source: 'schedule' | 'admin') {
  const next = creating.then(() => createIssueNow(source))
  creating = next.catch(() => {})
  return next
}
async function createIssueNow(source: 'schedule' | 'admin') {
  const running = await prisma.newsletterIssue.findFirst({ where: { status: 'SENDING' }, select: { id: true } })
  if (running) return { issue: null, reason: 'running' as const }
  const content = await pickWeeklyContent()
  if (!content.toolIds.length && !content.articleIds.length) return { issue: null, reason: 'empty' as const }
  const recipients = await prisma.newsletterSubscriber.count()
  if (!recipients) return { issue: null, reason: 'no-subscribers' as const }
  const issue = await prisma.newsletterIssue.create({ data: { source, ...content, recipients } })
  return { issue, reason: null }
}

// Friday from 08:00 UTC, if the last issue is older than 6 days. A stopped one counts
// too: stopping this week's issue must not have the next hour create it again.
async function weeklyIssueDue(now: Date) {
  if (now.getUTCDay() !== 5 || now.getUTCHours() < 8) return false
  const last = await prisma.newsletterIssue.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } })
  return !last || now.getTime() - last.createdAt.getTime() > 6 * DAY_MS
}

// SMTP answers that mean "not now" (quota, throttling, connection): stop this run and
// try that address again next hour. Anything else (no such mailbox…) is that address's
// failure, recorded once.
function isTemporary(err: unknown) {
  const e = err as { responseCode?: number; code?: string; message?: string }
  if (e?.responseCode && e.responseCode >= 400 && e.responseCode < 500) return true
  if (e?.code && ['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EAUTH', 'ECONNRESET', 'EDNS'].includes(e.code)) return true
  return /quota|rate limit|too many|try again/i.test(e?.message ?? '')
}

let running = false
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// One sending pass: creates Friday's issue when due, then sends the open issue to the
// next addresses, within the hour's and the 24 hours' limits.
export async function runNewsletter(opts: { allowCreate?: boolean } = {}) {
  if (running) return { skipped: 'already running' }
  if (!smtpReady() && !import.meta.dev) return { skipped: 'SMTP not configured' }
  running = true
  try {
    const now = new Date()
    // Never on its own without a real SMTP server (dev only prints the mails).
    if (opts.allowCreate !== false && smtpReady() && await weeklyIssueDue(now)) await createIssue('schedule')

    const issue = await prisma.newsletterIssue.findFirst({ where: { status: 'SENDING' }, orderBy: { createdAt: 'asc' } })
    if (!issue) return { sent: 0 }

    const room = Math.min(NEWSLETTER_LIMITS.perRun, newsletterDailyLimit() - await sentInLastDay())
    if (room <= 0) return { sent: 0, waiting: 'daily limit' }

    // The subscribers of the issue's day who haven't had it yet.
    const batch = await prisma.newsletterSubscriber.findMany({
      where: { createdAt: { lte: issue.createdAt }, deliveries: { none: { issueId: issue.id } } },
      orderBy: { createdAt: 'asc' },
      take: room,
      select: { id: true, email: true, locale: true }
    })
    if (!batch.length) {
      await prisma.newsletterIssue.update({ where: { id: issue.id }, data: { status: 'DONE', finishedAt: new Date() } })
      return { sent: 0, finished: issue.id }
    }

    const content = await loadContent(issue.toolIds, issue.articleIds)
    let sent = 0
    let failed = 0
    for (const [i, sub] of batch.entries()) {
      // Cancelled from the admin page meanwhile.
      if (i && i % 10 === 0) {
        const current = await prisma.newsletterIssue.findUnique({ where: { id: issue.id }, select: { status: true } })
        if (current?.status !== 'SENDING') break
      }
      const locale = mailLocale(sub.locale)
      const links = unsubscribeUrls(sub.id, locale)
      const mail = renderNewsletter(content, locale, links)
      try {
        await sendMail({
          to: sub.email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          headers: { 'List-Unsubscribe': `<${links.oneClick}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
        })
        // Sent but not recorded would mean a second copy next hour: say so in the log.
        await prisma.newsletterDelivery.create({ data: { issueId: issue.id, subscriberId: sub.id, status: 'SENT' } })
          .catch(err => console.error(`[newsletter] sent to ${sub.id} but not recorded:`, err))
        sent++
      } catch (err) {
        if (isTemporary(err)) {
          console.warn(`[newsletter] paused: ${(err as Error)?.message ?? err}`)
          return { sent, failed, paused: true }
        }
        await prisma.newsletterDelivery.create({ data: { issueId: issue.id, subscriberId: sub.id, status: 'FAILED', error: String((err as Error)?.message ?? err).slice(0, 300) } }).catch(() => {})
        failed++
      }
      if (i < batch.length - 1) await sleep(NEWSLETTER_LIMITS.gapMs)
    }
    return { sent, failed }
  } finally {
    running = false
  }
}
