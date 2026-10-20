-- Merge duplicate categories: the same category under several slugs ("ai-seo-tools",
-- "seo-tools", "seo") becomes one. Run on the server from the project folder:
--
--   preview (changes nothing, prints the plan):
--     docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -P pager=off' < scripts/sql/merge-duplicate-categories.sql
--   apply:
--     docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -P pager=off -v apply=1' < scripts/sql/merge-duplicate-categories.sql
--
-- Duplicates: categories in use (with tools, or with categories under them — a group)
-- whose names are the same words once filler is
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
  ('testing-and-qa', 'ai-testing'),
  ('development-it', 'development-it-infrastructure'),
  ('development-it-tech-infrastructure', 'development-it-infrastructure'),
  ('development-it-operations', 'development-it-infrastructure');

-- Same words, different things: never merged.
CREATE TEMP TABLE keep_apart (slug text) ON COMMIT DROP;
-- INSERT INTO keep_apart VALUES ('some-slug');

-- Every category and the words it's compared by; `k` below keeps those in use — with
-- tools, or a group with categories under it.
CREATE TEMP TABLE allc ON COMMIT DROP AS
SELECT c.id, c.slug, coalesce(nullif(trim(c.name), ''), replace(c.slug, '-', ' ')) AS name, c."parentId" AS parent_id,
       (SELECT count(*) FROM "_ToolToCategory" tc WHERE tc."A" = c.id)::int AS tools,
       EXISTS (SELECT 1 FROM "ToolifyCategory" t WHERE t.handle = c.slug) AS toolify,
       (SELECT count(*) FROM "Category" ch WHERE ch."parentId" = c.id)::int AS children
FROM "Category" c;

ALTER TABLE allc ADD COLUMN key text;
UPDATE allc k SET key = (
  WITH w AS (
    SELECT CASE WHEN length(x) > 3 THEN regexp_replace(x, 's$', '') ELSE x END AS x, n
    FROM regexp_split_to_table(lower(k.name), '[^a-z0-9]+') WITH ORDINALITY AS t(x, n)
    WHERE x <> '' AND x NOT IN ('ai', 'tool', 'tools', 'and', 'the', 'for', 'of', 'with', 'app', 'apps', 'software', 'platform', 'platforms')
  )
  SELECT CASE WHEN bool_or(x = 'to') THEN string_agg(x, ' ' ORDER BY n)
              ELSE array_to_string(ARRAY(SELECT DISTINCT x FROM w ORDER BY 1), ' ') END
  FROM w
);
UPDATE allc SET key = 'keep:' || slug WHERE slug IN (SELECT slug FROM keep_apart) OR coalesce(key, '') = '';
-- `extra` must be unambiguous: no chain (a → b and b → c: write a → c), and two duplicates
-- with the same words can't go to two different kept categories. Otherwise: stop.
DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(a.alias || ' -> ' || a.keep || ' -> ' || b.keep, ', ') INTO bad
  FROM extra a JOIN extra b ON b.alias = a.keep;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'extra has a chain (point it at the last one): %', bad;
  END IF;
  SELECT string_agg(x.slug || ' -> ' || e.keep, ', ') INTO bad
  FROM extra e JOIN allc x ON x.slug = e.alias JOIN allc c ON c.slug = e.keep
  WHERE x.key IN (
    SELECT x2.key FROM extra e2 JOIN allc x2 ON x2.slug = e2.alias JOIN allc c2 ON c2.slug = e2.keep
    GROUP BY x2.key HAVING count(DISTINCT c2.key) > 1
  );
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'extra sends duplicates with the same words to different categories: %', bad;
  END IF;
END $$;

