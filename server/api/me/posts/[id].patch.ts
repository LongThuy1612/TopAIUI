// Edit a submission that is still pending or that the editor sent back for changes.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const body = await readBody<Record<string, unknown>>(event)
  return updateSubmission(userId, getRouterParam(event, 'id') ?? '', body ?? {})
})
