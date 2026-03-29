---
phase: 04-code-quality-api-hardening
plan: 04
subsystem: ui
tags: [swr, fetch, basepath, apiMutate, react]

# Dependency graph
requires:
  - phase: 04-01
    provides: SWR fetcher with apiMutate helper in src/lib/fetcher.ts
provides:
  - All 6 client pages migrated to SWR/apiMutate -- zero hardcoded /tracking/ fetch calls remain
  - D-07 satisfied: basePath references use helpers exclusively
affects: [all-client-pages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SWR for all client-side GET data loading with automatic basePath
    - apiMutate for all POST/PUT/PATCH mutations with automatic basePath
    - Dependent SWR chains (null key until dependency ready)

key-files:
  created: []
  modified:
    - src/app/settings/page.tsx
    - src/app/import/page.tsx
    - src/app/schedule/[planId]/page.tsx
    - src/app/schedule/[planId]/map/page.tsx
    - src/app/companies/page.tsx
    - src/app/schedule/[planId]/site-walk/page.tsx

key-decisions:
  - "Site-walk initial data load uses apiMutate GET in useEffect rather than SWR, since the page is step-based and doesn't benefit from SWR revalidation"
  - "Companies page uses dependent SWR chains: plan fetch first, then companies+activities after projectId available"

patterns-established:
  - "All client fetch calls go through SWR (reads) or apiMutate (writes) -- no direct fetch with /tracking/ prefix"

requirements-completed: [QUAL-04]

# Metrics
duration: 6min
completed: 2026-03-29
---

# Phase 04 Plan 04: SWR/apiMutate Migration Summary

**Migrated all 6 remaining client pages from hardcoded /tracking/ fetch calls to SWR reads and apiMutate writes -- zero hardcoded basePath references remain in client code**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-29T01:58:52Z
- **Completed:** 2026-03-29T02:04:30Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Settings page migrated to useSWR for delay weights loading + apiMutate for save
- Import page migrated to apiMutate for FormData upload (auto-skips Content-Type header)
- Schedule and map pages migrated to useSWR with dynamic filter-based keys
- Companies page migrated to dependent SWR chains (plan -> companies + activities) with apiMutate for all 6 mutation calls
- Site-walk page migrated all 9 hardcoded fetch calls to apiMutate
- D-07 fully satisfied: `grep -r "/tracking/api" src/app/ --include="*.tsx"` returns zero results

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate settings, import, schedule, map pages** - `60f628d` (feat)
2. **Task 2: Migrate companies and site-walk pages** - `58e0c91` (feat)

## Files Created/Modified
- `src/app/settings/page.tsx` - SWR for delay weights, apiMutate for PUT save
- `src/app/import/page.tsx` - apiMutate for FormData POST upload
- `src/app/schedule/[planId]/page.tsx` - SWR with dynamic filter params in key
- `src/app/schedule/[planId]/map/page.tsx` - SWR for plan data with onSuccess for building tab init
- `src/app/companies/page.tsx` - Dependent SWR chains + apiMutate for all CRUD operations
- `src/app/schedule/[planId]/site-walk/page.tsx` - apiMutate for all 9 fetch calls (creates, entries, completions, task updates, successor fetches)

## Decisions Made
- Site-walk page keeps useEffect for initial data load (apiMutate with GET) rather than SWR, since the step-based workflow doesn't benefit from SWR revalidation and the data is loaded once on mount
- Companies page uses dependent SWR chains with null keys for conditional fetching, matching the pattern established in scorecard page

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All client pages now use centralized basePath handling via fetcher.ts
- If basePath changes from /tracking, only fetcher.ts needs updating
- QUAL-04 requirement fully satisfied

## Self-Check: PASSED

All 6 modified files verified on disk. Both task commits (60f628d, 58e0c91) verified in git log.

---
*Phase: 04-code-quality-api-hardening*
*Completed: 2026-03-29*
