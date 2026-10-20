-- Report (changes nothing): the category tree as the site shows it, and groups /
-- categories that still look alike (half their words shared, or one's words all inside
-- the other's) — candidates for the `extra` list of merge-duplicate-categories.sql.
--   docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -P pager=off' < scripts/sql/category-report.sql

BEGIN; -- only temp tables are written, and it ends in ROLLBACK

CREATE TEMP TABLE cat ON COMMIT DROP AS
SELECT c.id, c.slug, c."parentId" AS parent_id, coalesce(nullif(trim(c.name), ''), replace(c.slug, '-', ' ')) AS name,
       (SELECT count(*) FROM "_ToolToCategory" tc JOIN "Tool" t ON t.id = tc."B" AND t.status = 'PUBLISHED' AND t."deletedAt" IS NULL WHERE tc."A" = c.id)::int AS tools,
       ARRAY(
         SELECT DISTINCT CASE WHEN length(x) > 3 THEN regexp_replace(x, 's$', '') ELSE x END
         FROM regexp_split_to_table(lower(coalesce(nullif(trim(c.name), ''), c.slug)), '[^a-z0-9]+') x
         WHERE x <> '' AND x NOT IN ('ai', 'tool', 'tools', 'and', 'the', 'for', 'of', 'with', 'app', 'apps', 'software', 'platform', 'platforms')
       ) AS words
FROM "Category" c;

-- Each category's top-level ancestor (as the site builds groups).
CREATE TEMP TABLE top ON COMMIT DROP AS
WITH RECURSIVE up AS (
  SELECT id AS start, id, parent_id, 0 AS depth FROM cat
  UNION ALL
  SELECT up.start, c.id, c.parent_id, up.depth + 1 FROM up JOIN cat c ON c.id = up.parent_id WHERE up.depth < 50
)
SELECT DISTINCT ON (start) start AS id, id AS top_id FROM up ORDER BY start, depth DESC;

CREATE TEMP TABLE grp ON COMMIT DROP AS
SELECT g.id, g.slug, g.name, g.words,
       (SELECT count(*) FROM top t JOIN cat c ON c.id = t.id WHERE t.top_id = g.id AND t.id <> g.id AND c.tools > 0) AS shown_children,
       (SELECT count(DISTINCT tc."B") FROM top t JOIN "_ToolToCategory" tc ON tc."A" = t.id
          JOIN "Tool" tl ON tl.id = tc."B" AND tl.status = 'PUBLISHED' AND tl."deletedAt" IS NULL
        WHERE t.top_id = g.id) AS tools
FROM cat g WHERE g.parent_id IS NULL AND EXISTS (SELECT 1 FROM top t WHERE t.top_id = g.id AND t.id <> g.id);
DELETE FROM grp WHERE tools = 0;

\echo '=== 1. Shown on the site ==='
SELECT (SELECT count(*) FROM grp) AS nhom,
       (SELECT count(*) FROM top t JOIN cat c ON c.id = t.id JOIN grp g ON g.id = t.top_id WHERE t.id <> g.id AND c.tools > 0) AS danh_muc_trong_nhom,
       (SELECT count(*) FROM cat c WHERE c.parent_id IS NULL AND c.tools > 0 AND NOT EXISTS (SELECT 1 FROM grp g WHERE g.id = c.id)) AS danh_muc_khac_other;

\echo '=== 1b. Groups (biggest first) ==='
SELECT name, slug, shown_children AS so_con, tools FROM grp ORDER BY tools DESC, name;

-- Look-alike pairs: share at least half their words, or one's words all inside the other's.
CREATE TEMP TABLE alike ON COMMIT DROP AS
SELECT a.id AS a_id, b.id AS b_id,
       round(cardinality(ARRAY(SELECT unnest(a.words) INTERSECT SELECT unnest(b.words)))::numeric
             / nullif(cardinality(ARRAY(SELECT unnest(a.words) UNION SELECT unnest(b.words))), 0), 2) AS score,
       (a.words <@ b.words OR b.words <@ a.words) AS contained
FROM cat a JOIN cat b ON a.id < b.id AND a.words && b.words
WHERE cardinality(a.words) > 0 AND cardinality(b.words) > 0;

\echo '=== 2. Groups that look alike ==='
SELECT ga.name || ' (' || ga.tools || ')' AS nhom_a, gb.name || ' (' || gb.tools || ')' AS nhom_b, l.score AS giong,
       CASE WHEN l.contained THEN 'chua tron' ELSE '' END AS ghi_chu
FROM alike l JOIN grp ga ON ga.id = l.a_id JOIN grp gb ON gb.id = l.b_id
WHERE l.score >= 0.5 OR l.contained
ORDER BY l.score DESC, ga.tools + gb.tools DESC
LIMIT 80;

\echo '=== 3. Categories (not groups) that look alike ==='
SELECT ca.name || ' (' || ca.slug || ', ' || ca.tools || ')' AS danh_muc_a,
       cb.name || ' (' || cb.slug || ', ' || cb.tools || ')' AS danh_muc_b, l.score AS giong,
       CASE WHEN l.contained THEN 'chua tron' ELSE '' END AS ghi_chu
FROM alike l JOIN cat ca ON ca.id = l.a_id JOIN cat cb ON cb.id = l.b_id
WHERE ca.tools > 0 AND cb.tools > 0
  AND NOT EXISTS (SELECT 1 FROM grp g WHERE g.id IN (ca.id, cb.id))
  AND (l.score >= 0.67 OR (l.contained AND least(cardinality(ca.words), cardinality(cb.words)) >= 2))
ORDER BY l.score DESC, ca.tools + cb.tools DESC
LIMIT 100;

\echo '=== 4. Counts ==='
SELECT
  (SELECT count(*) FROM alike l JOIN grp a ON a.id = l.a_id JOIN grp b ON b.id = l.b_id WHERE l.score >= 0.5 OR l.contained) AS cap_nhom_giong,
  (SELECT count(*) FROM alike l JOIN cat a ON a.id = l.a_id JOIN cat b ON b.id = l.b_id
    WHERE a.tools > 0 AND b.tools > 0 AND NOT EXISTS (SELECT 1 FROM grp g WHERE g.id IN (a.id, b.id))
      AND (l.score >= 0.67 OR (l.contained AND least(cardinality(a.words), cardinality(b.words)) >= 2))) AS cap_danh_muc_giong;

ROLLBACK;
