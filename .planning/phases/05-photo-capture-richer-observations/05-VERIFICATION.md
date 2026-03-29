---
phase: 05-photo-capture-richer-observations
verified: 2026-03-29T16:30:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
human_verification:
  - test: "Verify camera opens rear-facing on iOS/Android"
    expected: "Native camera app launches pointing toward rear, photo captured and thumbnail appears within a few seconds"
    why_human: "capture='environment' triggers OS camera — cannot test programmatically without a device"
  - test: "Verify OBS-01 scope decision — severity available on all entry types, not just delayed"
    expected: "On-track and completed entries show severity picker in expanded detail panel"
    why_human: "REQUIREMENTS.md says 'delayed entry' but plan D-07 spec says all entries — user should confirm the broader implementation is preferred"
---

# Phase 5: Photo Capture and Richer Observations Verification Report

**Phase Goal:** User can snap photos during site walks and optionally tag entries with severity and percent complete, without slowing down the three-tap recording flow
**Verified:** 2026-03-29
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can tap a camera icon on a saved entry card and snap a photo from the phone's rear camera | VERIFIED | `PhotoCapture.tsx` has `<input type="file" accept="image/*" capture="environment">` triggered by a Camera button. `EntryDetailPanel.tsx` renders `PhotoCapture` for every recorded entry. |
| 2 | Photo thumbnail appears inline on the entry card within seconds of capture | VERIFIED | `handlePhotoUpload` in `page.tsx` sends FormData to `/api/site-walks/photos`, receives `thumbnailUrl` in response, updates entry state. `EntryDetailPanel` renders `PhotoThumbnail` with the URL. Loading skeleton shown while uploading. |
| 3 | Entries with photos show a camera icon badge on the collapsed card | VERIFIED | `EntryCard.tsx` line 45-47: `{entry.photoThumbnailUrl && (<Camera className="w-3.5 h-3.5 text-gray-400" />)}` in the badge row. |
| 4 | User can tap thumbnail to see fullscreen photo with Retake and Delete actions | VERIFIED | `PhotoOverlay.tsx` renders `fixed inset-0 z-50 bg-black/90` with Retake and Delete buttons. Delete has 3-second inline confirmation ("Confirm Delete?"). `page.tsx` renders `<PhotoOverlay>` at page level above all steps when `photoOverlayEntry` state is set. |
| 5 | User can expand an entry card to set severity (Low/Medium/High/Critical) | VERIFIED | `SeverityPicker.tsx` has 4 color-coded toggle buttons. `EntryDetailPanel` renders it. `handleSeverityChange` in `page.tsx` does optimistic update then calls `update_entry` action. |
| 6 | User can expand an entry card to set percent complete (0/25/50/75/100) | VERIFIED | `PercentComplete.tsx` has 5 segment buttons mapped from `[0, 25, 50, 75, 100]`. `handlePercentChange` in `page.tsx` posts `update_entry` action with `percentComplete` field. |
| 7 | Collapsed entry cards show severity dot and percent number badges | VERIFIED | `EntryCard.tsx` renders: severity colored dot using `SEVERITY_DOT_COLORS` when `entry.severity` is set, and `{entry.percentComplete}%` text when `entry.percentComplete != null`. |
| 8 | On-track entries still record in three taps (no extra steps added to fast path) | VERIFIED | `handleStatusSelect` in `page.tsx` line 179: on non-delayed, non-completed status calls `saveEntry(status, null)` directly — no additional step is pushed. Zone select (tap 1) → task select (tap 2) → status on_track (tap 3) = entry saved, navigates to zone-tasks showing entry card. |

