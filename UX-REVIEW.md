# Takt-Flow Recovery System -- UX Audit Report

**Date:** 2026-03-27
**Reviewer:** Automated UX audit via Puppeteer
**URL:** https://jobsitenexus.com/tracking
**Device targets:** iPad / construction tablet (primary), phone (secondary)

---

## Executive Summary

The Takt-Flow Recovery System is a well-structured construction site walk tool with a clear three-tap workflow that works well for its primary tablet use case. The zone grid, status selection, and variance code picker are all well-sized for touch. The main systemic issue is that **all navigation links across every page are undersized for touch** (36px height vs. the 44px minimum). The Timeline page has the most usability issues with small filter controls, while the Site Walk page is the strongest performer. Load times are excellent at ~1 second per page.

**Overall score: 3.8 / 5** -- Good foundation, needs targeted fixes to navigation and filter controls.

---

## Page-by-Page Audit

### 1. Dashboard (`/tracking`)

**Dimensions:** 1024 x 768 (no scroll needed at tablet size)

#### What Works Well
- Clean summary stats (6,167 total tasks, 48 in progress, 4,163 completed, 40 companies) give an immediate project pulse
- Building list with floor counts provides good orientation
- Active Plans section with direct links to Timeline, Site Walk, Map, and Scorecard for each plan -- reduces navigation steps
- "Re-Import" link per plan is convenient for schedule updates
- No horizontal overflow at any viewport tested (768px, 375px)
- Last Import date (Mar 27, 2026) gives confidence data is fresh

#### Issues Found
1. **Nav links too small for touch:** "Dashboard" (100x36px), "Import" (70x36px) -- both below the 44px minimum height
2. **Logo/brand link only 28px tall** -- not a critical touch target but inconsistent
3. **Plan cards at 36px height** before expansion -- the linked plan titles (446x36px) are below touch minimum
4. **No loading skeleton or shimmer** -- page loads fast (~1.1s) but shows nothing until fully rendered
5. **"0 Delayed" stat could be misleading** -- the scorecard shows companies with 0% recovery rate and delay days, yet the dashboard says 0 delayed

#### Recommendations
- Increase nav link padding to `py-3` (48px min-height): `min-h-[48px] flex items-center`
- Add `min-h-[48px]` to plan card links
- Consider a loading skeleton for the stats cards
- Add a warning indicator if any companies have low recovery rates, even when dashboard shows 0 delayed

---

### 2. Import Page (`/tracking/import`)

**Dimensions:** 1024 x 768

#### What Works Well
- Simple, focused layout -- one clear action (upload XLSX)
- Import button is properly sized at 624x48px
- Drag-and-drop zone with clear instructions
- Project Name text input is wide (624px)

#### Issues Found
1. **Nav links undersized** (same systemic issue, 36px height)
2. **Project Name input is 42px tall** -- just barely under the 44px touch minimum
3. **No validation feedback visible** -- unclear what happens if wrong file type is uploaded
4. **No progress indicator** shown for large file imports (6000+ tasks)
5. **File drop zone lacks a visible boundary** that indicates its clickable area on touch devices

#### Recommendations
- Bump input height to `min-h-[48px]`
- Add a dashed border or distinct background to the drop zone for touch clarity
- Add upload progress bar for large XLSX files
- Show file type validation inline before the user taps "Import Schedule"

---

### 3. Schedule Timeline (`/tracking/schedule/1`)

**Dimensions:** 1024 x 12,357 (very long scrolling page with 203 tasks)

#### What Works Well
- Task cards are full-width (992px) and well-structured with task name, trade, date range, and status
- Quick-nav buttons ("Site Walk", "Map View", "Scorecard") are properly sized at 46px+ height
- Summary stats (203 total, 190 not started, 11 in progress) provide useful context
- Status color coding on task cards (delayed=red-tinted, in progress=blue-tinted)
- Filters for status and building are present
- "This Week" quick-filter button is useful

