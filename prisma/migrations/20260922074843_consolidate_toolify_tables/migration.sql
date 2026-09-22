/*
  Warnings:

  - You are about to drop the `ToolifyCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ToolifyToolCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ToolifyToolCoreFeature` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ToolifyToolFaq` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ToolifyToolPricingPlan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ToolifyToolTrafficSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ToolifyToolUseCase` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ToolifyToolCategory" DROP CONSTRAINT "ToolifyToolCategory_category_id_fkey";

-- DropForeignKey
ALTER TABLE "ToolifyToolCategory" DROP CONSTRAINT "ToolifyToolCategory_tool_id_fkey";

-- DropForeignKey
ALTER TABLE "ToolifyToolCoreFeature" DROP CONSTRAINT "ToolifyToolCoreFeature_tool_id_fkey";

-- DropForeignKey
ALTER TABLE "ToolifyToolFaq" DROP CONSTRAINT "ToolifyToolFaq_tool_id_fkey";

-- DropForeignKey
ALTER TABLE "ToolifyToolPricingPlan" DROP CONSTRAINT "ToolifyToolPricingPlan_tool_id_fkey";

-- DropForeignKey
ALTER TABLE "ToolifyToolTrafficSnapshot" DROP CONSTRAINT "ToolifyToolTrafficSnapshot_tool_id_fkey";

-- DropForeignKey
ALTER TABLE "ToolifyToolUseCase" DROP CONSTRAINT "ToolifyToolUseCase_tool_id_fkey";

-- AlterTable
ALTER TABLE "ToolifyTool" ADD COLUMN     "categories" JSONB,
ADD COLUMN     "core_features" JSONB,
ADD COLUMN     "faqs" JSONB,
ADD COLUMN     "pricing_plans" JSONB,
ADD COLUMN     "traffic_snapshots" JSONB,
ADD COLUMN     "use_cases" JSONB;

-- DropTable
DROP TABLE "ToolifyCategory";

-- DropTable
DROP TABLE "ToolifyToolCategory";

-- DropTable
DROP TABLE "ToolifyToolCoreFeature";

-- DropTable
DROP TABLE "ToolifyToolFaq";

-- DropTable
DROP TABLE "ToolifyToolPricingPlan";

-- DropTable
DROP TABLE "ToolifyToolTrafficSnapshot";

-- DropTable
DROP TABLE "ToolifyToolUseCase";
