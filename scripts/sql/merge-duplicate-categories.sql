-- Merge duplicate categories: the same category under several slugs ("ai-seo-tools",
-- "seo-tools", "seo") becomes one. Run on the server from the project folder:
--
--   preview (changes nothing, prints the plan):
--     docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -P pager=off' < scripts/sql/merge-duplicate-categories.sql
--   apply:
--     docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -P pager=off -v apply=1' < scripts/sql/merge-duplicate-categories.sql
--
-- Duplicates: categories with tools whose names are the same words once filler is
-- dropped ("AI", "tools", "software", plural "s"…; any word order, except around "to":
-- speech to text ≠ text to speech), plus the pairs in `extra`, minus the slugs in
-- `keep_apart`. Kept: the Toolify category (Toolify's tree is the one the groups follow),
-- else the one with the most tools.
--
-- For each duplicate: its tools, sub-categories, missing translations and views move to the
-- kept category. The duplicate itself stays, empty (the crawler finds categories by slug:
-- deleted, the tools it links there would lose that category); empty categories are hidden
-- on the site. The crawler may link new tools to it later: run this again, it merges those.

\set ON_ERROR_STOP on
BEGIN;

-- Same thing, different words: [duplicate slug, kept slug]. Unknown slugs are ignored.
CREATE TEMP TABLE extra (alias text, keep text) ON COMMIT DROP;
INSERT INTO extra VALUES
  ('link-in-bio', 'bio-link'),
  ('ai-workflow-automation', 'ai-workflow'),
  ('presentation-software', 'ai-presentation-generator'),
  ('ai-presentation-software', 'ai-presentation-generator'),
  ('presentations', 'ai-presentation-generator'),
  ('digital-whiteboards', 'whiteboard-ai'),
  ('testing-and-qa', 'ai-testing');

-- Same words, different things: never merged.
CREATE TEMP TABLE keep_apart (slug text) ON COMMIT DROP;
-- INSERT INTO keep_apart VALUES ('some-slug');

-- Categories in use and the words they're compared by.
CREATE TEMP TABLE k ON COMMIT DROP AS
SELECT c.id, c.slug, coalesce(nullif(trim(c.name), ''), replace(c.slug, '-', ' ')) AS name, c."parentId" AS parent_id,
       (SELECT count(*) FROM "_ToolToCategory" tc WHERE tc."A" = c.id)::int AS tools,
       EXISTS (SELECT 1 FROM "ToolifyCategory" t WHERE t.handle = c.slug) AS toolify
FROM "Category" c;
DELETE FROM k WHERE tools = 0;

ALTER TABLE k ADD COLUMN key text;
UPDATE k SET key = (
  WITH w AS (
    SELECT CASE WHEN length(x) > 3 THEN regexp_replace(x, 's$', '') ELSE x END AS x, n
    FROM regexp_split_to_table(lower(k.name), '[^a-z0-9]+') WITH ORDINALITY AS t(x, n)
    WHERE x <> '' AND x NOT IN ('ai', 'tool', 'tools', 'and', 'the', 'for', 'of', 'with', 'app', 'apps', 'software', 'platform', 'platforms')
  )
  SELECT CASE WHEN bool_or(x = 'to') THEN string_agg(x, ' ' ORDER BY n)
              ELSE array_to_string(ARRAY(SELECT DISTINCT x FROM w ORDER BY 1), ' ') END
  FROM w
);
UPDATE k SET key = 'keep:' || slug WHERE slug IN (SELECT slug FROM keep_apart) OR coalesce(key, '') = '';
UPDATE k a SET key = c.key FROM extra e JOIN k c ON c.slug = e.keep WHERE a.slug = e.alias;

-- The kept one per key, and every duplicate → its kept one.
CREATE TEMP TABLE keep ON COMMIT DROP AS
SELECT DISTINCT ON (key) key, id, slug, name, tools FROM k
ORDER BY key, toolify DESC, tools DESC, length(slug), slug;
CREATE TEMP TABLE merge_map ON COMMIT DROP AS
SELECT a.id AS alias_id, a.slug AS alias, a.name AS alias_name, a.tools AS alias_tools,
       p.id AS keep_id, p.slug AS keep, p.name AS keep_name, p.tools AS keep_tools
FROM k a JOIN keep p ON p.key = a.key
WHERE a.id <> p.id;

\echo '=== Plan: duplicate → kept (tools) ==='
SELECT keep_name || ' (' || keep || ', ' || keep_tools || ')' AS kept,
       string_agg(alias_name || ' (' || alias || ', ' || alias_tools || ')', '  |  ' ORDER BY alias_tools DESC) AS merged_into_it
FROM merge_map GROUP BY keep, keep_name, keep_tools ORDER BY count(*) DESC, keep;

\echo '=== Categories in use: now → after ==='
SELECT (SELECT count(*) FROM k) AS now, (SELECT count(*) FROM k) - (SELECT count(*) FROM merge_map) AS after,
       (SELECT count(*) FROM merge_map) AS duplicates;

-- 1. The kept one sitting under its duplicate takes the duplicate's place.
UPDATE "Category" c SET "parentId" = a."parentId"
FROM merge_map m JOIN "Category" a ON a.id = m.alias_id
WHERE c.id = m.keep_id AND c."parentId" = m.alias_id;
-- 2. Sub-categories of a duplicate hang under the kept one.
UPDATE "Category" ch SET "parentId" = m.keep_id
FROM merge_map m WHERE ch."parentId" = m.alias_id AND ch.id <> m.keep_id;
-- 3. Tools: onto the kept one (once), off the duplicate.
INSERT INTO "_ToolToCategory" ("A", "B")
SELECT m.keep_id, tc."B" FROM merge_map m JOIN "_ToolToCategory" tc ON tc."A" = m.alias_id
ON CONFLICT DO NOTHING;
DELETE FROM "_ToolToCategory" tc USING merge_map m WHERE tc."A" = m.alias_id;
-- 4. Translations the kept one lacks.
INSERT INTO "CategoryTranslation" (id, "categoryId", locale, name, description, "seoTitle", "seoDesc", "isManualOverride", updated_at)
SELECT 'm' || md5(m.alias_id || a.locale), m.keep_id, a.locale, a.name, a.description, a."seoTitle", a."seoDesc", false, now()
FROM merge_map m JOIN "CategoryTranslation" a ON a."categoryId" = m.alias_id
ON CONFLICT DO NOTHING;
-- 5. Views and the featured flag (the duplicate's views zeroed: a second run adds nothing).
UPDATE "Category" c SET "viewCount" = c."viewCount" + s.views, "isFeatured" = c."isFeatured" OR s.featured
FROM (SELECT m.keep_id, sum(a."viewCount") AS views, bool_or(a."isFeatured") AS featured
      FROM merge_map m JOIN "Category" a ON a.id = m.alias_id GROUP BY m.keep_id) s
WHERE c.id = s.keep_id;
UPDATE "Category" a SET "viewCount" = 0, "isFeatured" = false FROM merge_map m WHERE a.id = m.alias_id;

\echo '=== After: tool links per kept category (top 20) ==='
SELECT p.slug, (SELECT count(*) FROM "_ToolToCategory" tc WHERE tc."A" = p.keep_id) AS tools
FROM (SELECT DISTINCT keep_id, keep AS slug FROM merge_map) p ORDER BY 2 DESC LIMIT 20;

\if :{?apply}
  COMMIT;
  \echo '=== APPLIED ==='
\else
  ROLLBACK;
  \echo '=== PREVIEW ONLY: nothing changed. Add -v apply=1 to apply. ==='
\endif
