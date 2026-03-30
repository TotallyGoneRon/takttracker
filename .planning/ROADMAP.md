# Roadmap: Takt Flow — Review & Improvement

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-03-29)
- ✅ **v1.1 Site Walk Overhaul** — Phases 5-7 (shipped 2026-03-30)
- **v1.2 Scoring & Delay Overhaul** — Phases 8-10 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-4) — SHIPPED 2026-03-29</summary>

- [x] Phase 1: Foundation & Safeguards (3/3 plans) — shadcn/ui, SWR, DB backup, schema fixes
- [x] Phase 2: Scorecard Enhancement (2/2 plans) — service layer, UI with drill-down + charts
- [x] Phase 3: Responsive Dashboard & Layout (4/4 plans) — Health Index, BottomNav, collapsible timeline
- [x] Phase 4: Code Quality & API Hardening (4/4 plans) — Zod validation, N+1 fixes, basePath cleanup

See: `.planning/milestones/v1.0-ROADMAP.md` for full details

</details>

<details>
<summary>v1.1 Site Walk Overhaul (Phases 5-7) — SHIPPED 2026-03-30</summary>

- [x] Phase 5: Photo Capture & Richer Observations (3/3 plans) — camera capture, severity picker, percent complete, entry cards
- [x] Phase 6: Walk Summary Report (2/2 plans) — company grouping, delayed details, next-up trades, trend arrows
- [x] Phase 7: Walk History & Bug Fixes (2/2 plans) — walk history page, companies fix, scorecard fix, statusColors cleanup

See: `.planning/milestones/v1.1-ROADMAP.md` for full details

</details>

### v1.2 Scoring & Delay Overhaul

**Milestone Goal:** Restructure delay recording around task completion instead of walk observations, add prerequisite delay matching, handle historical delays, and enable delay record management with downstream recalculation.

- [ ] **Phase 8: Completion-Based Delay Recording** - Move delay creation from walks to task completion, scoring on completion only
- [ ] **Phase 9: Prerequisite Matching & Historical Delays** - Link delays to predecessors, handle pre-existing delays
- [ ] **Phase 10: Delay Management & Recalculation** - Edit/delete delays with cascading recalculation

## Phase Details

### Phase 8: Completion-Based Delay Recording
**Goal**: Delays are recorded when tasks are marked complete, not during walk observations
**Depends on**: Phase 7
**Requirements**: DELAY-01, DELAY-02, DELAY-03, SCORE-01
**Success Criteria** (what must be TRUE):
  1. When marking a task complete, user is prompted to indicate if it was late and can record delay days and reason
  2. Walk recording shows only On Track, Delayed, and Completed status options — no "Recovered" choice
  3. Walk recording no longer shows variance code or delay days fields — delays are not created during walks
  4. Recovery points are only calculated for tasks that have been marked complete — incomplete tasks show no recovery score
**Plans**: TBD
**UI hint**: yes

### Phase 9: Prerequisite Matching & Historical Delays
**Goal**: Prerequisite delays link to their cause, and pre-existing delays from before tool adoption are accounted for
**Depends on**: Phase 8
**Requirements**: PREREQ-01, PREREQ-02, HIST-01, HIST-02
**Success Criteria** (what must be TRUE):
  1. When a delay reason is "prerequisite," the system finds and links existing assigned delays on predecessor trades in the same zone
  2. User can see which predecessor trade caused an inherited delay, with a link to the original delay record
  3. User can bulk-mark tasks as delayed before tool adoption (one-time setup for pre-existing delays)
  4. Historical delays are visually distinguished from tool-recorded delays in the scorecard and delay views
**Plans**: TBD
**UI hint**: yes

### Phase 10: Delay Management & Recalculation
**Goal**: Users can correct delay records and the system keeps all downstream scores consistent
**Depends on**: Phase 9
**Requirements**: MGMT-01, MGMT-02, MGMT-03, MGMT-04, SCORE-02
**Success Criteria** (what must be TRUE):
  1. User can delete a delay record that was created by mistake
  2. User can edit the delay days or reason on an existing delay record
  3. When a delay record is deleted or edited, inherited delays on successor tasks update automatically
  4. When a delay record changes, recovery scores on affected completed tasks recalculate automatically
  5. Changing a task's completion date triggers recovery score recalculation for that task and its dependents
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Safeguards | v1.0 | 3/3 | Complete | 2026-03-27 |
| 2. Scorecard Enhancement | v1.0 | 2/2 | Complete | 2026-03-27 |
| 3. Responsive Dashboard & Layout | v1.0 | 4/4 | Complete | 2026-03-28 |
| 4. Code Quality & API Hardening | v1.0 | 4/4 | Complete | 2026-03-29 |
| 5. Photo Capture & Richer Observations | v1.1 | 3/3 | Complete | 2026-03-29 |
| 6. Walk Summary Report | v1.1 | 2/2 | Complete | 2026-03-29 |
| 7. Walk History & Bug Fixes | v1.1 | 2/2 | Complete | 2026-03-29 |
| 8. Completion-Based Delay Recording | v1.2 | 0/? | Not started | - |
| 9. Prerequisite Matching & Historical Delays | v1.2 | 0/? | Not started | - |
| 10. Delay Management & Recalculation | v1.2 | 0/? | Not started | - |
