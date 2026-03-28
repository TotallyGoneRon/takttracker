# Takt-Flow Recovery System -- UX Code Review

**Reviewer:** UX Design Review (code-level)
**Date:** 2026-03-27
**Scope:** All page components, navigation, and global styles
**Context:** Tablet-optimized app for construction site supervisors doing field walks

---

## Executive Summary

The app demonstrates solid awareness of tablet UX: most primary actions meet 44px+ touch targets, loading skeletons exist for the main timeline, and the Site Walk flow is well-structured. However, there are meaningful gaps in error handling, some touch targets fall below minimum thresholds, the "three-tap" claim requires 4-5 taps for delayed items, and several WCAG AA contrast issues exist. The findings below are ordered by severity within each page.

---

## 1. Global / Layout / Navigation

### 1.1 NavBar desktop links are too small for tablet touch

**File:** `/src/app/NavBar.tsx`, lines 46-74
**Problem:** Desktop nav links use `px-3 py-2` which yields roughly 36px height -- below the 44px minimum. On a tablet in landscape, the `md:flex` breakpoint activates these small targets.
**Fix:**
```
- className={`px-3 py-2 rounded-lg transition ${...}`}
+ className={`px-4 py-2.5 rounded-lg transition min-h-[44px] flex items-center ${...}`}
```

### 1.2 Hamburger button is undersized

**File:** `/src/app/NavBar.tsx`, line 80
**Problem:** `p-2` on the hamburger yields ~40px. With gloves, this is a miss risk.
**Fix:**
```
- className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
+ className="md:hidden p-3 rounded-lg hover:bg-gray-100 transition min-w-[48px] min-h-[48px] flex items-center justify-center"
```

### 1.3 Mobile menu does not close on route change automatically

**File:** `/src/app/NavBar.tsx`, lines 99-141
**Problem:** Menu items call `setMenuOpen(false)` on click, which is correct for `<Link>`. However, there is no `useEffect` listening to `pathname` changes. If a user navigates by swiping back and then tapping menu, stale open state may persist.
**Fix:** Add:
```tsx
useEffect(() => { setMenuOpen(false); }, [pathname]);
```

### 1.4 No viewport meta tag explicitly set

**File:** `/src/app/layout.tsx`, lines 1-25
**Problem:** Next.js adds a default viewport tag, but for a tablet-first app you should explicitly set `viewport-fit=cover` and `user-scalable=no` to prevent accidental pinch-zoom during site walks.
**Fix:** Add metadata export:
```tsx
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};
```

### 1.5 No focus-visible styles for keyboard/switch access

**File:** `/src/app/globals.css`
**Problem:** No custom `focus-visible` ring styles. The default browser outline is often invisible on colored backgrounds (e.g., green/red zone buttons in Site Walk).
**Fix:** Add to `globals.css`:
```css
*:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
}
```

---

## 2. Dashboard (`/src/app/page.tsx`)

### 2.1 Active Plans links are too small

**File:** `/src/app/page.tsx`, lines 96-104
**Problem:** Plan links use `text-sm p-2` yielding about 36px row height. These are primary navigation targets.
**Fix:**
```
- className="flex justify-between text-sm p-2 rounded-lg hover:bg-gray-50 transition"
+ className="flex justify-between text-sm p-3 rounded-lg hover:bg-gray-50 transition min-h-[48px] items-center"
```

### 2.2 Building list rows are not interactive but look like they could be

**File:** `/src/app/page.tsx`, lines 84-89
**Problem:** Building rows are plain `<div>` elements. Users may expect to tap a building to filter or navigate. Either make them tappable links or visually differentiate them from the clickable plan list.
**Fix:** Consider adding a subtle left border color or making them links to the map page filtered to that building.

### 2.3 No error state for failed data fetch

**File:** `/src/app/page.tsx`, lines 8-37
**Problem:** This is a server component that directly queries the database. If the DB query fails, the user gets an unhandled error page. There is no try/catch or error boundary.
**Fix:** Wrap the data fetching in try/catch and render a user-friendly error state:
```tsx
try {
  const plans = await db.select()...
} catch (err) {
  return (
    <div className="p-6 text-center">
      <h3 className="text-lg font-semibold text-red-600">Unable to load dashboard</h3>
      <p className="text-gray-500 mt-2">Please check your connection and refresh.</p>
    </div>
  );
}
```