#### Issues Found
1. **13 out of 16 interactive elements are below 44px touch minimum** -- the worst ratio of any page
2. **Date range inputs are only 36px tall and 150px wide** -- difficult to tap on tablet
3. **"Show All" checkbox is only 13x13px** -- extremely small for touch (should be 44x44px tap target)
4. **Status dropdown (121px) and Building dropdown (124px) are only 36px tall**
5. **"This Week" button is 36px tall**
6. **Page is 12,357px tall** -- 203 tasks shown in a flat list with no pagination or virtualization
7. **No sticky header** -- filters scroll off-screen quickly, requiring scroll-to-top to change filters
8. **Task cards show redundant information** -- task name appears to be repeated in the subtitle line (e.g., "FA devices, plugs, switches, lights / Electrical - FA devices, plugs, switches, lights")

#### Recommendations
- **Critical:** Increase all filter controls to 48px minimum height: dropdowns, date inputs, buttons, checkbox
- Replace the 13x13px checkbox with a toggle switch or large tappable button (e.g., `min-h-[48px] px-4`)
- Add sticky positioning to the filter bar: `position: sticky; top: 0; z-index: 10; background: white;`
- Add pagination or "Load more" (show 50 tasks at a time) to reduce the 12,000px scroll
- Remove duplicate task name from subtitle
- Consider collapsible floor/zone groups to reduce visual noise

---

### 4. Site Walk (`/tracking/schedule/1/site-walk`) -- PRIMARY TABLET TOOL

**Dimensions:** 1024 x 1859

#### What Works Well
- **Zone grid is excellent for touch:** Each zone button is 236x68px with `min-h-[68px]` -- well above the 44px minimum
- **Building tabs are properly sized** at 48px height with `min-h-[48px]`
- **Color coding is clear:** green (completed), red (delayed), indigo (in-progress), gray (not started)
- **Progress indicator** shows "0 of 24 zones checked" with percentage
- **`active:scale-95` on zone buttons** provides tactile feedback for touch
- **Three-tap flow is well-designed:**
  - Tap 1 (zone) -> shows task list with full-width buttons (992x76px)
  - Tap 2 (task) -> shows 3 large status buttons (448x76px): On Track / Delayed / Recovered
  - Tap 3 (status) -> if Delayed, shows variance code picker with 8 large buttons (492x48px)
- **"Back to zones" and "Back" buttons** provide clear navigation
- **Variance code picker is tablet-friendly:** Large buttons for Labor, Material, Prep, Design, Weather, Inspection, Prerequisite, Other
- **Delay duration has +/- stepper buttons** at 48x48px -- good for touch
- **Notes textarea** is generous at 992x96px
- **"Save & Next" button** is prominent at 992x60px
- **"Complete Walk" button** is full-width at 992x56px
- No horizontal overflow at any viewport

#### Issues Found
1. **Nav links still 36px tall** (systemic issue)
2. **"Back to zones" button is 114x44px** -- meets minimum but just barely
3. **"Back" button in task detail is only 50x44px** -- small touch target
4. **Zone grid requires scrolling** -- 24 zones across 4 floors + special areas results in 1859px page height on tablet
5. **No keyboard shortcut or swipe gesture** to move between tasks during a walk
6. **Hamburger menu button on phone is 40x40px** -- below 44px minimum
7. **Zone color status is not explained** -- no legend on the site walk page itself (the map page has one)
8. **Floor labels (Floor 4, Floor 3, etc.) are not sticky** -- when scrolling through zones on a long building, you lose context of which floor you are on
9. **"Done with this zone" button (992x48px)** is good but positioned at bottom requiring scroll past all tasks

