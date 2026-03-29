# Phase 5: Photo Capture & Richer Observations - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

User can snap photos during site walks and optionally tag entries with severity and percent complete, without slowing down the three-tap recording flow. Component extraction of the 961-line site-walk page is a prerequisite.

</domain>

<decisions>
## Implementation Decisions

### Photo Capture UX
- **D-01:** Camera button appears AFTER the three-tap flow completes (zone → task → status). The saved entry card shows a camera icon the user can optionally tap. Fast path is identical to pre-v1.1.
- **D-02:** One photo per entry. Tapping camera again replaces the existing photo. No multi-photo gallery per entry.
- **D-03:** Use HTML `<input type="file" accept="image/*" capture="environment">` to trigger the phone's native camera. No MediaStream API, no permissions hassle. Works on iOS + Android.

### Photo Viewing
- **D-04:** Tap a thumbnail on the entry card to open a fullscreen overlay showing the full-size photo.
- **D-05:** Fullscreen overlay includes two actions: Retake (opens camera to replace) and Delete (removes the photo). Close via X button or tap outside.

### Observation Fields
- **D-06:** Entry card has a chevron/expand icon. Tap to expand a detail section below the card with severity picker, percent complete, and notes field. Collapsed by default — fast path untouched.
- **D-07:** Severity and percent complete are available on ALL entries regardless of status. No conditional visibility logic.
- **D-08:** Severity uses a color-coded button group: Low (yellow), Medium (orange), High (red), Critical (dark red). One tap to set, tap again to unset.
- **D-09:** Severity and percent complete are visual trackers only — do not affect scoring or scheduling.

### Entry Card Density
- **D-10:** Collapsed entry cards show compact icon badges: camera icon (📷) if photo exists, colored severity dot, and percent number. All detail in expanded view only.

### Claude's Discretion
- Percent complete UI control style (segmented buttons, slider, etc.) — pick what's fastest for field taps
- Component extraction strategy for the 961-line site-walk page — break up as needed for maintainability
- Photo thumbnail size and aspect ratio on entry cards
- Notes field behavior (auto-save on blur, save button, etc.)
- How to handle the expand/collapse animation

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema & Data Model
- `src/db/schema.ts` — `siteWalkPhotos` table already defined (id, site_walk_entry_id, original_url, thumbnail_url, markup_url, content_type, file_size). `siteWalkEntries` needs new columns for severity and percent_complete.

### Existing Site Walk Code
- `src/app/schedule/[planId]/site-walk/page.tsx` — 961-line monolith that must be componentized before adding photo/observation state
- `src/app/api/site-walks/route.ts` — Current site walk API (action-dispatched POST: create, add_entry, complete)

### Infrastructure
- `src/lib/fetcher.ts` — BasePath-aware SWR fetcher
- `src/lib/validations.ts` — Zod validation schemas

### Prior Research (from STATE.md)
- Photos stored in `data/photos/` with API route to serve — never `public/` (standalone build breaks runtime writes to public/)
- Photo upload decoupled from entry save — entry saves fast via JSON, photo uploads async after entryId returned
- Zero new npm packages — sharp already installed for thumbnail generation
- Client-side image resize may be needed if cell upload speed is unacceptable — measure after deploy

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- shadcn/ui components: Badge, Button, Card, Sheet, Skeleton, Tabs — all available for entry cards and expanded detail section
- `src/lib/fetcher.ts` — SWR fetcher with basePath awareness for all data fetching
- `src/lib/validations.ts` — Zod schemas for API validation
- `sharp` npm package — already installed for server-side thumbnail generation

### Established Patterns
- SWR hooks for all client-side data fetching (Phase 1 D-03)
- Zod validation on all API routes (Phase 4 D-01)
- Mobile-first responsive design with `min-h-[44px]` touch targets and `active:scale-95` feedback
- Bottom navigation bar within plan context pages (Phase 3 D-05)

### Integration Points
- Site walk API route (`/api/site-walks/route.ts`) — needs new actions for photo upload/delete and observation field saves
- New API route needed for serving photos from `data/photos/` directory
- Schema migration to add severity and percent_complete columns to siteWalkEntries
- `siteWalkPhotos` table already exists — just needs the API and upload logic

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-photo-capture-richer-observations*
*Context gathered: 2026-03-28*
