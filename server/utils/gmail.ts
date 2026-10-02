export const GMAIL_DOMAINS = ['gmail.com', 'googlemail.com']

// Gmail ignores dots and "+tag" in the local part, and googlemail.com is the
// same mailbox: ab@gmail.com, a.b@gmail.com, a.b+shop@googlemail.com all
// reach one inbox (Google: "Dots don't matter in Gmail addresses" — applies
// to consumer Gmail only, not Workspace domains). Returns null for non-Gmail
// addresses. Expects an already lower-cased email.
export function canonicalGmail(email: string): string | null {
  const [local, domain] = email.split('@')
  if (!local || !domain || !GMAIL_DOMAINS.includes(domain)) return null
  return local.split('+')[0]!.replace(/\./g, '')
}

// Ids (at most 2) of live users whose Gmail address is the same mailbox as
// `email`, written any way. Empty for non-Gmail addresses. Scans the Gmail
// rows — only called on sign-up / email change / first Google sign-in.
export async function findSameGmailMailbox(email: string, excludeUserId?: string): Promise<string[]> {
  const canonical = canonicalGmail(email)
  if (!canonical) return []

  // Mirrors canonicalGmail() in SQL; lower() in case older rows (imports)
  // weren't lower-cased like every current write path does.
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "User"
    WHERE "deletedAt" IS NULL
      AND id <> ${excludeUserId ?? ''}
      AND lower(split_part(email, '@', 2)) IN ('gmail.com', 'googlemail.com')
      AND lower(replace(split_part(split_part(email, '@', 1), '+', 1), '.', '')) = ${canonical}
    LIMIT 2`
  return rows.map(r => r.id)
}

// True when `email` — exactly, or as the same Gmail mailbox — already belongs
// to another account.
export async function isEmailTaken(email: string, excludeUserId?: string): Promise<boolean> {
  const exact = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (exact && exact.id !== excludeUserId) return true
  return (await findSameGmailMailbox(email, excludeUserId)).length > 0
}
