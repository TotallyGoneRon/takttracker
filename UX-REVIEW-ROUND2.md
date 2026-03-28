# Takt-Flow Recovery System -- UX Review Round 2

**Date:** 2026-03-27
**Reviewer:** Follow-up code + live site review
**URL:** https://jobsitenexus.com/tracking
**Scope:** Verify fixes from Round 1 code review, identify remaining issues

---

## Fix Verification Checklist

### P0 Fixes

#### 1. Site Walk error handling
**Status: VERIFIED**

All three Site Walk API calls now have proper try/catch with user-visible error states:
- **Data fetch** (`useEffect` at line 181): catches errors, sets `setError('Failed to load schedule data...')`, calls `setLoading(false)` in `finally` block.
- **Walk creation** (`ensureWalk` at line 130): catches errors, sets error message, returns `null` to prevent further execution.
- **Entry save** (`saveEntry` at line 281): catches errors, queues failed entries to `localStorage` via `QUEUE_KEY = 'taktflow_failed_entries'`, shows inline error banner with "queued for retry" message.
- **Complete walk** (`completeWalk` at line 414): catches errors with descriptive message.
- **ErrorBanner component** (line 432): renders a red banner with dismiss button (44px min touch target).
- **Offline queue with retry** (lines 73-90, 149-177): failed entries are stored in localStorage and retried on the next save attempt.

Additionally, the Timeline, Map, and Scorecard pages all have error states with try/catch -- verified in their source code.

**File:** `/src/app/schedule/[planId]/site-walk/page.tsx` lines 130-146, 281-353, 414-429, 432-448

---

#### 2. Site Walk skip log-details for on_track
**Status: VERIFIED**

The `handleStatusSelect` function (line 271) now routes differently based on status:
```
if (status === 'delayed') {
  setStep('log-details');
} else {
  // For on_track and recovered, save immediately (no extra tap)
  saveEntry(status, null);
}
```
This means the flow for on-track items is now:
- **Single-task zone:** Tap zone (1) -> Tap "On Track" (2) -> auto-saves -> back to zone grid. **2 taps.**
- **Multi-task zone:** Tap zone (1) -> Tap task (2) -> Tap "On Track" (3) -> auto-saves -> back to task list. **3 taps.**

The code comment at line 270 confirms this was an intentional fix: `// Fix #2: Skip log-details for on_track/recovered`.

**File:** `/src/app/schedule/[planId]/site-walk/page.tsx` lines 270-279

---

#### 3. Site Walk confirmation before Complete Walk
**Status: VERIFIED**

- `showConfirm` state variable declared at line 113.
- "Complete Walk" button now calls `setShowConfirm(true)` (line 557) instead of directly calling `completeWalk`.
- Confirmation modal renders at lines 566-587 with:
  - Overlay: `fixed inset-0 z-50 bg-black/40`
  - Modal body with heading "Complete this walk?" and entry count
  - Cancel button: `min-h-[48px]`, bg-gray-100
  - Complete button: `min-h-[48px]`, bg-green-600
- `completeWalk` function (line 414) sets `setShowConfirm(false)` before proceeding.

**File:** `/src/app/schedule/[planId]/site-walk/page.tsx` lines 113, 557, 566-587

---

### P1 Fixes

#### 4. NavBar touch targets >= 44px at tablet
**Status: VERIFIED**

Desktop nav links (lines 49-77) now use:
```
min-h-[44px] flex items-center
```
with `px-4 py-2.5` padding. This applies to Dashboard, Import, and all plan-specific links (Timeline, Site Walk, Map, Scorecard). The code comment at line 47 confirms: `Fix #6: min-h-[44px] flex items-center`.

**File:** `/src/app/NavBar.tsx` lines 47-77

---

#### 5. Hamburger button >= 48px at mobile
**Status: VERIFIED**

The hamburger button (line 82) now uses:
```
min-w-[48px] min-h-[48px] flex items-center justify-center
```
with `p-3` padding. Code comment at line 80 confirms: `Fix #6: min-w-[48px] min-h-[48px]`.

**File:** `/src/app/NavBar.tsx` lines 80-98

---

#### 6. Timeline filter controls >= 44px
**Status: VERIFIED**

All filter controls on the Timeline page now have `min-h-[44px]`:
- Date inputs (lines 274, 282): `py-2.5 ... min-h-[44px]`
- "This Week" button (line 286): `py-2.5 ... min-h-[44px]`
- "Show All" checkbox label (line 290): `min-h-[44px]`
- Status select (line 304): `py-2.5 ... min-h-[44px]`
- Building select (line 317): `py-2.5 ... min-h-[44px]`

**File:** `/src/app/schedule/[planId]/page.tsx` lines 266-324

---

#### 7. Scorecard company text contrast
**Status: VERIFIED**

Company names in both the bar chart (line 154) and the table (line 247) now use `text-gray-900` (default dark text):
- Bar chart: `<span className="text-gray-900">{company.companyName}</span>` (line 154)
- Table: `<span className="font-medium text-gray-900">{company.companyName}</span>` (line 248)

