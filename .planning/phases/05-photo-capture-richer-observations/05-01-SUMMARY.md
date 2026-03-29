---
phase: 05-photo-capture-richer-observations
plan: 01
subsystem: api
tags: [sharp, photo-upload, formdata, site-walks, drizzle, sqlite]

# Dependency graph
requires: []
provides:
  - Photo upload API (FormData -> sharp resize -> disk + DB)
  - Photo serve API with immutable cache headers
  - Photo delete API with disk + DB cleanup
  - update_entry action for severity, percentComplete, notes
  - severity and percent_complete columns on site_walk_entries
affects: [05-02, 05-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Photo storage in data/photos/ with filename pattern {entryId}-{timestamp}.jpg"
    - "One photo per entry enforced via upsert (delete old before insert)"
    - "FormData parsing in Next.js API route for file uploads"

key-files:
  created:
    - src/app/api/site-walks/photos/route.ts
    - src/app/api/site-walks/[entryId]/photo/route.ts
  modified:
    - src/db/schema.ts
    - scripts/init-db.js
    - src/app/api/site-walks/route.ts

key-decisions:
  - "Used addColumnIfMissing pattern for migrations instead of raw try/catch ALTER TABLE"
  - "Photo URLs stored as filenames only, not full paths -- served via API route"

patterns-established:
  - "Photo upload pattern: FormData -> sharp resize -> data/photos/ + DB record"
  - "Discriminated union extension: new action types added to existing Zod schema"

requirements-completed: [PHOTO-02, PHOTO-03, OBS-01, OBS-02]

# Metrics
duration: 3min
completed: 2026-03-29
---

# Phase 05 Plan 01: Data Layer Summary

**Photo upload/serve/delete API with sharp resize pipeline, plus severity and percent_complete observation fields on site walk entries**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-29T15:26:33Z
- **Completed:** 2026-03-29T15:29:33Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Schema updated with severity (4-level enum) and percent_complete (0-100 integer) on siteWalkEntries
- Photo upload pipeline: FormData -> sharp resize (1920px original, 128px thumbnail) -> data/photos/ + DB
- Photo serving with immutable cache headers and original/thumbnail selection
- update_entry action for partial observation field updates (visual only, no scoring impact)

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration and Drizzle schema update** - `9a3c626` (feat)
2. **Task 2: Photo upload, serve, and delete API routes** - `497aa8d` (feat)
3. **Task 3: Add update_entry action to site-walks API** - `847bcbd` (feat)

## Files Created/Modified
- `src/db/schema.ts` - Added severity and percent_complete columns to siteWalkEntries
- `scripts/init-db.js` - Migration to add columns using addColumnIfMissing
- `src/app/api/site-walks/photos/route.ts` - POST (upload) and DELETE endpoints for photos
- `src/app/api/site-walks/[entryId]/photo/route.ts` - GET endpoint to serve photos
- `src/app/api/site-walks/route.ts` - Added update_entry action to discriminated union

## Decisions Made
- Used existing `addColumnIfMissing` helper pattern instead of raw try/catch ALTER TABLE for consistency with prior migrations
- Photo URLs stored as filenames only (not full paths) -- the API route constructs the full path at serve time

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all endpoints are fully wired to database and filesystem.

## Next Phase Readiness
- All API endpoints ready for Plan 03 (UI) to consume
- Photo upload accepts FormData with `photo` (File) and `entryId` (string)
- Photo serve returns binary JPEG with cache headers
- update_entry action accepts severity, percentComplete, notes via JSON POST

---
*Phase: 05-photo-capture-richer-observations*
*Completed: 2026-03-29*
