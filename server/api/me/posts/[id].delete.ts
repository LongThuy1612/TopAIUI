// Withdraw a submission not handled yet; its credits come back.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  return withdrawSubmission(userId, getRouterParam(event, 'id') ?? '')
})
