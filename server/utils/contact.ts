import type { ContactStatus, ContactSubject } from '@prisma/client'
import { SUPPORT_EMAIL } from '#shared/site'

// Public Contact page → ContactMessage. Admins answer from Admin → Contact messages;
// the reply is emailed to the sender and shown under Dashboard → My inquiries.

export const CONTACT_SUBJECTS: ContactSubject[] = ['GENERAL', 'SUPPORT', 'FEEDBACK', 'PARTNERSHIP', 'OTHER']
export const CONTACT_STATUSES: ContactStatus[] = ['NEW', 'REPLIED', 'CLOSED']

export const CONTACT_NAME_MAX = 100
export const CONTACT_MESSAGE_MIN = 10
export const CONTACT_MESSAGE_MAX = 5000
export const CONTACT_REPLY_MAX = 5000

// Counted from the ContactMessage table — no extra state. The IP limit stops one
// visitor flooding the inbox; the email limit stops many visitors writing "as" one address.
export const CONTACT_LIMITS = {
  perIp: [{ windowMs: 60 * 60 * 1000, max: 5 }, { windowMs: 24 * 60 * 60 * 1000, max: 20 }],
  perEmail: [{ windowMs: 60 * 60 * 1000, max: 5 }]
}

// English labels for emails (the site's languages only apply to pages).
const SUBJECT_LABEL: Record<ContactSubject, string> = {
  GENERAL: 'General inquiry',
  SUPPORT: 'Technical support',
  FEEDBACK: 'Feedback',
  PARTNERSHIP: 'Partnership',
  OTHER: 'Other'
}

const quote = (s: string) => s.split('\n').map(l => `> ${l}`).join('\n')

// New message → the team's inbox, with Reply-To set to the sender.
export function contactNotificationMail(m: { name: string; email: string; subject: ContactSubject; message: string; userId: string | null }) {
  const inbox = useRuntimeConfig().contactInbox || SUPPORT_EMAIL
  const who = `${m.name} <${m.email}>${m.userId ? '' : ' (guest)'}`
  return {
    to: inbox,
    replyTo: m.email,
    subject: `[Contact] ${SUBJECT_LABEL[m.subject]} — ${m.name}`,
    text: `From: ${who}\nSubject: ${SUBJECT_LABEL[m.subject]}\n\n${m.message}\n\nAnswer it from Admin → Contact messages so the reply is also saved.`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#17121a;max-width:620px">
<p><strong>From:</strong> ${escapeHtml(who)}<br><strong>Subject:</strong> ${escapeHtml(SUBJECT_LABEL[m.subject])}</p>
<p style="white-space:pre-line;border-left:3px solid #fbcfe8;padding-left:12px">${escapeHtml(m.message)}</p>
<p style="font-size:13px;color:#6b7280">Answer it from Admin → Contact messages so the reply is also saved.</p>
</div>`
  }
}

// Admin reply → the sender, quoting their message.
export function contactReplyMail(m: { name: string; email: string; subject: ContactSubject; message: string }, reply: string) {
  const { siteUrl } = useRuntimeConfig().public
  const inquiries = `${siteUrl.replace(/\/+$/, '')}/dashboard/my-inquiries`
  return {
    to: m.email,
    replyTo: useRuntimeConfig().contactInbox || SUPPORT_EMAIL,
    subject: `Re: ${SUBJECT_LABEL[m.subject]} — TopAICollection`,
    text: `Hi ${m.name},\n\n${reply}\n\n— TopAICollection\n\nYour message:\n${quote(m.message)}\n\nSigned-in users can also see this reply at ${inquiries}`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#17121a;max-width:620px">
<p>Hi ${escapeHtml(m.name)},</p>
<p style="white-space:pre-line">${escapeHtml(reply)}</p>
<p>— TopAICollection</p>
<p style="font-size:13px;color:#6b7280">Your message:</p>
<p style="white-space:pre-line;font-size:13px;color:#6b7280;border-left:3px solid #e5e7eb;padding-left:12px">${escapeHtml(m.message)}</p>
<p style="font-size:13px;color:#6b7280">Signed-in users can also see this reply at <a href="${escapeHtml(inquiries)}">${escapeHtml(inquiries)}</a>.</p>
</div>`
  }
}