### 2.4 "Last Import" stat card text is too small

**File:** `/src/app/page.tsx`, line 68
**Problem:** The value uses `text-sm font-bold` while all other stat cards use `text-2xl font-bold`. This breaks the visual rhythm and makes dates hard to read at arm's length.
**Fix:**
```
- <div className="text-sm font-bold text-gray-900 mt-1">
+ <div className="text-lg font-bold text-gray-900 mt-1">
```

---

## 3. Import (`/src/app/import/page.tsx`)

### 3.1 Project name input is too small for tablet

**File:** `/src/app/import/page.tsx`, lines 69-74
**Problem:** `py-2` on the text input yields about 36px height. Hard to tap accurately with work gloves.
**Fix:**
```
- className="w-full px-3 py-2 border border-gray-300 rounded-lg ..."
+ className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base ... min-h-[48px]"
```

### 3.2 "View Schedule" button after import is too small

**File:** `/src/app/import/page.tsx`, line 157
**Problem:** `py-2` yields about 36px. This is the most important action after a successful import.
**Fix:**
```
- className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
+ className="mt-4 w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium min-h-[48px] text-base"
```

### 3.3 No upload progress indicator

**File:** `/src/app/import/page.tsx`, lines 33-57
**Problem:** During upload, the button shows "Importing..." but there is no progress bar or time estimate. XLSX files can be large and imports can take 10+ seconds. Users may think it is frozen and re-tap.
**Fix:** Add a progress bar or at least an animated indicator below the button:
```tsx
{uploading && (
  <div className="mt-3">
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '70%' }} />
    </div>
    <p className="text-sm text-gray-500 mt-1 text-center">Processing schedule data...</p>
  </div>
)}
```

### 3.4 Drop zone is not accessible via keyboard

**File:** `/src/app/import/page.tsx`, lines 77-104
**Problem:** The drop zone is a `<div>` with `onClick` but no `role="button"`, `tabIndex`, or `onKeyDown`. Screen reader and keyboard users cannot activate it.
**Fix:** Add accessibility attributes:
```tsx
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('file-input')?.click(); }}
  ...
>
```

### 3.5 Import button shows no disabled reason

**File:** `/src/app/import/page.tsx`, lines 112-118
**Problem:** When disabled (no file selected), the button turns gray but provides no text explanation. Users may not realize they need to select a file first.
**Fix:** Change disabled text:
```tsx
{uploading ? 'Importing...' : !file ? 'Select a file first' : 'Import Schedule'}
```

---

## 4. Timeline (`/src/app/schedule/[planId]/page.tsx`)

### 4.1 Filter controls are below 44px minimum

**File:** `/src/app/schedule/[planId]/page.tsx`, lines 251-305
**Problem:** Date inputs, selects, and "This Week" button all use `min-h-[36px]`. These are frequently used during field review.
**Fix:** Change all filter controls:
```
- min-h-[36px]
+ min-h-[44px]
```
And increase padding:
```
- px-2 py-1.5
+ px-3 py-2.5
```

### 4.2 Task rows have no tap target affordance

**File:** `/src/app/schedule/[planId]/page.tsx`, lines 329-356
**Problem:** Task rows use `hover:bg-gray-50` but are not clickable. On a touch device, hover provides no feedback. Users see tasks but cannot drill down for details.
**Fix:** Either make rows tappable (link to task detail or inline expand) or remove the hover style to avoid implying interactivity.

### 4.3 Status badges are too small to read at arm's length

**File:** `/src/app/schedule/[planId]/page.tsx`, lines 343-345
**Problem:** `text-xs px-2 py-0.5` makes status pills about 20px tall with ~10px text. On a tablet held at arm's length on a construction site, this is too small.
**Fix:**
```
- className={`text-xs px-2 py-0.5 rounded-full ...`}
+ className={`text-sm px-3 py-1 rounded-full ...`}
```

### 4.4 No error state for API failure

**File:** `/src/app/schedule/[planId]/page.tsx`, lines 120-148
**Problem:** `fetchData` has no try/catch. If the API returns an error, `res.json()` may throw or return malformed data, leading to a blank screen.
**Fix:**
```tsx
try {
  const res = await fetch(...);
  if (!res.ok) throw new Error('Failed to load');
  const json = await res.json();
  ...
} catch (err) {
  setError('Failed to load schedule data. Pull down to retry.');
  setLoading(false);
}
```

