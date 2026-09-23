-- CreateTable
CREATE TABLE "PhProductTool" (
    "id" SERIAL NOT NULL,
    "ph_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT,
    "website_url" TEXT,
    "website_domain" TEXT,
    "clean_url" TEXT,
    "logo_uuid" TEXT,
    "twitter_url" TEXT,
    "linkedin_url" TEXT,
    "github_url" TEXT,
    "facebook_url" TEXT,
    "instagram_url" TEXT,
    "pricing_type" TEXT,
    "employee_size" TEXT,
    "funding_amount" TEXT,
    "was_in_yc" BOOLEAN NOT NULL DEFAULT false,
    "is_claimed" BOOLEAN NOT NULL DEFAULT false,
    "is_top_product" BOOLEAN NOT NULL DEFAULT false,
    "reviews_count" INTEGER,
    "reviews_rating" DECIMAL(3,2),
    "detailed_reviews_count" INTEGER,
    "detailed_reviews_rating" DECIMAL(3,2),
    "followers_count" INTEGER,
    "categories" JSONB,
    "media" JSONB,
    "launches" JSONB,
    "badges" JSONB,
    "source_url" TEXT NOT NULL,
    "scraped_at" TIMESTAMP(3) NOT NULL,
    "is_sync" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhProductTool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhProductTool_ph_id_key" ON "PhProductTool"("ph_id");

-- CreateIndex
CREATE UNIQUE INDEX "PhProductTool_slug_key" ON "PhProductTool"("slug");
