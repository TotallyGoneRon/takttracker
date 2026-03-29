---
phase: 04-code-quality-api-hardening
plan: 03
subsystem: api
tags: [drizzle, zod, n+1, query-optimization, validation, sqlite]

# Dependency graph
requires:
  - phase: 04-code-quality-api-hardening/01
    provides: shared validations module (parseIntParam, validateBody, positiveInt)
provides:
  - N+1 query fixes for companies, flags, and site-walks routes
  - Zod validation on all 3 complex routes (GET and POST/PATCH)
  - Discriminated union pattern for multi-action POST endpoints
affects: [api, site-walks, companies, flags]

# Tech tracking
tech-stack:
  added: []
  patterns: [LEFT JOIN + GROUP BY for aggregation, batch inArray + Map for N+1 elimination, discriminated union Zod schema for multi-action endpoints]

key-files:
  created: []
  modified:
    - src/app/api/companies/route.ts
    - src/app/api/plans/[planId]/flags/route.ts
    - src/app/api/site-walks/route.ts

key-decisions:
  - "Companies uses LEFT JOIN + GROUP BY for task counts instead of N*M nested loops"
  - "Flags and site-walks use batch inArray + Map pattern for related data lookup"
  - "Site-walks POST uses Zod discriminatedUnion for type-safe action dispatch"
  - "varianceCode validated as enum to match schema constraint"

patterns-established:
  - "Batch inArray + Map: fetch all related records in one query, build lookup Map, enrich in memory"
  - "Discriminated union: multi-action POST endpoints use z.discriminatedUnion for per-action validation"

requirements-completed: [QUAL-01, QUAL-02, QUAL-03]

# Metrics
duration: 2min
completed: 2026-03-29
---

# Phase 4 Plan 3: N+1 Query Fixes Summary

**Eliminated N+1 queries in 3 routes (companies, flags, site-walks) using JOIN/batch patterns and added Zod validation to all inputs**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-29T01:58:57Z
- **Completed:** 2026-03-29T02:01:23Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Companies route reduced from N*M queries to 1 query via LEFT JOIN + GROUP BY
- Flags route reduced from N+1 queries to 2 queries via batch inArray + Map lookup
- Site-walks GET reduced from N+1 queries to 2 queries via batch inArray + entryMap grouping
- All 3 routes now validate inputs with Zod (parseIntParam, validateBody, discriminatedUnion)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix companies N+1 and add Zod validation** - `5edb1bc` (feat)
2. **Task 2: Fix flags and site-walks N+1 and add Zod validation** - `12ba3ec` (feat)

## Files Created/Modified
- `src/app/api/companies/route.ts` - LEFT JOIN + GROUP BY replacing nested loops; Zod validation on GET/POST
- `src/app/api/plans/[planId]/flags/route.ts` - Batch inArray replacing Promise.all; Zod validation on GET/PATCH
- `src/app/api/site-walks/route.ts` - Batch inArray + entryMap replacing Promise.all; discriminatedUnion Zod schema for POST

## Decisions Made
- Used LEFT JOIN + GROUP BY for companies (single query aggregation vs batch pattern) since it maps naturally to count aggregation
- Used batch inArray + Map for flags and site-walks since these need full related records (not just counts)
- Added varianceCode as z.enum matching the schema constraint to prevent TypeScript type errors
- Wrapped site-walks POST in try/catch for error safety (Rule 2: missing error handling)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed varianceCode type mismatch**
- **Found during:** Task 2 (site-walks route)
- **Issue:** Plan used `z.string().optional()` for varianceCode, but schema defines it as enum column, causing TypeScript error
- **Fix:** Changed to `z.enum(['labor', 'material', 'prep', 'design', 'weather', 'inspection', 'prerequisite', 'other']).optional()`
- **Files modified:** src/app/api/site-walks/route.ts
- **Verification:** `npx tsc --noEmit` passes with no errors in modified files
- **Committed in:** 12ba3ec (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Type-safe enum validation matches database schema constraint. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all routes are fully wired with real queries and validation.

## Next Phase Readiness
- All 3 complex routes optimized and validated
- Combined with Plan 02 (simple routes), all API routes now have Zod validation
- Ready for Plan 04 (Wave 2 remainder) if applicable

---
*Phase: 04-code-quality-api-hardening*
*Completed: 2026-03-29*
