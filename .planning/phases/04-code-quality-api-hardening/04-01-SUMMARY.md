---
phase: 04-code-quality-api-hardening
plan: 01
subsystem: api
tags: [zod, validation, fetcher, security, ssrf]

# Dependency graph
requires:
  - phase: 01-foundation-safeguards
    provides: SWR fetcher at src/lib/fetcher.ts
provides:
  - Zod validation library installed and available
  - Shared parseIntParam and validateBody helpers for all API routes
  - Reusable Zod schemas (positiveInt, planIdParam, taskIdParam, companyIdParam)
  - BasePath-aware apiMutate helper for client-side mutations
  - SSRF-vulnerable sync endpoint removed
affects: [04-02, 04-03, 04-04]

# Tech tracking
tech-stack:
  added: [zod]
  removed: [idb]
  patterns: [structured-validation-errors, basepath-aware-mutations]

key-files:
  created:
    - src/lib/validations.ts
  modified:
    - src/lib/fetcher.ts
    - package.json
  deleted:
    - src/app/api/sync/route.ts

key-decisions:
  - "Used z.coerce.number() for param schemas to handle string-to-number coercion from URL params"
  - "apiMutate detects FormData to avoid overriding Content-Type for file uploads"

patterns-established:
  - "Validation error format: { error: 'Validation failed', details: [{ field, message }] }"
  - "parseIntParam returns discriminated union { value } | { error: NextResponse }"
  - "apiMutate auto-prepends /tracking basePath for all mutation calls"

requirements-completed: [QUAL-01, QUAL-02, QUAL-04, QUAL-05]

# Metrics
duration: 2min
completed: 2026-03-29
---

# Phase 04 Plan 01: Validation Infrastructure Summary

**Zod validation library with shared parseIntParam/validateBody helpers, basePath-aware apiMutate fetcher, and SSRF sync endpoint removal**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-29T01:51:37Z
- **Completed:** 2026-03-29T01:54:25Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Installed Zod for type-safe input validation across all API routes
- Created shared validation module with parseIntParam, validateBody, and reusable schemas
- Extended SWR fetcher with apiMutate helper that handles basePath and FormData detection
- Removed SSRF-vulnerable sync endpoint and unused idb dependency

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Zod, remove idb, delete sync route** - `684c065` (chore)
2. **Task 2: Create shared validation module and extend fetcher** - `f5876be` (feat)

## Files Created/Modified
- `src/lib/validations.ts` - Zod schemas, parseIntParam, validateBody helpers for API route validation
- `src/lib/fetcher.ts` - Extended with apiMutate for basePath-aware POST/PUT/PATCH/DELETE calls
- `package.json` - Added zod, removed idb
- `src/app/api/sync/route.ts` - Deleted (SSRF vulnerability via user-supplied path forwarding)

## Decisions Made
- Used z.coerce.number() for param schemas to handle automatic string-to-number coercion from URL params
- apiMutate detects FormData via instanceof check to avoid overriding Content-Type header (preserves multipart boundary for file uploads on import page)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All downstream plans (04-02, 04-03, 04-04) can now import from `@/lib/validations` and `@/lib/fetcher`
- Zod is available for schema definitions in route-specific validation
- apiMutate ready to replace inline fetch calls in client pages

## Self-Check: PASSED

- FOUND: src/lib/validations.ts
- FOUND: src/lib/fetcher.ts
- CONFIRMED DELETED: src/app/api/sync/route.ts
- COMMIT: 684c065 (Task 1)
- COMMIT: f5876be (Task 2)

---
*Phase: 04-code-quality-api-hardening*
*Completed: 2026-03-29*