#### Recommendations
- Add a color legend near the top: "Green = checked, Red = has delays, Gray = not yet visited"
- Make floor labels sticky with `position: sticky; top: 0;`
- Increase "Back" button width to at least 80px with more padding
- Add swipe-left gesture to advance to next task (common tablet pattern)
- Consider a compact view option that shows zone grid as a 4-column grid to reduce scrolling
- Increase hamburger menu button to 44x44px minimum

---

### 5. Multi-Story Map (`/tracking/schedule/1/map`)

**Dimensions:** 1024 x 896

#### What Works Well
- **Visual building layout** with floors displayed as a stacked building cross-section -- intuitive mental model
- **Color legend** is present and clear: Complete, Delayed, At Risk, Recovered, In Progress, Not Started
- **Floor buttons are well-sized** at 227x62px
- **All zone buttons meet the 48px height minimum**
- **All 3 buildings displayed simultaneously** for comparison
- **Percentage summaries** per building ("100% complete, 0% delayed")
- **"Timeline" back link** for easy navigation
- Fits on screen without scrolling at tablet size (896px height)

#### Issues Found
1. **Nav links undersized** (systemic, 36px)
2. **7 zone cells are only 68px wide** -- while they meet the 44px minimum, the text is cramped with labels like "2 (2PK) / 14 tasks" squeezed into 68px
3. **Font size drops to 10px** on some map elements -- below the 12px minimum for readability
4. **N Building and SW Building appear collapsed/empty** in the default view -- only "Roof" button visible with no floor breakdown shown, which may confuse users
5. **No drill-down interaction documented** -- tapping a zone cell presumably navigates somewhere but the destination is unclear from the map alone
6. **Color-only status indication** -- problematic for color-blind users (no icons or patterns)

#### Recommendations
- Increase minimum cell width to 80px for readability
- Add icons alongside colors for accessibility: checkmark (complete), warning triangle (delayed), arrow (recovered)
- Ensure no text goes below 12px: `min-text-[12px]` or `text-xs` as absolute minimum
- Show floor breakdowns for N Building and SW Building even if empty (with "0 tasks" labels)
- Add tooltips or tap-to-expand on zone cells showing task breakdown

---

### 6. Recovery Scorecard (`/tracking/schedule/1/scorecard`)

**Dimensions:** 1024 x 2549

#### What Works Well
- **Clear KPI summary** at top: 19 total assigned delay days, 18 inherited delay days, 0 recovery points
- **Top 10 Companies bar chart** provides quick visual ranking
- **Full company table** with comprehensive columns: Tasks, Done, Complete %, Assigned Delays, Inherited, Recovery, Rate, Status
- **Color-coded recovery rates** -- 100% in green, 0% in red
- **"Print" button** for generating reports
- **40 companies listed** with clear ranking
- Minimal interactive elements means few touch target issues (content is read-only)

#### Issues Found
1. **Nav links undersized** (systemic, 36px)
2. **Table is 1033px wide on phone** -- overflows the 375px viewport inside a scrollable container, but discoverability of horizontal scroll is poor
3. **No horizontal scroll indicator** for the table on narrow viewports
4. **"Print" button and "Timeline" link are the only 2 interactive elements** besides nav -- both above 44px
5. **All companies show 100% or 0% recovery** with no granularity -- the "dashes" for delay columns suggest walk data has not been fully entered yet, which could confuse users
6. **No explanation of "Inherited" vs "Assigned" delays** -- domain-specific terms without tooltips
7. **Company names lack spaces** (e.g., "FireSprinkler", "CeilingTexture", "Mud&Tape") -- appears to be an import artifact
8. **2549px page height** -- long scroll to see all 40 companies on tablet

#### Recommendations
- Add a horizontal scroll indicator (fade gradient or "scroll for more" hint) on the table at narrow viewports
- Add info tooltips for "Assigned Delays", "Inherited", and "Recovery" column headers
- Fix company name formatting: add spaces before capital letters (e.g., "Fire Sprinkler", "Ceiling Texture")
- Consider a collapsible table or "Top 10 / Show All" toggle to reduce scroll
- Add a "No walk data recorded yet" notice for companies with all dashes

