# Roadmap: Takt Flow — Review & Improvement

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-03-29)
- 🚧 **v1.1 Site Walk Overhaul** — Phases 5-7 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-03-29</summary>

- [x] Phase 1: Foundation & Safeguards (3/3 plans) — shadcn/ui, SWR, DB backup, schema fixes
- [x] Phase 2: Scorecard Enhancement (2/2 plans) — service layer, UI with drill-down + charts
- [x] Phase 3: Responsive Dashboard & Layout (4/4 plans) — Health Index, BottomNav, collapsible timeline
- [x] Phase 4: Code Quality & API Hardening (4/4 plans) — Zod validation, N+1 fixes, basePath cleanup

See: `.planning/milestones/v1.0-ROADMAP.md` for full details

</details>

### 🚧 v1.1 Site Walk Overhaul (In Progress)

**Milestone Goal:** Make site walks the richest, most useful field tool possible while keeping mobile-first speed — quick taps stay the happy path, richer detail is always optional.

- [ ] **Phase 5: Photo Capture & Richer Observations** - Component extraction, photo infrastructure, camera capture in wizard, severity + percent complete fields
- [ ] **Phase 6: Walk Summary Report** - Dedicated summary page with company grouping, delayed task details, next-up trades, and walk-to-walk trend
- [ ] **Phase 7: Walk History & Bug Fixes** - Past walk list with summary stats, plus companies plan ID fix, scorecard dead link fix, and statusColors cleanup

## Phase Details

### Phase 5: Photo Capture & Richer Observations
**Goal**: User can snap photos during site walks and optionally tag entries with severity and percent complete, without slowing down the three-tap recording flow
**Depends on**: Phase 4
**Requirements**: PHOTO-01, PHOTO-02, PHOTO-03, PHOTO-04, OBS-01, OBS-02
**Success Criteria** (what must be TRUE):
  1. User can tap a camera icon on any entry during a site walk and snap a photo from the phone's rear camera
  2. Photo thumbnails appear inline on entries within seconds of capture — no full-size image loading on cell connections
  3. Entries with photos show a count badge so the user knows at a glance which entries are documented
  4. User can mark a delayed entry with severity (Low/Medium/High/Critical) and an in-progress entry with percent complete (0/25/50/75/100) — both fields hidden by default, never blocking the fast path
  5. On-track entry recording speed is identical to pre-v1.1 (three taps: zone, task, status)
**Plans**: 3 plans
Plans:
- [x] 05-01-PLAN.md — Schema migration + photo API routes + entry update endpoint
- [x] 05-02-PLAN.md — Component extraction of 961-line site-walk monolith
- [x] 05-03-PLAN.md — Photo capture UI + observation fields + entry card badges
**UI hint**: yes

### Phase 6: Walk Summary Report
**Goal**: After completing a walk, user can view a field-report-style summary that answers "who's on track, who's behind, and what's coming next"
**Depends on**: Phase 5
**Requirements**: SUM-01, SUM-02, SUM-03, SUM-04
**Success Criteria** (what must be TRUE):
  1. Walk summary groups entries by company showing which trades completed on time vs which are behind
  2. Delayed entries in the summary show actionable detail: task name, zone, variance code, delay days, and severity
  3. Summary includes a "Next up" section showing trades scheduled for the next 2-3 days with dates
  4. Summary shows walk-to-walk trend comparison (better/worse/same vs the last walk)
**Plans**: 2 plans
Plans:
- [x] 06-01-PLAN.md — Data layer: extend EntryRecord type, fix saveEntry, summary API endpoint
- [x] 06-02-PLAN.md — WalkSummary UI rewrite with company grouping, delayed detail, next-up, trend
**UI hint**: yes

### Phase 7: Walk History & Bug Fixes
**Goal**: User can review past walks over time and three existing bugs are resolved
**Depends on**: Phase 6
**Requirements**: HIST-01, FIX-01, FIX-02, FIX-03
**Success Criteria** (what must be TRUE):
  1. User can view a list of past walks with summary stats (date, entry counts, status breakdown) to track trends across days and weeks
  2. Companies page shows data for the active plan, not hardcoded plan ID 1
  3. Scorecard "View downstream impact" link navigates to a working destination
  4. All pages use the shared statusColors.ts module — no local color constant definitions remain
**Plans**: 2 plans
Plans:
- [ ] 07-01-PLAN.md — Bug fixes: companies plan ID, scorecard dead link, statusColors cleanup
- [x] 07-02-PLAN.md — Walk history page with card-based list and WalkSummary link
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 5 -> 6 -> 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Safeguards | v1.0 | 3/3 | Complete | 2026-03-27 |
| 2. Scorecard Enhancement | v1.0 | 2/2 | Complete | 2026-03-27 |
| 3. Responsive Dashboard & Layout | v1.0 | 4/4 | Complete | 2026-03-28 |
| 4. Code Quality & API Hardening | v1.0 | 4/4 | Complete | 2026-03-29 |
| 5. Photo Capture & Richer Observations | v1.1 | 0/3 | Planned | - |
| 6. Walk Summary Report | v1.1 | 0/2 | Planned | - |
| 7. Walk History & Bug Fixes | v1.1 | 0/2 | Not started | - |
