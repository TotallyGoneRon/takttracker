---
phase: 05-photo-capture-richer-observations
plan: 03
subsystem: ui
tags: [react, camera, photo-upload, site-walk, mobile]

requires:
  - phase: 05-01
    provides: photo API routes, update_entry action, schema columns
  - phase: 05-02
    provides: extracted site-walk components, types.ts, ZoneTaskList

provides:
  - EntryCard with expand/collapse and status badges
  - EntryDetailPanel with photo capture, severity, percent complete, notes
  - PhotoCapture, PhotoThumbnail, PhotoOverlay components
  - SeverityPicker and PercentComplete components
  - Full photo/observation wiring from UI to API

affects: [phase-6-walk-summary, phase-7-walk-history]

tech-stack:
  added: []
  patterns: [conditional-render-for-collapse, lifted-photo-state, accordion-entry-cards]

key-files:
  created:
    - src/app/schedule/[planId]/site-walk/_components/EntryCard.tsx
    - src/app/schedule/[planId]/site-walk/_components/EntryDetailPanel.tsx
    - src/app/schedule/[planId]/site-walk/_components/PhotoCapture.tsx
    - src/app/schedule/[planId]/site-walk/_components/PhotoThumbnail.tsx
    - src/app/schedule/[planId]/site-walk/_components/PhotoOverlay.tsx
    - src/app/schedule/[planId]/site-walk/_components/SeverityPicker.tsx
    - src/app/schedule/[planId]/site-walk/_components/PercentComplete.tsx
  modified:
    - src/app/schedule/[planId]/site-walk/_components/ZoneTaskList.tsx
    - src/app/schedule/[planId]/site-walk/_components/types.ts
    - src/app/schedule/[planId]/site-walk/page.tsx
    - src/app/api/site-walks/route.ts
    - src/db/schema.ts

key-decisions:
  - "Conditional rendering instead of CSS max-h-0 for collapse — max-h-0 wasn't hiding content"
  - "Chevron in gray circle background for visibility on mobile"
  - "Colored borders + status badges on entry cards for visual distinction from unrecorded tasks"
  - "Always navigate to zone-tasks after recording — enables photo access for single-task and completed zones"

patterns-established:
  - "Conditional render for expand/collapse: mount children only when expanded"
  - "Photo upload state lifted to page level so uploads survive card collapse"
  - "Accordion pattern: only one entry card expanded at a time"

requirements-completed: [PHOTO-01, PHOTO-04, OBS-01, OBS-02]

duration: ~45min
completed: 2026-03-29
---

# Phase 5 Plan 03: Photo capture UI, observation fields, entry card badges with mobile verification

**Camera capture, severity picker, percent complete, and expandable entry cards wired into extracted site-walk wizard with full mobile verification**

## Performance

- **Duration:** ~45 min (including debugging and deployment)
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files created:** 7
- **Files modified:** 5

## Accomplishments
- 7 new UI components: EntryCard, EntryDetailPanel, PhotoCapture, PhotoThumbnail, PhotoOverlay, SeverityPicker, PercentComplete
- Entry cards with green/red/emerald borders, status badges, and prominent chevron
- Expand to reveal camera, severity (Low/Med/High/Crit), percent (0-100), notes
- Photo upload state lifted to page level, accordion behavior, optimistic updates
- Fixed pre-existing Zod validation bug blocking entry saves
- Single-task and completed zones now accessible for photo/detail entry

## Task Commits

1. **Task 1: Create photo and observation field components** - `dc2267c` (feat)
2. **Task 2: Wire EntryCard/DetailPanel into ZoneTaskList and page** - `73c3078` (feat)
3. **Task 3: Human verification on mobile** - approved by user after deployment

**Bug fixes during verification:**
- `3179ba6` — fix: accept completed status and nullable fields in add_entry Zod validation
- `040fcb1` — fix: make entry cards visually distinct from unrecorded tasks
- `be52621` — fix: conditional render for detail panel, prominent chevron
- `329c343` — fix: show entry cards for single-task and completed zones

## Deviations from Plan

### Auto-fixed Issues

**1. Zod validation rejecting entry saves**
- **Found during:** Task 3 (human verification)
- **Issue:** add_entry schema didn't accept 'completed' status or null values for optional fields — pre-existing bug from Phase 4 Zod addition
- **Fix:** Added 'completed' to status enum, made optional fields nullable
- **Files modified:** src/app/api/site-walks/route.ts, src/db/schema.ts

**2. CSS max-h-0 not hiding expanded content**
- **Found during:** Task 3 (puppeteer verification)
- **Issue:** Detail panel content visible even when collapsed despite max-h-0 overflow-hidden
- **Fix:** Switched to conditional rendering — only mount children when expanded
- **Files modified:** EntryCard.tsx

**3. Single-task zones skipping entry card view**
- **Found during:** Task 3 (user feedback)
- **Issue:** Zones with 1 task went straight to status selector and back to zone grid, never showing entry card with photo options
- **Fix:** Always navigate to zone-tasks after recording; show zone-tasks when re-entering zones with entries
- **Files modified:** page.tsx

---

**Total deviations:** 3 auto-fixed (1 pre-existing bug, 1 CSS issue, 1 UX flow)
**Impact on plan:** All fixes necessary for correct functionality. No scope creep.

## Issues Encountered
- Browser cache served stale JS bundles — resolved by clean rebuild (rm -rf .next)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Photo capture and observation fields fully functional
- Walk summary (Phase 6) can query entry severity, percent complete, and photo data
- Walk history (Phase 7) can display photo counts and observation details

---
*Phase: 05-photo-capture-richer-observations*
*Completed: 2026-03-29*