The company color is only used for the small dot indicator (`w-3 h-3 rounded-full` at line 244), not the text. This resolves the WCAG contrast issue where arbitrary company colors could be too light on white.

**File:** `/src/app/schedule/[planId]/scorecard/page.tsx` lines 152-157, 243-249

---

#### 8. Site Walk summary text
**Status: VERIFIED**

The summary page (line 835) now reads:
```
{entries.length} tasks updated across {checkedZones.size} zones
```
This correctly distinguishes task-level entries from zone-level counts, fixing the misleading "zones checked" language.

**File:** `/src/app/schedule/[planId]/site-walk/page.tsx` line 835

---

### P2 Fixes

#### 9. Viewport meta tag
**Status: VERIFIED**

The layout file (lines 11-17) exports an explicit `Viewport` object:
```tsx
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};
```
Live site confirms the rendered meta tag: `width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no`.

**File:** `/src/app/layout.tsx` lines 10-17

---

#### 10. Focus-visible styles
**Status: VERIFIED**

Global CSS (lines 14-18) now includes:
```css
*:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
}
```
This provides a visible blue focus ring on all focusable elements, replacing the often-invisible browser defaults. The blue (#2563eb) has good contrast against both white and colored backgrounds.

**File:** `/src/app/globals.css` lines 14-18

---

#### 11. Back button contrast
**Status: VERIFIED**

All back buttons across the Site Walk flow now use `text-base text-gray-700 ... font-medium`:
- "Back to zones" (line 600): `text-base text-gray-700 hover:text-gray-900 min-h-[48px] flex items-center font-medium`
- "Back" on toggle-status (line 689): `text-base text-gray-700 hover:text-gray-900 min-h-[48px] flex items-center font-medium`
- "Back" on log-details (line 732): `text-base text-gray-700 hover:text-gray-900 min-h-[48px] flex items-center font-medium`

The contrast ratio of gray-700 (#374151) on white (#ffffff) is approximately 9.3:1, well above the WCAG AA requirement of 4.5:1.

**File:** `/src/app/schedule/[planId]/site-walk/page.tsx` lines 600, 689, 732

---

#### 12. Map close button >= 48px
**Status: VERIFIED**

The zone detail slide-over close button (line 290) now uses:
```
w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center
```
with `text-2xl` for the "x" character. This is 48px on both axes, meeting the touch target minimum.

**File:** `/src/app/schedule/[planId]/map/page.tsx` lines 289-293

---

#### 13. "All On Track" bulk action
**Status: VERIFIED**

The zone-tasks view (lines 613-621) now includes an "All On Track" button:
```tsx
<button
  onClick={handleMarkAllOnTrack}
  disabled={saving}
  className="w-full mb-4 py-3 bg-green-50 border-2 border-green-300 text-green-700 rounded-xl font-medium hover:bg-green-100 transition active:scale-95 min-h-[48px] disabled:opacity-50"
>
  {saving ? 'Saving...' : `All On Track (${uncheckedCount} remaining)`}
</button>
```
The `handleMarkAllOnTrack` function (lines 366-412) iterates through all unchecked tasks in the zone, saves each as `on_track`, and returns to the zone grid. This significantly reduces tap count for the common "everything is on track" scenario.

**File:** `/src/app/schedule/[planId]/site-walk/page.tsx` lines 366-412, 613-621

---

## New Issues Found

### NEW-1: Dashboard "Active Plans" links still below touch minimum (P1)

**File:** `/src/app/page.tsx` line 110
**Problem:** The plan links in the "Active Plans" card use `text-sm p-2` which yields approximately 36px height. The code review recommended `min-h-[48px]` but this was not applied. These are primary navigation targets.
**Current:** `className="flex justify-between text-sm p-2 rounded-lg hover:bg-gray-50 transition"`
**Expected:** Should include `min-h-[48px] items-center`

---

### NEW-2: Dashboard "Last Import" stat uses text-sm instead of text-lg (P2)

**File:** `/src/app/page.tsx` line 79
**Problem:** The code review (item 2.4) recommended changing the "Last Import" stat from `text-sm font-bold` to `text-lg font-bold` to match the visual rhythm of other stat cards. This was not applied. The value still uses `text-sm font-bold`.

---

### NEW-3: Dashboard building rows are not interactive but look tappable (P2)

**File:** `/src/app/page.tsx` lines 95-100
**Problem:** Building rows are plain `<div>` elements that look similar to the clickable plan rows above them. Users may try to tap buildings expecting navigation. No change was made from the original review finding (item 2.2).

---

### NEW-4: Mobile menu links lack min-height enforcement (P1)

**File:** `/src/app/NavBar.tsx` lines 104-141
**Problem:** While the desktop nav links received `min-h-[44px]`, the mobile dropdown menu links only use `px-3 py-3` without an explicit `min-h` constraint. The `py-3` padding likely yields around 44px naturally due to font size, but there is no guarantee. The desktop links got explicit `min-h-[44px]` but mobile links did not.

---

### NEW-5: Site Walk walk creation still deferred but no loading feedback (P2)

**File:** `/src/app/schedule/[planId]/site-walk/page.tsx` lines 130-146
**Problem:** Walk creation is now correctly deferred to first save (fixing item 5.7). However, when `ensureWalk` runs during the first entry save, there is a brief delay with no specific UI feedback that the walk is being created. The generic `saving` state covers this partially, but the error message "Failed to start walk" may confuse users who think they are saving an entry, not creating a walk.

---

### NEW-6: "All On Track" sends sequential API calls (P2)

**File:** `/src/app/schedule/[planId]/site-walk/page.tsx` lines 382-396
**Problem:** The `handleMarkAllOnTrack` function sends one API call per task in a serial `for` loop. For a zone with 10 tasks, this could take several seconds. If any call fails mid-way, some tasks are saved and others are not, with only a generic error. Consider batching these into a single API call or using `Promise.all` with individual error handling.

---

### NEW-7: Map parkade/special zone buttons still below 44px minimum (P1)

**File:** `/src/app/schedule/[planId]/map/page.tsx` line 209
**Problem:** Special zone buttons (parkade, etc.) still use `min-h-[40px]`. The code review (item 6.2) recommended changing to `min-h-[48px]` but the current code shows `min-h-[40px]`. This was NOT fixed.

---

### NEW-8: Scorecard has no error handling for fetch failure display (P2)

**File:** `/src/app/schedule/[planId]/scorecard/page.tsx` lines 38-52
**Problem:** The scorecard page does have try/catch and an error state (lines 71-78), which is good. However, there is no retry button or link back to the dashboard in the error state. The user sees "Unable to load scorecard" with no actionable path forward except refreshing the browser.

---

### NEW-9: Timeline page is still very long with no pagination (P2)

**File:** `/src/app/schedule/[planId]/page.tsx`
**Problem:** When "Show All" is checked, tasks are now capped at 200 (line 140-148), which is a performance improvement. However, the default week view can still show 200+ tasks in a flat list with no sticky filter bar. The filter bar scrolls off-screen quickly. This was noted in the original review but not addressed.

---

### NEW-10: No ARIA labels on zone buttons in Site Walk (P2)

**File:** `/src/app/schedule/[planId]/site-walk/page.tsx` lines 527-546
**Problem:** Zone buttons do not include `aria-label` with status information. A screen reader user would hear "4D, 12 tasks" but not the zone status. The original review recommended `aria-label="Zone 4D, 12 tasks, delayed"`. This has not been implemented.

---

## Summary

| # | Fix Description | Priority | Status |
|---|----------------|----------|--------|
| 1 | Site Walk error handling | P0 | VERIFIED |
| 2 | Site Walk skip log-details for on_track | P0 | VERIFIED |
| 3 | Site Walk confirmation before Complete Walk | P0 | VERIFIED |
| 4 | NavBar touch targets >= 44px at tablet | P1 | VERIFIED |
| 5 | Hamburger button >= 48px at mobile | P1 | VERIFIED |
| 6 | Timeline filter controls >= 44px | P1 | VERIFIED |
| 7 | Scorecard company text contrast | P1 | VERIFIED |
| 8 | Site Walk summary text | P1 | VERIFIED |
| 9 | Viewport meta tag | P2 | VERIFIED |
| 10 | Focus-visible styles | P2 | VERIFIED |
| 11 | Back button contrast | P2 | VERIFIED |
| 12 | Map close button >= 48px | P2 | VERIFIED |
| 13 | "All On Track" bulk action | P2 | VERIFIED |

**All 13 fixes: VERIFIED**

### Remaining / New Issues

| # | Issue | Priority | Category |
|---|-------|----------|----------|
| NEW-1 | Dashboard plan links still 36px height | P1 | Touch targets |
| NEW-4 | Mobile menu links lack explicit min-height | P1 | Touch targets |
| NEW-7 | Map parkade buttons still 40px (not 48px) | P1 | Touch targets |
| NEW-2 | Dashboard "Last Import" stat text too small | P2 | Typography |
| NEW-3 | Building rows look tappable but are not | P2 | Affordance |
| NEW-5 | Walk creation has no distinct loading state | P2 | Feedback |
| NEW-6 | "All On Track" sequential API calls | P2 | Performance |
| NEW-8 | Error states lack retry/navigation options | P2 | Error recovery |
| NEW-9 | Timeline still very long, no sticky filters | P2 | Scrolling UX |
| NEW-10 | No ARIA labels on zone buttons | P2 | Accessibility |

---

## Overall Quality Score: 4.2 / 5

**Rationale:** All 13 previously identified fixes have been properly implemented. The three P0 items (error handling, skip log-details, confirmation modal) are solid. The Site Walk core flow is now genuinely 2-3 taps for on-track items and has proper error handling with offline queuing -- this is a significant improvement for field use. The "All On Track" bulk action addresses the 5-minute walk target. The remaining issues are P1-P2 level: a few touch targets that were missed (dashboard links, mobile menu, parkade buttons), and some polish items. The app is substantially improved from the 3.8/5 baseline.
