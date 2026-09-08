-- RenameTable
-- The Category<->Tool implicit m2m table was originally named "_CategoryToTool"
-- (Prisma's default alphabetical naming). Renamed to "_ToolToCategory" to match
-- the name expected by the separate crawler service that reads/writes this table
-- directly via raw SQL. Column semantics are unchanged: "A" = Category.id, "B" = Tool.id.
ALTER TABLE "_CategoryToTool" RENAME TO "_ToolToCategory";
