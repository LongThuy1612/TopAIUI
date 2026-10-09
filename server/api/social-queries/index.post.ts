// POST /api/social-queries { name, keywords: string[] (1–5) } → a new active query,
// if the plan has a free slot.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const input = cleanQueryInput(await readBody(event) ?? {})
  return withActiveSlot(userId, tx => tx.socialQuery.create({
    data: { userId, name: input.name!, keywords: input.keywords!, active: true, lastViewedAt: new Date() }
  }))
})