### 4.5 "Plan not found" is a dead end

**File:** `/src/app/schedule/[planId]/page.tsx`, line 195
**Problem:** `<div className="p-6">Plan not found</div>` provides no navigation back to dashboard or import.
**Fix:**
```tsx
<div className="p-6 text-center">
  <h3 className="text-lg font-semibold mb-2">Plan not found</h3>
  <p className="text-gray-500 mb-4">This schedule may have been deleted or the link is invalid.</p>
  <Link href="/" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium min-h-[48px] inline-flex items-center">
    Go to Dashboard
  </Link>
</div>
```

### 4.6 Checkbox for "Show All" is very small

**File:** `/src/app/schedule/[planId]/page.tsx`, lines 272-280
**Problem:** Default HTML checkbox is about 16x16px. With gloves, this is nearly impossible to accurately tap.
**Fix:** Use a larger toggle switch or increase checkbox size:
```css
input[type="checkbox"] {
  width: 24px;
  height: 24px;
}
```
Or replace with a toggle button component.

---

## 5. Site Walk (`/src/app/schedule/[planId]/site-walk/page.tsx`) -- CRITICAL PATH

### 5.1 The "three-tap" flow is actually 4-5 taps for delayed items

**Analysis of the flow:**
- **Tap 1:** Select zone from grid
- **Tap 2:** Select task (if zone has multiple tasks) -- this is a hidden step
- **Tap 3:** Select status (On Track / Delayed / Recovered)
- **Tap 4:** For delayed: select variance code
- **Tap 5:** Tap "Save & Next"

For "On Track" items it is 3-4 taps (zone > task > status > save). The "save" step on the log-details page (lines 196-204) always routes to `log-details` even for on_track/recovered, requiring a mandatory save tap.

**Fix:** For `on_track` and `recovered`, skip the log-details step entirely and save immediately:
```tsx
const handleStatusSelect = (status: string) => {
  setSelectedStatus(status);
  if (status === 'delayed') {
    setStep('log-details');
  } else {
    // Save immediately -- no extra tap needed
    saveEntry(status, null);
  }
};
```
This would make on-track zones genuinely 2-3 taps (zone > [task] > status).

### 5.2 Zone grid buttons may be too small on phones visiting the tablet app

**File:** `/src/app/schedule/[planId]/site-walk/page.tsx`, line 345
**Problem:** Zone buttons use `min-h-[68px]` which is good for tablets but the `p-3` with `text-sm truncate` may cause zone names to be cut off. On 2-column mobile layout, each button is roughly 170px wide which is adequate.
**Verdict:** This is acceptable for tablet use. No change needed, but consider adding a tooltip or full-name on long-press for truncated names.

### 5.3 No error handling on API calls

**File:** `/src/app/schedule/[planId]/site-walk/page.tsx`, lines 99-123, 127-137, 206-244
**Problem:** Three separate fetch calls (load tasks, start walk, save entry) have zero error handling. If the network drops mid-walk (common on construction sites), entries are silently lost with no feedback.
**Fix:** This is the highest-severity issue in the app. Each API call needs try/catch with user-visible error states:
```tsx
const saveEntry = async (status: string, variance: string | null) => {
  if (!selectedTask || !walkId) return;
  try {
    const res = await fetch('/tracking/api/site-walks', { ... });
    if (!res.ok) throw new Error('Save failed');
    // ... success path
  } catch (err) {
    // Show inline error -- DO NOT navigate away
    setError('Failed to save. Check your connection and try again.');
  }
};
```
Also consider queuing failed entries in localStorage for retry.

### 5.4 "Back to zones" button is too subtle for gloved use

