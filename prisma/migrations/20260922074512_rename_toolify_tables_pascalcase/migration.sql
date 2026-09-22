-- RenameTable
ALTER TABLE "toolify_tools" RENAME TO "ToolifyTool";
ALTER TABLE "toolify_categories" RENAME TO "ToolifyCategory";
ALTER TABLE "toolify_tool_categories" RENAME TO "ToolifyToolCategory";
ALTER TABLE "toolify_tool_core_features" RENAME TO "ToolifyToolCoreFeature";
ALTER TABLE "toolify_tool_use_cases" RENAME TO "ToolifyToolUseCase";
ALTER TABLE "toolify_tool_pricing_plans" RENAME TO "ToolifyToolPricingPlan";
ALTER TABLE "toolify_tool_faq" RENAME TO "ToolifyToolFaq";
ALTER TABLE "toolify_tool_traffic_snapshots" RENAME TO "ToolifyToolTrafficSnapshot";

-- RenameConstraint (primary keys)
ALTER TABLE "ToolifyTool" RENAME CONSTRAINT "toolify_tools_pkey" TO "ToolifyTool_pkey";
ALTER TABLE "ToolifyCategory" RENAME CONSTRAINT "toolify_categories_pkey" TO "ToolifyCategory_pkey";
ALTER TABLE "ToolifyToolCategory" RENAME CONSTRAINT "toolify_tool_categories_pkey" TO "ToolifyToolCategory_pkey";
ALTER TABLE "ToolifyToolCoreFeature" RENAME CONSTRAINT "toolify_tool_core_features_pkey" TO "ToolifyToolCoreFeature_pkey";
ALTER TABLE "ToolifyToolUseCase" RENAME CONSTRAINT "toolify_tool_use_cases_pkey" TO "ToolifyToolUseCase_pkey";
ALTER TABLE "ToolifyToolPricingPlan" RENAME CONSTRAINT "toolify_tool_pricing_plans_pkey" TO "ToolifyToolPricingPlan_pkey";
ALTER TABLE "ToolifyToolFaq" RENAME CONSTRAINT "toolify_tool_faq_pkey" TO "ToolifyToolFaq_pkey";
ALTER TABLE "ToolifyToolTrafficSnapshot" RENAME CONSTRAINT "toolify_tool_traffic_snapshots_pkey" TO "ToolifyToolTrafficSnapshot_pkey";

-- RenameForeignKey
ALTER TABLE "ToolifyToolCategory" RENAME CONSTRAINT "toolify_tool_categories_tool_id_fkey" TO "ToolifyToolCategory_tool_id_fkey";
ALTER TABLE "ToolifyToolCategory" RENAME CONSTRAINT "toolify_tool_categories_category_id_fkey" TO "ToolifyToolCategory_category_id_fkey";
ALTER TABLE "ToolifyToolCoreFeature" RENAME CONSTRAINT "toolify_tool_core_features_tool_id_fkey" TO "ToolifyToolCoreFeature_tool_id_fkey";
ALTER TABLE "ToolifyToolUseCase" RENAME CONSTRAINT "toolify_tool_use_cases_tool_id_fkey" TO "ToolifyToolUseCase_tool_id_fkey";
ALTER TABLE "ToolifyToolPricingPlan" RENAME CONSTRAINT "toolify_tool_pricing_plans_tool_id_fkey" TO "ToolifyToolPricingPlan_tool_id_fkey";
ALTER TABLE "ToolifyToolFaq" RENAME CONSTRAINT "toolify_tool_faq_tool_id_fkey" TO "ToolifyToolFaq_tool_id_fkey";
ALTER TABLE "ToolifyToolTrafficSnapshot" RENAME CONSTRAINT "toolify_tool_traffic_snapshots_tool_id_fkey" TO "ToolifyToolTrafficSnapshot_tool_id_fkey";

-- RenameIndex
ALTER INDEX "toolify_tools_slug_key" RENAME TO "ToolifyTool_slug_key";
ALTER INDEX "toolify_categories_handle_key" RENAME TO "ToolifyCategory_handle_key";
ALTER INDEX "toolify_tool_traffic_snapshots_tool_id_snapshot_date_key" RENAME TO "ToolifyToolTrafficSnapshot_tool_id_snapshot_date_key";
