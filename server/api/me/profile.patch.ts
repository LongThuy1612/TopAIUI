// Update the logged-in user's name and invoice details. Email is the login
// identity and is not changeable here.
const FIELDS = ['name', 'company', 'country', 'phone', 'city', 'state', 'zip', 'address', 'vatNumber'] as const
type Field = typeof FIELDS[number]

const MAX_LENGTH: Record<Field, number> = {
  name: 100,
  company: 200,
  country: 2, // ISO 3166-1 alpha-2 code
  phone: 40,
  city: 100,
  state: 100,
  zip: 20,
  address: 300,
  vatNumber: 40
}

export default defineEventHandler(async (event) => {
  const userId = requireUser(event)
  const body = await readBody<Partial<Record<Field, unknown>>>(event)
  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body' })
  }

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { isBanned: true, deletedAt: true, name: true, company: true, country: true, phone: true, city: true, state: true, zip: true, address: true, vatNumber: true }
  })
  if (!current || current.isBanned || current.deletedAt) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // The form always sends every field. Only changed ones are validated and
  // written, so values saved before these limits existed (a long name from
  // sign-up or Google, a free-text country) don't block saving the rest.
  const data: Partial<Record<Field, string | null>> = {}
  for (const field of FIELDS) {
    if (!(field in body)) continue
    const raw = body[field]
    if (raw !== null && typeof raw !== 'string') {
      throw createError({ statusCode: 400, statusMessage: `Invalid ${field}` })
    }
    const value = raw?.trim() || null
    if (value === (current[field] ?? null)) continue
    if (value && value.length > MAX_LENGTH[field]) {
      throw createError({ statusCode: 400, statusMessage: `${field} is too long` })
    }
    if (field === 'country' && value && !/^[A-Z]{2}$/.test(value)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid country' })
    }
    data[field] = value
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { email: true, name: true, company: true, country: true, phone: true, city: true, state: true, zip: true, address: true, vatNumber: true }
  })
  return updated
})