---

## Overall Assessment

### Information Architecture -- Rating: 4/5

**Strengths:**
- Logical flow: Dashboard -> Schedule -> Site Walk/Map/Scorecard
- Each page has clear purpose and minimal overlap
- Navigation between views (Timeline, Site Walk, Map, Scorecard) is always one tap away
- Plan-level navigation from dashboard is efficient

**Weaknesses:**
- No breadcrumbs showing current location within the hierarchy
- "Plan #1" label in the nav is not descriptive -- should show project/building name
- Import page is a top-level nav item but is rarely used after initial setup

**Recommendations:**
- Add breadcrumbs: Dashboard > HV - BROOKLYN > Site Walk
- Move Import to a settings/gear menu to reduce nav clutter
- Show the project name prominently in the header when inside a schedule

### Tablet Usability -- Rating: 3.5/5

**Strengths:**
- Site Walk zone grid, task list, status buttons, and variance picker are all excellently sized for touch
- Building tab buttons at 48px height
- No horizontal overflow on any page at tablet width (768px)
- `active:scale-95` provides touch feedback on zone buttons
- Zone buttons have generous 68px height

**Weaknesses:**
- **Navigation bar links are 36px tall on every single page** -- this is the most pervasive touch target issue
- Timeline filter controls (date inputs, dropdowns, checkboxes) are all undersized
- Hamburger menu button on phone is 40x40px (below 44px)
- Long scrolling on Timeline (12,357px) and Scorecard (2,549px) without sticky headers

**Recommendations:**
- Global fix: Add `min-h-[48px] flex items-center` to all nav links
- Add `min-h-[48px]` to all form controls (inputs, selects, buttons) in the filter bar
- Make filter bars sticky on scroll
- Replace the tiny checkbox with a large toggle button

### Visual Hierarchy -- Rating: 4/5

**Strengths:**
- Clear heading hierarchy (H1 brand, H2 page title, H3 sections)
- Summary stats are prominent at the top of each page
- Color coding for zone status is intuitive (green/red/gray/indigo)
- Active navigation state uses blue highlight (bg-blue-100 text-blue-700)
- "Complete Walk" and "Save & Next" buttons are visually dominant

**Weaknesses:**
- Timeline task cards all look the same weight -- no visual distinction between delayed vs. on-track tasks
- Scorecard table rows have equal visual weight for 100% and 0% recovery companies
- Map page does not visually emphasize buildings with issues

**Recommendations:**
- Add left border color to Timeline task cards based on status (red border for delayed, green for complete)
- Bold or highlight Scorecard rows with 0% recovery rate
- Add a pulsing or highlighted state to Map buildings with delays

### Consistency -- Rating: 4.5/5

**Strengths:**
- Font sizes are consistent: 20px for page titles, 16px for body, 14px for secondary, 12px for metadata
- Color palette is consistent (Tailwind blue-600 primary, green for success, red for delay, gray for neutral)
- Button styles are consistent (rounded-xl, consistent padding patterns)
- Navigation bar is identical across all pages
- Card/section styling with consistent rounded corners and shadows

**Weaknesses:**
- 10px font size appears on the Map page only -- inconsistent with 12px minimum elsewhere
- "Back to zones" button style differs from "Back" button in task detail view
- Zone color meanings differ slightly between Site Walk (indigo = has entries) and Map (indigo = in progress)

**Recommendations:**
- Enforce 12px as the absolute minimum font size globally
- Standardize back button styling and size across all sub-views
- Unify color meanings across Site Walk and Map views with a shared legend

### Accessibility -- Rating: 3/5

**Strengths:**
- Color contrast passes WCAG AA on all sampled text elements -- dark text (rgb(17,24,39)) on light backgrounds
- Focus rings are present on all buttons (browser default `outline: auto 1px`)
- Semantic HTML: proper heading hierarchy, button elements for interactive zones
- Page titles are descriptive

