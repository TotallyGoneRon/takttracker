---
status: partial
phase: 03-responsive-dashboard-layout
source: [03-VERIFICATION.md]
started: 2026-03-29T00:50:00Z
updated: 2026-03-29T00:50:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Bottom nav active tab states
expected: Each tab highlights in blue-600 when on its corresponding route (Home at /, Timeline at /schedule/:id, Walk at /schedule/:id/site-walk, Score at /schedule/:id/scorecard); other tabs remain gray-500
result: [pending]

### 2. Mobile dashboard layout at 375px viewport
expected: Only the Health Index number card and three quick-action buttons are visible. PPC card, SPI card, Top Performers list, and Needs Attention list should be hidden entirely.
result: [pending]

### 3. Collapsible timeline expand/collapse behavior
expected: Clicking a building header expands it revealing floor groups; clicking a floor group reveals tasks; collapse works; expand state persists when changing status filter but resets when changing building filter
result: [pending]

### 4. Bottom padding clears bottom nav on mobile
expected: On all pages within /schedule/:planId/*, the last content item is not obscured by the bottom nav bar (pb-20 provides 80px clearance)
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
