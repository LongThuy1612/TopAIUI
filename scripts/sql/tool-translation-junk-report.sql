-- Read only: tool translations holding junk ("undefined", "null", empty) instead of real text,
-- per language. The site now falls back to English for such fields (server/api/tools/[slug].get.ts).
\set ON_ERROR_STOP on

\echo '=== Junk fields per language ==='
WITH t AS (
  SELECT tt.locale,
         lower(trim(coalesce(tt."shortDesc", 'x'))) IN ('undefined', 'null', 'none', 'n/a') AS short_junk,
         lower(trim(coalesce(tt."whatIs", 'x'))) IN ('undefined', 'null', 'none', 'n/a') AS whatis_junk,
         lower(trim(coalesce(tt."howToUse", 'x'))) IN ('undefined', 'null', 'none', 'n/a') AS howto_junk,
         EXISTS (SELECT 1 FROM unnest(tt."coreFeatures") f WHERE lower(trim(coalesce(f, ''))) IN ('', 'undefined', 'null')) AS features_junk,
         EXISTS (SELECT 1 FROM unnest(tt."useCases") u WHERE lower(trim(coalesce(u, ''))) IN ('', 'undefined', 'null')) AS usecases_junk
  FROM "ToolTranslation" tt
  JOIN "Tool" tl ON tl.id = tt."toolId" AND tl.status = 'PUBLISHED' AND tl."deletedAt" IS NULL
)
SELECT locale,
       count(*) FILTER (WHERE short_junk) AS short_desc,
       count(*) FILTER (WHERE whatis_junk) AS what_is,
       count(*) FILTER (WHERE howto_junk) AS how_to_use,
       count(*) FILTER (WHERE features_junk) AS core_features,
       count(*) FILTER (WHERE usecases_junk) AS use_cases
FROM t GROUP BY locale ORDER BY locale;

\echo '=== A few tools (to look at on the site) ==='
SELECT tl.slug, tt.locale
FROM "ToolTranslation" tt
JOIN "Tool" tl ON tl.id = tt."toolId" AND tl.status = 'PUBLISHED' AND tl."deletedAt" IS NULL
WHERE EXISTS (SELECT 1 FROM unnest(tt."coreFeatures") f WHERE lower(trim(coalesce(f, ''))) = 'undefined')
ORDER BY tl."upvoteCount" DESC NULLS LAST
LIMIT 15;
