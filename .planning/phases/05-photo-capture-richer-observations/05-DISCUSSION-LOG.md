# Phase 5: Photo Capture & Richer Observations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 05-photo-capture-richer-observations
**Areas discussed:** Photo Capture UX, Photo Viewing, Observation Fields, Entry Card Density

---

## Photo Capture UX

### Q1: Where should the camera button appear?

| Option | Description | Selected |
|--------|-------------|----------|
| After status tap | Three-tap flow stays identical. Camera icon appears on saved entry card. | ✓ |
| Inline during recording | Camera button in status selection step alongside On Track / Delayed | |
| Floating action button | Persistent FAB in corner, attaches to most recent entry | |

**User's choice:** After status tap
**Notes:** Preserves the three-tap fast path completely. Camera is optional post-recording.

### Q2: How many photos per entry?

| Option | Description | Selected |
|--------|-------------|----------|
| One photo per entry | One tap = one photo. Retake replaces existing. Simple and fast. | ✓ |
| Up to 3 photos | Multiple angles. Camera icon shows count badge. | |
| Unlimited photos | No limit. Most flexible but storage/loading concerns. | |

**User's choice:** One photo per entry
**Notes:** Retake replaces existing photo. No gallery management needed.

### Q3: Camera mechanism?

| Option | Description | Selected |
|--------|-------------|----------|
| HTML file input | Standard `<input capture="environment">`. Phone camera opens natively. | ✓ |
| MediaStream API | In-browser viewfinder. More app-like but permissions hassle. | |

**User's choice:** HTML file input
**Notes:** Works on iOS + Android without extra permissions.

---

## Photo Viewing

### Q1: How to view photos after capture?

| Option | Description | Selected |
|--------|-------------|----------|
| Tap thumbnail for fullscreen | Small thumbnail on card, tap for full-screen overlay with X to close. | ✓ |
| Inline expanded preview | Thumbnail expands in-place within entry card. | |
| Thumbnails only, no expand | Small thumbnail is enough. Minimal. | |

**User's choice:** Tap thumbnail for fullscreen
**Notes:** Standard mobile pattern. Full photo in overlay.

### Q2: Fullscreen overlay actions?

| Option | Description | Selected |
|--------|-------------|----------|
| Delete + Retake | Two actions: delete removes, retake opens camera to replace. | ✓ |
| Delete only | Just delete. Retake by deleting then tapping camera again. | |

**User's choice:** Delete + Retake
**Notes:** Both actions in the overlay for convenience.

---

## Observation Fields

### Q1: How are severity and percent complete revealed?

| Option | Description | Selected |
|--------|-------------|----------|
| Expand row on tap | Chevron icon expands detail section with severity, percent, notes. Collapsed by default. | ✓ |
| Slide-out sheet | Bottom sheet with all fields. Clean entry list. | |
| Status-conditional only | Fields auto-show based on entry status. | |

**User's choice:** Expand row on tap
**Notes:** Collapsed by default keeps fast path clean.

### Q2: Available on all entries or contextual?

| Option | Description | Selected |
|--------|-------------|----------|
| All entries | Both fields on every entry regardless of status. Simple. | ✓ |
| Contextual only | Severity only on Delayed, percent only on In Progress/Delayed. | |

**User's choice:** All entries
**Notes:** No conditional logic. User decides when fields are useful.

### Q3: Severity selection style?

| Option | Description | Selected |
|--------|-------------|----------|
| Color-coded button group | Four buttons: Low/Medium/High/Critical with color coding. One tap. | ✓ |
| Dropdown select | Standard dropdown. Requires two taps. | |
| Icon rating | 1-4 warning icons. Compact but abstract. | |

**User's choice:** Color-coded button group
**Notes:** Visual and fast. Tap to set, tap again to unset.

---

## Entry Card Density

### Q1: Collapsed state display?

| Option | Description | Selected |
|--------|-------------|----------|
| Badges only | Compact icon badges: camera, severity dot, percent number. Details in expanded view. | ✓ |
| Thumbnail + badges | Small photo thumbnail visible alongside badges. Taller cards. | |
| Minimal — status only | Zero indication of photos/observations until expanded. | |

**User's choice:** Badges only
**Notes:** Maximizes entries visible per screen. All detail in expand view.

---

## Claude's Discretion

- Percent complete UI control style
- Component extraction strategy for 961-line site-walk page
- Photo thumbnail size and aspect ratio
- Notes field save behavior
- Expand/collapse animation style

## Deferred Ideas

None — discussion stayed within phase scope
