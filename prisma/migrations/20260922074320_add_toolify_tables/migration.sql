-- CreateTable
CREATE TABLE "toolify_tools" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website_domain" TEXT,
    "website_url" TEXT,
    "image_url" TEXT,
    "tagline" TEXT,
    "what_is" TEXT,
    "what_is_summary" TEXT,
    "how_to_use" TEXT,
    "best_for" TEXT,
    "tags" TEXT,
    "pricing_tags" TEXT[],
    "month_visited_count" BIGINT,
    "collected_count" INTEGER,
    "review_score" DECIMAL(3,2),
    "review_count" INTEGER,
    "rating_count" INTEGER,
    "toolify_created_at" TIMESTAMPTZ(6),
    "toolify_updated_at" TIMESTAMPTZ(6),
    "source_url" TEXT NOT NULL,
    "scraped_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "toolify_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "toolify_categories" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "toolify_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "toolify_tool_categories" (
    "tool_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "toolify_tool_categories_pkey" PRIMARY KEY ("tool_id","category_id")
);

-- CreateTable
CREATE TABLE "toolify_tool_core_features" (
    "id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "feature_text" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "toolify_tool_core_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "toolify_tool_use_cases" (
    "id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "use_case_text" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "toolify_tool_use_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "toolify_tool_pricing_plans" (
    "id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "plan_name" TEXT,
    "price_text" TEXT,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "toolify_tool_pricing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "toolify_tool_faq" (
    "id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "toolify_tool_faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "toolify_tool_traffic_snapshots" (
    "id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "snapshot_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monthly_visits" TEXT,
    "bounce_rate" DECIMAL(65,30),
    "avg_visit_duration" TEXT,
    "pages_per_visit" DECIMAL(65,30),
    "growth_rate" DECIMAL(65,30),
    "raw_json" JSONB,

    CONSTRAINT "toolify_tool_traffic_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "toolify_tools_slug_key" ON "toolify_tools"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "toolify_categories_handle_key" ON "toolify_categories"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "toolify_tool_traffic_snapshots_tool_id_snapshot_date_key" ON "toolify_tool_traffic_snapshots"("tool_id", "snapshot_date");

-- AddForeignKey
ALTER TABLE "toolify_tool_categories" ADD CONSTRAINT "toolify_tool_categories_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "toolify_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "toolify_tool_categories" ADD CONSTRAINT "toolify_tool_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "toolify_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "toolify_tool_core_features" ADD CONSTRAINT "toolify_tool_core_features_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "toolify_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "toolify_tool_use_cases" ADD CONSTRAINT "toolify_tool_use_cases_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "toolify_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "toolify_tool_pricing_plans" ADD CONSTRAINT "toolify_tool_pricing_plans_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "toolify_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "toolify_tool_faq" ADD CONSTRAINT "toolify_tool_faq_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "toolify_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "toolify_tool_traffic_snapshots" ADD CONSTRAINT "toolify_tool_traffic_snapshots_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "toolify_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
