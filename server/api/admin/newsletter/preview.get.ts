// Admin → Newsletter → Preview: this week's email as it would go out now, in ?locale=.
// Returns the HTML (shown in a sandboxed iframe) and the subject.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const locale = mailLocale(getQuery(event).locale)
  const mail = await buildNewsletterMail(await pickWeeklyContent(), locale)
  return { locale, subject: mail.subject, html: mail.html, counts: mail.counts }
})
