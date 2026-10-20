-- Regroup the category tree under Toolify's groups (Writing & Editing, Coding & Development…).
-- The old pipeline made ~100 overlapping top-level groups ("marketing sales", "Marketing,
-- Sales & Business", "Business, Marketing & Operations"…) and hung Toolify's own categories
-- under them. After this, the top level is Toolify's groups (plus "other"):
--   1. Toolify's groups become top-level;
--   2. Toolify's categories go back under their Toolify group;
--   3. each old group (the `regroup` list below) hangs under one Toolify group, with
--      everything under it.
-- Nothing is deleted and no tool link changes; only Category."parentId". Run after
-- merge-duplicate-categories.sql (it resolves merged slugs through "CategoryAlias").
--
--   preview: docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -P pager=off' < scripts/sql/regroup-categories.sql
--   apply:   docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -P pager=off -v apply=1' < scripts/sql/regroup-categories.sql
--
-- Re-runnable. The crawler only fills an empty parent, so it doesn't undo this.

\set ON_ERROR_STOP on
BEGIN;

-- Old group → the Toolify group it goes under. Unknown slugs are ignored.
CREATE TEMP TABLE regroup (old text, grp text) ON COMMIT DROP;
INSERT INTO regroup VALUES
  -- Marketing & Advertising
  ('marketing-sales', 'marketing-advertising'),
  ('marketing-sales-business', 'marketing-advertising'),
  ('marketing-business', 'marketing-advertising'),
  ('marketing-sales-customer-success', 'marketing-advertising'),
  ('marketing-sales-crm', 'marketing-advertising'),
  ('marketing-business-growth', 'marketing-advertising'),
  ('marketing-sales-customer-experience', 'marketing-advertising'),
  ('e-commerce-sales', 'marketing-advertising'),
  ('marketing-sales-automation', 'marketing-advertising'),
  ('marketing-seo', 'marketing-advertising'),
  ('marketing-sales-business-operations', 'marketing-advertising'),
  ('e-commerce-retail', 'marketing-advertising'),
  -- Business Management
  ('business-marketing-operations', 'business-management'),
  ('productivity-business-operations', 'business-management'),
  ('business-productivity', 'business-management'),
  ('business-operations-hr', 'business-management'),
  ('business-operations-finance', 'business-management'),
  ('business-operations-management', 'business-management'),
  ('business-operations-collaboration', 'business-management'),
  ('business-marketing-finance', 'business-management'),
  ('construction-specialized-management', 'business-management'),
  ('retail-hospitality-management', 'business-management'),
  ('industry-solutions-construction-health-food', 'business-management'),
  -- Coding & Development
  ('data-software-development', 'coding-development'),
  ('development-it-infrastructure', 'coding-development'),
  ('development-infrastructure-data', 'coding-development'),
  ('code-data-development', 'coding-development'),
  ('technology-development', 'coding-development'),
  ('developer-ai-infrastructure', 'coding-development'),
  ('development-tech-tools', 'coding-development'),
  ('code-development', 'coding-development'),
  ('software-development-qa', 'coding-development'),
  ('it-infrastructure-cybersecurity', 'coding-development'),
  ('cybersecurity-it-operations', 'coding-development'),
  -- Office & Productivity
  ('productivity-technology', 'office-productivity'),
  ('ai-assistants-intelligence', 'office-productivity'),
  ('productivity-professional-tools', 'office-productivity'),
  ('productivity-management', 'office-productivity'),
  ('productivity-workflow', 'office-productivity'),
  ('productivity-collaboration', 'office-productivity'),
  ('productivity-knowledge', 'office-productivity'),
  -- Writing & Editing
  ('writing-productivity-lifestyle', 'writing-editing'),
  ('writing-content-creation', 'writing-editing'),
  ('writing-content-social-media', 'writing-editing'),
  ('writing-content', 'writing-editing'),
  ('writing-communication', 'writing-editing'),
  ('content-writing-translation', 'writing-editing'),
  ('writing-knowledge-research', 'writing-editing'),
  ('ai-content-generation', 'writing-editing'),
  ('content-writing-marketing', 'writing-editing'),
  ('content-creation-generative-writing', 'writing-editing'),
  -- Art & Creative Design
  ('design-visual-media', 'art-creative-design'),
  ('design-media-creative', 'art-creative-design'),
  ('design-media-entertainment', 'art-creative-design'),
  ('content-creation-generative-media', 'art-creative-design'),
  ('image-graphic-design', 'art-creative-design'),
  ('image-design-creative', 'art-creative-design'),
  ('design-visual-arts', 'art-creative-design'),
  -- Image Generation & Editing
  ('design-image-video', 'image-generation-editing'),
  ('image-visual-design', 'image-generation-editing'),
  ('image-design', 'image-generation-editing'),
  -- Video & Animation
  ('video-audio-ai', 'video-animation'),
  ('video-audio-music', 'video-animation'),
  ('media-entertainment', 'video-animation'),
  ('video-audio-production', 'video-animation'),
  -- Music & Audio / Voice
  ('audio-music-voice', 'music-audio'),
  ('voice-audio-intelligence', 'voice-generation-conversion'),
  ('voice-ai-tools', 'voice-generation-conversion'),
  -- Social Media
  ('communication-social-specialized-tech', 'social-media'),
  -- Education & Translation
  ('education-lifestyle-productivity', 'education-translation'),
  ('productivity-education', 'education-translation'),
  ('education-gaming-entertainment', 'education-translation'),
  ('education-learning', 'education-translation'),
  -- Research & Data Analysis
  ('data-analytics-research', 'research-data-analysis'),
  ('data-intelligence-security', 'research-data-analysis'),
  ('scientific-research-development', 'research-data-analysis'),
  -- Health & Wellness
  ('health-fitness-education', 'health-wellness'),
  ('life-education-health', 'health-wellness'),
  -- Legal & Finance
  ('personal-finance-productivity', 'legal-finance'),
  ('business-finance', 'legal-finance'),
  ('finance-legal', 'legal-finance'),
  ('finance-hr-compliance', 'legal-finance'),
  ('fintech-banking', 'legal-finance'),
  ('legal-tech', 'legal-finance'),
  -- Daily Life
  ('lifestyle-education-finance', 'daily-life'),
  ('travel-lifestyle', 'daily-life'),
  ('gaming-travel-entertainment', 'daily-life'),
  ('lifestyle-sports-entertainment', 'daily-life'),
  ('lifestyle-personal-care', 'daily-life'),
  ('entertainment-lifestyle-gaming', 'daily-life'),
  ('family', 'daily-life'),
  ('entertainment-faith-community', 'daily-life');

-- A slug of a merged duplicate stands for the category kept.
CREATE TEMP TABLE alias ON COMMIT DROP AS SELECT alias_slug, keep_slug FROM "CategoryAlias";
CREATE TEMP TABLE resolved ON COMMIT DROP AS
SELECT c.slug, coalesce(k.id, c.id) AS id, coalesce(k.slug, c.slug) AS real_slug
FROM "Category" c LEFT JOIN alias a ON a.alias_slug = c.slug LEFT JOIN "Category" k ON k.slug = a.keep_slug;

-- Toolify's groups and categories (by their real, kept category).
CREATE TEMP TABLE tf_group ON COMMIT DROP AS
SELECT DISTINCT r.id, r.real_slug AS slug FROM "ToolifyCategory" t JOIN resolved r ON r.slug = t.handle
WHERE t.parent_category_id IS NULL;
CREATE TEMP TABLE tf_leaf ON COMMIT DROP AS
SELECT DISTINCT ON (r.id) r.id, r.real_slug AS slug, pr.id AS parent_id
FROM "ToolifyCategory" t
JOIN "ToolifyCategory" p ON p.category_id = t.parent_category_id
JOIN resolved r ON r.slug = t.handle
JOIN resolved pr ON pr.slug = p.handle
WHERE r.id <> pr.id                                   -- never its own parent
  AND NOT EXISTS (SELECT 1 FROM alias a WHERE a.alias_slug = t.handle)  -- a merged duplicate stays empty where it is
  AND r.id NOT IN (SELECT id FROM tf_group)
ORDER BY r.id;

CREATE TEMP TABLE moves ON COMMIT DROP AS
SELECT o.id, o.slug, g.id AS grp_id, g.slug AS grp_slug
FROM regroup m JOIN resolved ro ON ro.slug = m.old JOIN "Category" o ON o.id = ro.id
JOIN resolved rg ON rg.slug = m.grp JOIN "Category" g ON g.id = rg.id
WHERE o.id <> g.id AND o.id NOT IN (SELECT id FROM tf_group)
  -- Toolify's structure wins: an entry that resolves to one of Toolify's own categories
  -- (an old group merged into it) leaves it under its Toolify group.
  AND o.id NOT IN (SELECT id FROM tf_leaf);

\echo '=== Toolify groups found (top level after this) ==='
SELECT string_agg(slug, ', ' ORDER BY slug) AS groups, count(*) FROM tf_group;
\echo '=== regroup: targets that are not a Toolify group (fix the list) ==='
SELECT DISTINCT m.grp FROM regroup m WHERE m.grp NOT IN (SELECT r.slug FROM tf_group g JOIN resolved r ON r.id = g.id);
\echo '=== regroup: old groups not found (skipped) ==='
SELECT m.old FROM regroup m WHERE NOT EXISTS (SELECT 1 FROM resolved r WHERE r.slug = m.old);
\echo '=== regroup: entries that are Toolify categories, left under their Toolify group (skipped) ==='
SELECT m.old, r.real_slug FROM regroup m JOIN resolved r ON r.slug = m.old
WHERE r.id IN (SELECT id FROM tf_leaf UNION SELECT id FROM tf_group);

-- 1. Toolify's groups at the top.
UPDATE "Category" c SET "parentId" = NULL FROM tf_group g WHERE c.id = g.id AND c."parentId" IS NOT NULL;
-- 2. Toolify's categories under their Toolify group.
UPDATE "Category" c SET "parentId" = l.parent_id FROM tf_leaf l
WHERE c.id = l.id AND c."parentId" IS DISTINCT FROM l.parent_id;
-- 3. Old groups under their Toolify group (with everything under them).
UPDATE "Category" c SET "parentId" = m.grp_id FROM moves m
WHERE c.id = m.id AND c."parentId" IS DISTINCT FROM m.grp_id;

-- Safety net: no category may end up its own ancestor. A loop aborts the whole run.
DO $$
DECLARE loops int;
BEGIN
  WITH RECURSIVE walk AS (
    SELECT id AS start, "parentId" AS id, 1 AS depth FROM "Category" WHERE "parentId" IS NOT NULL
    UNION ALL
    SELECT w.start, c."parentId", w.depth + 1 FROM walk w JOIN "Category" c ON c.id = w.id
    WHERE c."parentId" IS NOT NULL AND w.id <> w.start AND w.depth < 50
  )
  SELECT count(DISTINCT start) INTO loops FROM walk WHERE id = start;
  IF loops > 0 THEN
    RAISE EXCEPTION 'Regroup would leave % categories in a parent loop: nothing changed.', loops;
  END IF;
END $$;

-- What the site shows afterwards: top-level categories with something under them.
\echo '=== After: groups on the site (top-level with sub-categories), tools in each ==='
WITH RECURSIVE up AS (
  SELECT id AS start, id, "parentId", 0 AS depth FROM "Category"
  UNION ALL
  SELECT up.start, c.id, c."parentId", up.depth + 1 FROM up JOIN "Category" c ON c.id = up."parentId" WHERE up.depth < 50
), top AS (SELECT DISTINCT ON (start) start AS id, id AS top_id FROM up ORDER BY start, depth DESC)
SELECT g.slug, coalesce(nullif(g.name, ''), g.slug) AS name,
       count(DISTINCT t.id) FILTER (WHERE t.id <> g.id) AS under_it,
       count(DISTINCT tc."B") AS tools
FROM "Category" g JOIN top t ON t.top_id = g.id
LEFT JOIN "_ToolToCategory" tc ON tc."A" = t.id
WHERE g."parentId" IS NULL
GROUP BY g.id, g.slug, g.name
HAVING count(DISTINCT t.id) > 1 AND count(DISTINCT tc."B") > 0
ORDER BY tools DESC;

\echo '=== Counts ==='
SELECT (SELECT count(*) FROM tf_group) AS toolify_groups, (SELECT count(*) FROM tf_leaf) AS toolify_categories, (SELECT count(*) FROM moves) AS old_groups_moved;

-- Only -v apply=1 (or true/on/yes) commits; no variable, or apply=0, is a preview.
\if :{?apply}
  \if :apply
    COMMIT;
    \echo '=== APPLIED ==='
  \else
    ROLLBACK;
    \echo '=== PREVIEW ONLY: nothing changed. Add -v apply=1 to apply. ==='
  \endif
\else
  ROLLBACK;
  \echo '=== PREVIEW ONLY: nothing changed. Add -v apply=1 to apply. ==='
\endif