**Weaknesses:**
- **Color-only status indication** on Map and Site Walk -- no icons, patterns, or text labels for color-blind users
- **13x13px checkbox** on Timeline is an accessibility failure (not operable for motor impairments)
- Focus rings use browser defaults -- not customized for visibility
- No ARIA labels on navigation landmarks
- No skip-to-content link
- Zone buttons do not announce their status to screen readers (e.g., "4D, 12 tasks, delayed" vs just "4D, 12 tasks")

**Recommendations:**
- Add status icons alongside colors (checkmark, warning, clock)
- Add `aria-label` to zone buttons including status: `aria-label="Zone 4D, 12 tasks, delayed"`
- Add `role="navigation"` and `aria-label` to nav elements
- Add a skip-to-content link
- Customize focus rings: `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`
- Replace the 13px checkbox with a 48px toggle component

### Performance Feel -- Rating: 4.5/5

**Strengths:**
- All pages load in approximately 1 second (measured: 970ms-1,101ms)
- No perceptible jank or layout shift during testing
- Site Walk three-tap flow transitions are instant (client-side state changes)
- Page content renders completely -- no partial loading observed

**Weaknesses:**
- No loading skeletons or shimmer states during the ~1s load
- Timeline renders all 203 tasks at once (12,357px page) with no virtualization
- No optimistic UI updates when saving walk entries

**Recommendations:**
- Add skeleton screens for the initial ~1s load
- Virtualize the Timeline task list (render only visible tasks + buffer)
- Add optimistic updates on "Save & Next" with a subtle success toast

---

## Priority Fix List

### P0 -- Fix Immediately (impacts every page)
1. **Navigation link height:** Change all nav links from 36px to 48px minimum
   ```css
   /* In nav link component */
   .nav-link { min-height: 48px; display: flex; align-items: center; }
   ```

### P1 -- Fix Soon (impacts primary workflows)
2. **Timeline filter controls:** Increase all inputs, selects, and buttons to 48px height
3. **Timeline checkbox (13x13px):** Replace with a 48px toggle button
4. **Sticky filter bar on Timeline:** Add `position: sticky; top: 0;`
5. **Hamburger menu button:** Increase from 40px to 44px minimum

### P2 -- Fix Before Launch (quality and accessibility)
6. **Color-blind accessibility:** Add status icons alongside color coding on Map and Site Walk
7. **Zone button ARIA labels:** Include status in screen reader announcements
8. **Map minimum font size:** Enforce 12px minimum (currently has 10px text)
9. **Scorecard table horizontal scroll hint** on phone viewports
10. **Company name formatting:** Add spaces to concatenated names

### P3 -- Nice to Have (polish)
11. Loading skeletons for all pages
12. Timeline task list pagination or virtualization
13. Sticky floor labels on Site Walk zone grid
14. Swipe gestures for task navigation during walks
15. Breadcrumb navigation
16. Tooltips for scorecard column headers

---

## Methodology

This audit was conducted using Puppeteer (v24.40.0) in headless Chrome with the following tests:

- **Viewports tested:** 1024x768 (tablet landscape), 768x1024 (tablet portrait), 375x812 (phone)
- **Touch targets:** Measured all interactive elements against the 44px WCAG/Apple minimum
- **Color contrast:** Computed luminance ratios for foreground/background color pairs against WCAG AA (4.5:1 for normal text, 3:1 for large text)
- **Horizontal overflow:** Checked `scrollWidth > innerWidth` at each viewport
- **Focus states:** Verified outline/box-shadow presence on focused elements
- **Page load times:** Measured `goto` with `networkidle2` wait condition
- **Interactive flow:** Simulated the complete three-tap Site Walk flow (zone -> task -> status -> variance code)
- **Pages audited:** 6 (Dashboard, Import, Timeline, Site Walk, Map, Scorecard)
