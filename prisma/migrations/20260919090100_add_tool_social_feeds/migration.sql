-- CreateTable
CREATE TABLE "tool_social_feeds" (
    "id" TEXT NOT NULL,
    "stat_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "thumbnail_url" TEXT,
    "video_url" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "creator_name" TEXT,
    "creator_handle" TEXT,
    "published_at" TIMESTAMP(3),
    "views" BIGINT NOT NULL DEFAULT 0,
    "likes" BIGINT NOT NULL DEFAULT 0,
    "comments" BIGINT NOT NULL DEFAULT 0,
    "shares" BIGINT NOT NULL DEFAULT 0,
    "quotes" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "collects" BIGINT NOT NULL DEFAULT 0,
    "interactions" JSONB,
    "metatags" JSONB,

    CONSTRAINT "tool_social_feeds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tool_social_feeds_stat_id_idx" ON "tool_social_feeds"("stat_id");

-- AddForeignKey
ALTER TABLE "tool_social_feeds" ADD CONSTRAINT "tool_social_feeds_stat_id_fkey" FOREIGN KEY ("stat_id") REFERENCES "tool_social_stats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