-- An `extra` duplicate joins the kept one's cluster, and so does everything with its own
-- words (its own duplicates: "Development and IT Operations" goes along with "Development
-- & IT Operations"). One statement: every row compares against the keys as they were.
UPDATE allc a SET key = c.key
FROM extra e JOIN allc x ON x.slug = e.alias JOIN allc c ON c.slug = e.keep
WHERE a.key = x.key;

CREATE TEMP TABLE k ON COMMIT DROP AS SELECT * FROM allc WHERE tools > 0 OR children > 0;

-- The kept one per key, and every duplicate → its kept one.
CREATE TEMP TABLE keep ON COMMIT DROP AS
SELECT DISTINCT ON (key) key, id, slug, name, tools, children FROM k
-- A slug named as the one to keep in `extra` wins; then Toolify, then the most tools.
ORDER BY key, (slug IN (SELECT keep FROM extra)) DESC, toolify DESC, tools DESC, length(slug), slug;
CREATE TEMP TABLE merge_map ON COMMIT DROP AS
SELECT a.id AS alias_id, a.slug AS alias, a.name AS alias_name, a.tools AS alias_tools, a.children AS alias_children,
       p.id AS keep_id, p.slug AS keep, p.name AS keep_name, p.tools AS keep_tools, p.children AS keep_children
FROM k a JOIN keep p ON p.key = a.key
WHERE a.id <> p.id;

-- "(slug, tools)", plus "+N sub" for a group: its sub-categories move along with it.
\echo '=== Plan: duplicate -> kept (slug, tools, +sub-categories) ==='
SELECT keep_name || ' (' || keep || ', ' || keep_tools || CASE WHEN keep_children > 0 THEN ', +' || keep_children || ' sub' ELSE '' END || ')' AS kept,
       string_agg(alias_name || ' (' || alias || ', ' || alias_tools || CASE WHEN alias_children > 0 THEN ', +' || alias_children || ' sub' ELSE '' END || ')', '  |  ' ORDER BY alias_tools DESC) AS merged_into_it
FROM merge_map GROUP BY keep, keep_name, keep_tools, keep_children ORDER BY count(*) DESC, keep;

\echo '=== Categories in use: now -> after ==='
SELECT (SELECT count(*) FROM k) AS now, (SELECT count(*) FROM k) - (SELECT count(*) FROM merge_map) AS after,
       (SELECT count(*) FROM merge_map) AS duplicates;

-- 1. The kept one somewhere under one of its duplicates (A > X > kept) moves up to the
--    place of the highest such duplicate — otherwise step 2 would hang X under the kept
--    one while the kept one still hangs under X: a loop.
WITH RECURSIVE up AS (
  SELECT k.id AS keep_id, k."parentId" AS id, 1 AS depth FROM "Category" k WHERE k.id IN (SELECT keep_id FROM merge_map)
  UNION ALL
  SELECT up.keep_id, c."parentId", up.depth + 1 FROM up JOIN "Category" c ON c.id = up.id
  WHERE up.id IS NOT NULL AND up.depth < 50
), top_alias AS (
  SELECT DISTINCT ON (up.keep_id) up.keep_id, up.id AS alias_id
  FROM up JOIN merge_map m ON m.keep_id = up.keep_id AND m.alias_id = up.id
  ORDER BY up.keep_id, up.depth DESC
)
UPDATE "Category" c SET "parentId" = a."parentId"
FROM top_alias t JOIN "Category" a ON a.id = t.alias_id
WHERE c.id = t.keep_id;
-- 2. Sub-categories of a duplicate hang under the kept one.
UPDATE "Category" ch SET "parentId" = m.keep_id
FROM merge_map m WHERE ch."parentId" = m.alias_id AND ch.id <> m.keep_id;
-- 3. Tools: onto the kept one (once), off the duplicate.
INSERT INTO "_ToolToCategory" ("A", "B")
SELECT m.keep_id, tc."B" FROM merge_map m JOIN "_ToolToCategory" tc ON tc."A" = m.alias_id
ON CONFLICT DO NOTHING;
DELETE FROM "_ToolToCategory" tc USING merge_map m WHERE tc."A" = m.alias_id;
-- 4. Translations the kept one lacks — whole languages, and descriptions it has none of.
UPDATE "CategoryTranslation" kt SET description = at.description
FROM merge_map m JOIN "CategoryTranslation" at ON at."categoryId" = m.alias_id
WHERE kt."categoryId" = m.keep_id AND kt.locale = at.locale
  AND coalesce(kt.description, '') = '' AND coalesce(at.description, '') <> '';
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

-- 6. Duplicate slug → kept slug, for the crawler (it links tools by the source's slug):
--    this run's merges, and the empty duplicates of earlier runs (same words as a kept
--    category). Rebuilt whole on every run from the lists above, so a slug added to
--    `keep_apart` or a pair taken out of `extra` stops being followed. Always a kept
--    category on the right: never a chain. (The crawler keeps reading the old table
--    until this transaction commits.)
DELETE FROM "CategoryAlias";
INSERT INTO "CategoryAlias" (alias_slug, keep_slug)
SELECT e.slug, p.slug FROM allc e JOIN keep p ON p.key = e.key
WHERE e.id <> p.id AND e.key NOT LIKE 'keep:%';
\echo '=== Aliases the crawler follows ==='
SELECT count(*) AS aliases FROM "CategoryAlias";

-- Safety net: no category may end up its own ancestor. A loop aborts the whole run
-- (nothing is changed).
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
    RAISE EXCEPTION 'Merge would leave % categories in a parent loop: nothing changed.', loops;
  END IF;
END $$;

\echo '=== After: tool links per kept category (top 20) ==='
SELECT p.slug, (SELECT count(*) FROM "_ToolToCategory" tc WHERE tc."A" = p.keep_id) AS tools
FROM (SELECT DISTINCT keep_id, keep AS slug FROM merge_map) p ORDER BY 2 DESC LIMIT 20;

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