**File:** `/src/app/schedule/[planId]/site-walk/page.tsx`, lines 388-391
**Problem:** `text-sm text-gray-500` with only `min-h-[44px]` meets minimum height but the text color (gray-500 = #6b7280) on white (#ffffff) has a contrast ratio of 4.6:1 which barely passes AA for normal text but fails for the `text-sm` (14px) size threshold.
**Fix:**
```
- className="mb-4 text-sm text-gray-500 hover:text-gray-700 min-h-[44px] flex items-center"
+ className="mb-4 text-base text-gray-700 hover:text-gray-900 min-h-[48px] flex items-center font-medium"
```

### 5.5 No confirmation before "Complete Walk"

**File:** `/src/app/schedule/[planId]/site-walk/page.tsx`, lines 371-377
**Problem:** Tapping "Complete Walk" immediately finalizes and submits. An accidental tap (gloved hand brushing the bottom of screen) ends the walk prematurely. There is no undo.
**Fix:** Add a confirmation step:
```tsx
const [showConfirm, setShowConfirm] = useState(false);

// In the button:
onClick={() => setShowConfirm(true)}

// Confirmation dialog:
{showConfirm && (
  <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
      <h3 className="text-lg font-bold mb-2">Complete this walk?</h3>
      <p className="text-gray-500 mb-6">{entries.length} entries will be saved.</p>
      <div className="flex gap-3">
        <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-medium min-h-[48px]">Cancel</button>
        <button onClick={completeWalk} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium min-h-[48px]">Complete</button>
      </div>
    </div>
  </div>
)}
```

### 5.6 Fixed bottom button may overlap content on short screens

**File:** `/src/app/schedule/[planId]/site-walk/page.tsx`, line 370
**Problem:** `pb-28` on the container (line 295) provides bottom padding, but on a phone or small tablet the fixed button (`fixed bottom-0 left-0 right-0`) may still overlap the last zone card. The `pb-28` is 7rem = 112px which should be sufficient for the 56px button + 16px padding, but there is no safe-area-inset handling for devices with bottom bars.
**Fix:** Add safe area padding:
```
- className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg z-40"
+ className="fixed bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white border-t border-gray-200 shadow-lg z-40"
```

### 5.7 Walk auto-starts on page load with no user intent

**File:** `/src/app/schedule/[planId]/site-walk/page.tsx`, lines 126-137
**Problem:** A new walk record is created via API the moment the page loads, even if the user is just browsing. This creates empty walk records in the database.
**Fix:** Defer walk creation until the first entry is saved:
```tsx
const ensureWalk = async () => {
  if (walkId) return walkId;
  const res = await fetch('/tracking/api/site-walks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', planId: parseInt(planId) }),
  });
  const walk = await res.json();
  setWalkId(walk.id);
  return walk.id;
};
```

### 5.8 Summary page says "zones checked" but actually shows task entries

**File:** `/src/app/schedule/[planId]/site-walk/page.tsx`, line 600
**Problem:** `<p className="text-gray-500">{entries.length} zones checked</p>` -- `entries` is an array of task-level entries, not zone-level. If a zone has 3 tasks, it counts as 3 "zones checked." This is misleading.
**Fix:**
```tsx
<p className="text-gray-500">{entries.length} tasks updated across {checkedZones.size} zones</p>
```

### 5.9 Can a supervisor complete a full building walk in under 5 minutes?

**Analysis:** Assuming a building with 10 floors x 4 zones = 40 zones, with an average of 2 tasks per zone:
- Best case (all on-track, with fix from 5.1): 40 zones x 2 tasks x 2 taps = 160 taps, ~2.5 minutes at 1 tap/second
- Current implementation: 40 zones x 2 tasks x 4 taps = 320 taps, ~5+ minutes
- With delayed items: significantly longer due to variance code selection

The fix in 5.1 is essential for meeting the 5-minute target. Additionally, consider adding a "Mark all tasks in zone as On Track" bulk action for zones where everything is fine (the common case).

---

## 6. Map (`/src/app/schedule/[planId]/map/page.tsx`)

### 6.1 Zone buttons inside floor rows are too narrow

**File:** `/src/app/schedule/[planId]/map/page.tsx`, line 172
**Problem:** `min-w-[60px]` with `flex-1` means buttons can be very narrow when many zones exist on a floor. `min-h-[52px]` is good, but width can drop below 44px.
**Fix:**
```
- className={`flex-1 min-w-[60px] py-3 px-2 rounded border-2 text-xs ...`}
+ className={`flex-1 min-w-[80px] py-3 px-2 rounded border-2 text-xs ...`}
```

### 6.2 Special zone buttons (parkade) are below 44px

**File:** `/src/app/schedule/[planId]/map/page.tsx`, line 192
**Problem:** `min-h-[40px]` is below the 44px minimum.
**Fix:**
```
- className="px-3 py-2 bg-gray-200 rounded text-xs hover:bg-gray-300 active:scale-95 min-h-[40px]"
+ className="px-3 py-3 bg-gray-200 rounded text-xs hover:bg-gray-300 active:scale-95 min-h-[48px]"
```

### 6.3 Slide-over close button is too small

**File:** `/src/app/schedule/[planId]/map/page.tsx`, line 273
**Problem:** `w-10 h-10` (40px) is below minimum. The "x" close button is a critical escape target.
**Fix:**
```
- className="text-gray-400 hover:text-gray-600 text-xl w-10 h-10 flex items-center justify-center"
+ className="text-gray-400 hover:text-gray-600 text-2xl w-12 h-12 flex items-center justify-center"
```

### 6.4 No back button to dashboard from map

**File:** `/src/app/schedule/[planId]/map/page.tsx`, lines 210-216
**Problem:** Only a "Timeline" back link is provided. The NavBar handles broader navigation, but on mobile the hamburger menu adds friction. Consider adding breadcrumbs or a more visible back path.

### 6.5 Zone text inside colored buttons may have poor contrast

**File:** `/src/app/schedule/[planId]/map/page.tsx`, lines 166-177
**Problem:** Default text color (gray-900) on light status backgrounds like `bg-yellow-400` or `bg-green-300` may have borderline contrast. The `text-xs` size makes this worse.
**Fix:** Add explicit dark text colors to STATUS_STYLES:
```tsx
completed: { bg: 'bg-green-400', border: 'border-green-600', label: 'Complete', text: 'text-green-950' },
delayed: { bg: 'bg-red-400', border: 'border-red-600', label: 'Delayed', text: 'text-red-950' },
```
Then apply `${style.text}` to the button content.

---

## 7. Scorecard (`/src/app/schedule/[planId]/scorecard/page.tsx`)

### 7.1 Table header sort targets are too small

**File:** `/src/app/schedule/[planId]/scorecard/page.tsx`, lines 160-207
**Problem:** `<th>` elements with `px-4 py-3` are adequate height (~44px) but the `cursor-pointer` sort behavior has no visual affordance beyond a small arrow character. Users may not discover sorting.
**Fix:** Add a visible sort icon and increase the tap target with padding:
```
- className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
+ className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900 hover:bg-gray-100 rounded select-none"
```

### 7.2 "No scorecard data" is a dead end

**File:** `/src/app/schedule/[planId]/scorecard/page.tsx`, line 63
**Problem:** `<div className="p-6">No scorecard data</div>` has no navigation or explanation.
**Fix:** Same pattern as Timeline -- provide a link to Site Walk to generate data:
```tsx
<div className="p-6 text-center">
  <h3 className="text-lg font-semibold mb-2">No scorecard data yet</h3>
  <p className="text-gray-500 mb-4">Complete site walks to start tracking trade recovery.</p>
  <Link href={`/schedule/${planId}/site-walk`} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium min-h-[48px] inline-flex items-center">
    Start a Site Walk
  </Link>
</div>
```

### 7.3 Company color used as text color may fail contrast

**File:** `/src/app/schedule/[planId]/scorecard/page.tsx`, lines 230-234
**Problem:** `style={{ color: company.companyColor ? '#' + company.companyColor : undefined }}` applies arbitrary colors from the database as text. Light colors (e.g., yellow, light blue) on white background will fail WCAG AA.
**Fix:** Use the company color only for the dot indicator, not the text:
```tsx
<span className="font-medium text-gray-900">{company.companyName}</span>
```
Keep the colored dot (line 228) as the visual identifier.

### 7.4 `scorecard-table-scroll` class is undefined

**File:** `/src/app/schedule/[planId]/scorecard/page.tsx`, line 157
**Problem:** The class `scorecard-table-scroll` is referenced but never defined in `globals.css`. It appears to be intended for custom scrollbar styling.
**Fix:** Either remove the class or add styles:
```css
.scorecard-table-scroll {
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}
```

### 7.5 Print button has no loading/feedback state

**File:** `/src/app/schedule/[planId]/scorecard/page.tsx`, line 88
**Problem:** `window.print()` is synchronous and blocks, but on some tablet browsers the print dialog can be slow to appear. No visual feedback.
**Fix:** Minor issue. Consider changing button text briefly or adding an active state.

---

## 8. Color Consistency Audit

### Status color mappings across pages:

| Status | Timeline (page.tsx) | Site Walk | Map | Globals CSS |
|--------|-------------------|-----------|-----|-------------|
| completed | bg-green-100/green-500 | (not used directly) | bg-green-400 | --status-complete: #22c55e |
| delayed | bg-red-100/red-500 | bg-red-500 | bg-red-400 | --status-delayed: #ef4444 |
| in_progress | bg-indigo-100/indigo-500 | bg-indigo-300 | bg-indigo-300 | --status-in-progress: #6366f1 |
| not_started | bg-gray-200/gray-400 | bg-gray-200 | bg-gray-200 | --status-not-started: #9ca3af |
| recovered | (not defined) | bg-blue-500 | bg-blue-400 | --status-recovered: #3b82f6 |
| on_track | (not defined) | bg-green-300 | (not defined) | (not defined) |
| at_risk | (not defined) | bg-yellow-300 | bg-yellow-400 | --status-at-risk: #f59e0b |
| blocked | bg-red-200 | (not defined) | (not defined) | (not defined) |

**Problems:**
1. CSS custom properties in `globals.css` (lines 5-12) are defined but never referenced. All pages use Tailwind classes directly.
2. "on_track" exists in Site Walk but not Timeline or Map.
3. "blocked" exists in Timeline but not Site Walk or Map.
4. "at_risk" uses yellow-300 in Site Walk but yellow-400 in Map.

**Fix:** Create a shared `statusColors.ts` utility:
```tsx
// src/lib/statusColors.ts
export const STATUS_COLORS = {
  completed: { bg: 'bg-green-400', text: 'text-green-800', light: 'bg-green-100', label: 'Complete' },
  delayed: { bg: 'bg-red-400', text: 'text-red-800', light: 'bg-red-100', label: 'Delayed' },
  // ... etc
} as const;
```
Import everywhere instead of redefining per-page.

---

## 9. Typography Audit for Arm's Length Reading

For a tablet held at arm's length (typical during a site walk), text should be at minimum 16px (text-base) for body content and 14px (text-sm) only for secondary labels.

**Issues found:**
- Timeline task names: `text-sm` (14px) -- line 338. Should be `text-base`.
- Timeline metadata: `text-xs` (12px) -- line 339. Acceptable for secondary info but borderline.
- Map zone labels: `text-xs` (12px) -- line 172. Too small for quick scanning. Should be `text-sm`.
- Map floor label: `text-xs` (12px) -- line 162. Should be `text-sm`.
- Scorecard table cells: `text-sm` (14px) -- line 158. Acceptable for a data table but tight.

---

## 10. Summary of Priority Fixes

### P0 -- Must fix (affects core workflow reliability)
1. **Site Walk: Add error handling to all API calls** (5.3) -- data loss risk
2. **Site Walk: Skip log-details for on_track/recovered** (5.1) -- core "3-tap" promise
3. **Site Walk: Add confirmation before Complete Walk** (5.5) -- accidental data submission

### P1 -- Should fix (affects usability)
4. **All pages: Add try/catch to all fetch calls** (2.3, 4.4)
5. **Timeline: Increase filter control touch targets to 44px** (4.1)
6. **NavBar: Increase hamburger and desktop link sizes** (1.1, 1.2)
7. **Site Walk: Fix misleading "zones checked" count** (5.8)
8. **Site Walk: Defer walk creation to first save** (5.7)
9. **Scorecard: Fix company color contrast** (7.3)
10. **All pages: Unify status color definitions** (Section 8)

### P2 -- Nice to have (polish)
11. **Import: Add progress indicator** (3.3)
12. **Import: Increase input/button sizes** (3.1, 3.2)
13. **Map: Increase zone and close button sizes** (6.1, 6.2, 6.3)
14. **Dead end states: Add navigation to all error/empty states** (4.5, 7.2)
15. **Layout: Add viewport meta for tablet optimization** (1.4)
16. **Global: Add focus-visible styles** (1.5)
17. **Site Walk: Add "Mark all on track" bulk action for zones** (5.9)