**Score:** 8/8 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/api/site-walks/photos/route.ts` | Photo upload (POST) and delete (DELETE) endpoints | VERIFIED | Exports `POST` and `DELETE`. Sharp resize to 1920px original + 128px thumb. One-photo-per-entry upsert logic. DB insert to `siteWalkPhotos`. |
| `src/app/api/site-walks/[entryId]/photo/route.ts` | Photo serving endpoint | VERIFIED | Exports `GET`. Reads from `data/photos/`. Returns `image/jpeg` with `Cache-Control: public, max-age=31536000, immutable`. |
| `src/db/schema.ts` (siteWalkEntries) | severity and percent_complete columns | VERIFIED | Line 198: `severity: text('severity', { enum: ['low', 'medium', 'high', 'critical'] })`. Line 199: `percent_complete: integer('percent_complete')`. |
| `scripts/init-db.js` | Migration adding severity and percent_complete | VERIFIED | Uses `addColumnIfMissing('site_walk_entries', 'severity', 'TEXT')` and `addColumnIfMissing('site_walk_entries', 'percent_complete', 'INTEGER')`. `CREATE TABLE IF NOT EXISTS site_walk_photos` present. |
| `src/app/api/site-walks/route.ts` | update_entry action | VERIFIED | `updateEntryAction` Zod schema with severity enum, percentComplete 0-100, notes. `case 'update_entry'` handler does partial updates. No scoring functions called. |
| `_components/EntryCard.tsx` | Collapsed display with badges and expand | VERIFIED | 74 lines. Exports `EntryCard`. Camera, severity dot, percent badges in badge row. Conditional render for expanded children. |
| `_components/EntryDetailPanel.tsx` | Expanded area with photo/severity/percent/notes | VERIFIED | 93 lines. Renders `PhotoCapture`, `PhotoThumbnail`, `SeverityPicker`, `PercentComplete`, notes textarea with debounced blur save. |
| `_components/PhotoCapture.tsx` | Hidden file input + camera button | VERIFIED | `type="file" accept="image/*" capture="environment"`. `Camera` icon from lucide-react. 48px touch target. |
| `_components/PhotoOverlay.tsx` | Fullscreen photo view with retake/delete | VERIFIED | `fixed inset-0 z-50 bg-black/90`. Inline delete confirmation ("Confirm Delete?" with 3-second timeout). `/tracking` prefix on image src. |
| `_components/SeverityPicker.tsx` | Color-coded severity button group | VERIFIED | 4 levels: Low (yellow), Med (orange), High (red), Crit (red-800). Toggle on/off. 44px touch targets. |
| `_components/PercentComplete.tsx` | Segmented percent button group | VERIFIED | 5 segments: 0/25/50/75/100. Active `bg-blue-600`. Toggle on/off (same value → null). |
| `_components/ZoneTaskList.tsx` | Renders EntryCard for recorded entries | VERIFIED | Imports `EntryCard` and `EntryDetailPanel`. `expandedEntryId` accordion state. Unrecorded tasks keep original button. |
| `_components/types.ts` | EntryRecord extended with photo/observation fields | VERIFIED | `EntryRecord` has `id`, `severity`, `percentComplete`, `notes`, `photoThumbnailUrl`, `photoOriginalUrl`. `SEVERITY_DOT_COLORS` exported. |
| `page.tsx` | Slim orchestrator with photo/observation handlers | VERIFIED | 519 lines. Imports 9 components from `_components/`. `handlePhotoUpload`, `handlePhotoDelete`, `handleSeverityChange`, `handlePercentChange`, `handleNotesChange` handlers. `photoStates` and `photoOverlayEntry` state. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `EntryDetailPanel.tsx` | `/api/site-walks (update_entry)` | `apiMutate POST` with `action: 'update_entry'` | WIRED | Handlers in `page.tsx` line 410, 426, 440 each call `apiMutate` with `action: 'update_entry'` JSON body. Severity, percentComplete, notes all wired. |
| `PhotoCapture.tsx` | `/api/site-walks/photos (POST)` | FormData with `photo` and `entryId` | WIRED | `page.tsx` `handlePhotoUpload` (line 366-368): creates `FormData`, appends `photo` file and `entryId`, calls `apiMutate('/api/site-walks/photos', { method: 'POST', body: formData })`. |
| `PhotoOverlay.tsx` | `/api/site-walks/photos (DELETE)` | `handlePhotoDelete` with JSON `entryId` | WIRED | `page.tsx` line 386-390: `apiMutate` with method DELETE and `{ entryId }` JSON body. `PhotoOverlay` `onDelete` prop wired to `() => handlePhotoDelete(photoOverlayEntry.id)`. |
| `EntryCard.tsx` | `EntryDetailPanel.tsx` | Accordion expand controlled by `expandedEntryId` in `ZoneTaskList` | WIRED | `ZoneTaskList.tsx` line 44: `const [expandedEntryId, setExpandedEntryId] = useState<number | null>(null)`. Lines 91-92: `isExpanded={expandedEntryId === entry.id}` and `onToggleExpand` sets/clears ID. `EntryCard` renders children (containing `EntryDetailPanel`) only when `isExpanded` is true. |
| `photos/route.ts` | `data/photos/` disk storage | `sharp resize + fs.writeFileSync` via `sharp().toFile()` | WIRED | `sharp(buffer).resize({ width: 1920 }).toFile(originalPath)` and `sharp(buffer).resize({ width: 128 }).toFile(thumbPath)`. PHOTO_DIR = `path.join(process.cwd(), 'data', 'photos')`. |
| `[entryId]/photo/route.ts` | `data/photos/` disk read | `fs.readFileSync` | WIRED | Line 41: `const fileBuffer = fs.readFileSync(filePath)`. Returned as `NextResponse` with `image/jpeg` Content-Type. |
| `photos/route.ts` | `siteWalkPhotos` DB table | Drizzle insert | WIRED | Line 79-85: `db.insert(siteWalkPhotos).values({ site_walk_entry_id, original_url, ... }).returning()`. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `EntryCard.tsx` | `entry.photoThumbnailUrl`, `entry.severity`, `entry.percentComplete` | `handlePhotoUpload` / `handleSeverityChange` / `handlePercentChange` in `page.tsx` update `entries` state from API responses | Yes — API returns real DB-persisted values; optimistic updates backed by `apiMutate` calls | FLOWING |
| `EntryDetailPanel.tsx` | `entry` (passed prop) | Same `entries` state from `page.tsx` | Yes — same data chain as above | FLOWING |
| `photos/route.ts` | `photo` DB row | `db.insert(siteWalkPhotos).values(...).returning()` | Yes — real DB insert returning auto-generated ID | FLOWING |
| `[entryId]/photo/route.ts` | `fileBuffer` | `fs.readFileSync(filePath)` where filename comes from DB lookup | Yes — reads actual file written by upload route | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| TypeScript compiles with zero errors | `npx tsc --noEmit` | Exit 0, no output | PASS |
| All 15 component files exist in `_components/` | `ls _components/` | 15 files listed (types.ts + 14 .tsx) | PASS |
| Photo routes exist | `ls src/app/api/site-walks/photos/route.ts` and `[entryId]/photo/route.ts` | Both found | PASS |
| Schema has severity + percent_complete | `grep severity src/db/schema.ts` | Lines 198-199 confirm both columns | PASS |
| Migration script has column additions | `grep addColumnIfMissing scripts/init-db.js` | 9 matches, includes severity and percent_complete | PASS |
| Photo upload uses sharp resize at 1920px and 128px | Content check `photos/route.ts` | `resize({ width: 1920 })` and `resize({ width: 128 })` confirmed | PASS |
| Photo serve route has immutable cache headers | Content check `[entryId]/photo/route.ts` | `'Cache-Control': 'public, max-age=31536000, immutable'` at line 47 | PASS |
| Camera capture opens mobile rear camera | Manual on-device test (Task 3 checkpoint) | Approved by user during Phase 5 execution | PASS (human-verified) |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PHOTO-01 | Plans 02 + 03 | User can tap a camera icon to snap a photo from rear camera | SATISFIED | `PhotoCapture.tsx` with `capture="environment"`. Wired into `EntryDetailPanel` via `onPhotoUpload`. Human-verified on mobile in Plan 03 Task 3. |
| PHOTO-02 | Plan 01 | Uploaded photos automatically resized to thumbnails | SATISFIED | `photos/route.ts` uses sharp to resize to 1920px original and 128px thumbnail. Both stored to `data/photos/`. |
| PHOTO-03 | Plan 01 | Photos stored on local disk tied to site walk entry | SATISFIED | `fs.writeFileSync` (via `sharp().toFile()`) to `data/photos/`. DB row in `siteWalkPhotos` with `site_walk_entry_id` FK. One photo per entry enforced via delete-before-insert. |
| PHOTO-04 | Plan 03 | User can see a photo badge on entries with photos | SATISFIED (code done, docs not updated) | `EntryCard.tsx` line 45-47 renders a `Camera` icon badge when `entry.photoThumbnailUrl` exists. Plan 03 SUMMARY `requirements-completed` includes PHOTO-04. REQUIREMENTS.md traceability table still shows "Pending" — documentation not updated after implementation. Recommend updating REQUIREMENTS.md to check `[x] PHOTO-04` and change status to "Complete". |
| OBS-01 | Plans 01 + 03 | User can mark entries with severity (Low/Medium/High/Critical) — visual only | SATISFIED | `SeverityPicker.tsx` (4 levels), `update_entry` action in `site-walks/route.ts`. `update_entry` handler does NOT call `propagateDelay` or recovery functions. Note: implemented on ALL entries per plan D-07, not just delayed entries as REQUIREMENTS.md wording implies — intentional design decision recorded in Plan 03. |
| OBS-02 | Plans 01 + 03 | User can record percent complete (0/25/50/75/100) — visual only | SATISFIED | `PercentComplete.tsx` (5 segments), `update_entry` action accepts `percentComplete` 0-100. No scheduling impact. |

**Orphaned requirements:** None. All Phase 5 requirement IDs declared across plans (PHOTO-01 in Plan 02+03, PHOTO-02+03+OBS-01+OBS-02 in Plan 01, PHOTO-01+04+OBS-01+OBS-02 in Plan 03) are covered.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `REQUIREMENTS.md` | PHOTO-04 checkbox `[ ]` and traceability status "Pending" — code is implemented | Info | Documentation inconsistency only. Camera icon badge is present in `EntryCard.tsx`. No code gap. |

No code anti-patterns found. No TODOs, FIXMEs, placeholder returns, or empty handlers in any Phase 5 files.

---

### Human Verification Required

#### 1. Rear Camera on Device

**Test:** Open the site walk on a physical iOS or Android device. Record an entry in any zone. Expand the entry card. Tap "Add Photo".
**Expected:** Native OS camera app launches pointing toward the rear-facing camera (not front/selfie). After taking the photo, thumbnail appears on the card within a few seconds.
**Why human:** `capture="environment"` is a browser hint to the OS — behavior can only be confirmed on hardware with a physical camera.

#### 2. OBS-01 Scope Confirmation

**Test:** Record an on_track entry. Expand its card. Verify severity picker and percent complete are shown.
**Expected:** Both pickers appear for on_track entries (not just delayed ones).
**Why human:** REQUIREMENTS.md OBS-01 wording says "delayed entry" but the implementation deliberately shows on all entries per plan D-07. User should confirm the broader scope is intentional and update the requirement description if desired.

---

### Gaps Summary

No gaps. All 8 observable truths verified. All 14 required artifacts exist, are substantive, and are wired. All 7 key links confirmed. Data flows from user action to disk and DB for photos, and from UI interaction to DB for observation fields. TypeScript compiles clean.

The only outstanding item is a documentation inconsistency: REQUIREMENTS.md still shows PHOTO-04 as `[ ] Pending` while Plan 03 SUMMARY and the code both confirm it was implemented. This does not affect functionality.

---

_Verified: 2026-03-29_
_Verifier: Claude (gsd-verifier)_
