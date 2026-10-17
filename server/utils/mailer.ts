import nodemailer, { type Transporter } from 'nodemailer'

// Outgoing mail over SMTP (any provider: Gmail/Workspace app password, Resend,
// SES, Postmark…). Configure NUXT_SMTP_* (see .env.example). Without an SMTP
// host, dev prints the message to the console so the links can still be
// clicked; production throws.
let transporter: Transporter | null = null

function getTransporter(): Transporter | null {
  if (transporter) return transporter
  const { smtpHost, smtpPort, smtpUser, smtpPass } = useRuntimeConfig()
  if (!smtpHost) return null
  const port = Number(smtpPort) || 587
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port,
    secure: port === 465,
    // String(): NUXT_* env overrides are parsed, so an all-digit password arrives as a number.
    auth: smtpUser ? { user: String(smtpUser), pass: String(smtpPass) } : undefined,
    // nodemailer waits up to 2 min to connect and 10 min on a stalled socket by
    // default; "Resend email" awaits the send, so fail fast instead of hanging.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000
  })
  return transporter
}

export interface MailMessage {
  to: string
  subject: string
  text: string
  html: string
  // Where "Reply" goes, e.g. the visitor who wrote through the contact form.
  replyTo?: string
  // Extra headers, e.g. the newsletter's List-Unsubscribe.
  headers?: Record<string, string>
}

export async function sendMail(message: MailMessage): Promise<void> {
  const transport = getTransporter()
  if (!transport) {
    // Production throws, so callers report a failure instead of "email sent".
    if (!import.meta.dev) throw new Error('SMTP is not configured (NUXT_SMTP_HOST)')
    console.info(`[mail] SMTP not configured — would send to ${message.to}: ${message.subject}\n${message.text}`)
    return
  }
  await transport.sendMail({ from: useRuntimeConfig().mailFrom, ...message })
}

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]!))

// One call-to-action email: a short intro, a button, and the raw link for
// clients that strip buttons.
export function actionMail(opts: { to: string; subject: string; intro: string; action: string; url: string; outro: string }): MailMessage {
  const { to, subject, intro, action, url, outro } = opts
  return {
    to,
    subject,
    text: `${intro}\n\n${action}: ${url}\n\n${outro}\n\n— TopAICollection`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#17121a;max-width:520px">
<p>${escapeHtml(intro)}</p>
<p style="margin:28px 0"><a href="${escapeHtml(url)}" style="background:#BE185D;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px;display:inline-block">${escapeHtml(action)}</a></p>
<p style="font-size:13px;color:#6b7280">${escapeHtml(url)}</p>
<p style="font-size:13px;color:#6b7280">${escapeHtml(outro)}</p>
<p>— TopAICollection</p>
</div>`
  }
}
