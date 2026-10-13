import { Prisma } from '@prisma/client'

// A deleted account's saves stop counting towards Most Saved AIs (spam accounts are the
// usual reason to delete one): its ToolSave rows go and each tool's collectionCount drops
// by one. Raw UPDATE for the same reason as POST /api/tools/<slug>/save: a save is not an
// edit of the tool, so Tool.updatedAt stays.
export async function removeUserSaves(userId: string) {
  await prisma.$transaction(async (tx) => {
    const rows = await tx.toolSave.findMany({ where: { userId }, select: { toolId: true } })
    if (!rows.length) return
    await tx.toolSave.deleteMany({ where: { userId } })
    await tx.$executeRaw`UPDATE "Tool" SET "collectionCount" = GREATEST("collectionCount" - 1, 0) WHERE "id" IN (${Prisma.join(rows.map(r => r.toolId))})`
  })
}
