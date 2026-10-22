-- Delete tool translations that were saved as junk: the text "undefined" (or "null") in
-- the short description or in the features / use cases lists. Run on the server from the
-- project folder:
--
--   preview (changes nothing, prints what would go):
--     docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -P pager=off' < scripts/sql/clean-junk-tool-translations.sql
--   apply:
--     docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -P pager=off -v apply=1' < scripts/sql/clean-junk-tool-translations.sql
--
-- The whole row goes (not just the bad fields): the crawler's locale-sync translates every
-- tool that has no row in a language, from the English row, which is fine for these tools.
-- Emptying the fields instead would not be enough — the crawler skips a tool whose English
-- text has not changed since its last translation. Until then the site shows English there.
-- English rows and rows edited by hand (isManualOverride) are never touched.
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE junk ON COMMIT DROP AS
SELECT tt.id, tt."toolId", tt.locale
FROM "ToolTranslation" tt
WHERE tt.locale <> 'en'
  AND coalesce(tt."isManualOverride", false) = false
  AND (
    lower(trim(coalesce(tt."shortDesc", ''))) IN ('undefined', 'null')
    OR EXISTS (SELECT 1 FROM unnest(tt."coreFeatures") f WHERE lower(trim(coalesce(f, ''))) IN ('undefined', 'null'))
    OR EXISTS (SELECT 1 FROM unnest(tt."useCases") u WHERE lower(trim(coalesce(u, ''))) IN ('undefined', 'null'))
  );

\echo '=== Rows to delete, per language ==='
SELECT locale, count(*) AS rows FROM junk GROUP BY locale ORDER BY locale;

\echo '=== Totals ==='
SELECT count(*) AS rows, count(DISTINCT "toolId") AS tools FROM junk;

\echo '=== Tools without a good English row (would stay empty in other languages) ==='
SELECT DISTINCT tl.slug
FROM junk j JOIN "Tool" tl ON tl.id = j."toolId"
WHERE NOT EXISTS (
  SELECT 1 FROM "ToolTranslation" en
  WHERE en."toolId" = j."toolId" AND en.locale = 'en'
    AND lower(trim(coalesce(en."shortDesc", ''))) NOT IN ('', 'undefined', 'null')
)
LIMIT 20;

DELETE FROM "ToolTranslation" WHERE id IN (SELECT id FROM junk);

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
