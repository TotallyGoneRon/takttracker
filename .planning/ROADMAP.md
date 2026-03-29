# Roadmap: Takt Flow — Review & Improvement

## Overview

This brownfield improvement project stabilizes the Takt Flow tracking app's foundation (shared components, migration safety, data hooks), then delivers the high-value scorecard overhaul, followed by a responsive dashboard/layout pass across all pages, and finishes with API hardening and code quality fixes. Each phase builds on the prior: foundation enables features, features prove the component system, and the stable architecture makes code quality work safe.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Safeguards** - Shared UI components, data hooks, migration infrastructure, and database backup strategy
- [ ] **Phase 2: Scorecard Enhancement** - Task-level drill-down, trend-over-time charts, PPC metric, and extracted service layer
- [ ] **Phase 3: Responsive Dashboard & Layout** - Desktop-rich dashboard, mobile bottom nav, responsive treatment on all pages, virtual scroll
- [ ] **Phase 4: Code Quality & API Hardening** - Zod validation, missing schema tables, N+1 fixes, basePath cleanup, SSRF fix

## Phase Details

### Phase 1: Foundation & Safeguards
**Goal**: Every page uses shared UI primitives and consistent data patterns, and schema changes can be made safely against production data
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06
**Success Criteria** (what must be TRUE):
  1. Status colors are identical across every page in the app (schedule, scorecard, site walk, map)
  2. All data-dependent pages show skeleton loading states instead of blank/flash
  3. Database can be backed up with a single command before any schema change
  4. Missing schema tables (delayWeights, importChangelog) exist and their routes return data instead of errors
  5. Adding a new column to an existing table uses a tracked Drizzle migration file, not db:push
**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md — Database backup script, schema sync, migration infrastructure
- [x] 01-02-PLAN.md — shadcn/ui init, status color system, page color migration
- [x] 01-03-PLAN.md — SWR data fetching hooks, skeleton loading states

### Phase 2: Scorecard Enhancement
**Goal**: Ron can use the scorecard to prepare for weekly OAC meetings with trade-level detail, trend data, and PPC metrics
**Depends on**: Phase 1
**Requirements**: SCORE-01, SCORE-02, SCORE-03, SCORE-04, SCORE-05
**Success Criteria** (what must be TRUE):
  1. User can click any trade on the scorecard and see its individual tasks with delay/recovery status
  2. User can view a trend chart showing how each trade's performance has changed over recent weeks
  3. Scorecard displays a Percent Plan Complete (PPC) number calculated from site walk data
  4. Scorecard page loads without triggering full table scans (service layer extracted from recovery-engine)
**Plans:** 2 plans
**UI hint**: yes

Plans:
- [ ] 02-01-PLAN.md — Scorecard service layer extraction with filtered queries, PPC, trends, and enriched API response
- [ ] 02-02-PLAN.md — Scorecard page UI rewrite with stat cards, drill-down panel, trend charts, and PPC display

### Phase 3: Responsive Dashboard & Layout
**Goal**: The app provides a dashboard-rich experience on desktop and a clean, thumb-friendly experience on mobile across all pages
**Depends on**: Phase 2
**Requirements**: UILAY-01, UILAY-02, UILAY-03, UILAY-04, UILAY-05
**Success Criteria** (what must be TRUE):
  1. Desktop dashboard shows key metrics (schedule health, delay summary, top/bottom trades) above the fold in a multi-column layout
  2. Mobile users navigate via bottom tab bar instead of top-only navigation
  3. Timeline page handles 200+ tasks without browser lag (virtual scroll or pagination)
  4. Every page renders usably on both a 27-inch monitor and a phone held one-handed in the field
**Plans:** 3 plans
**UI hint**: yes

Plans:
- [x] 03-01-PLAN.md — Health Index calculation library and dashboard overhaul with hero metric, stat cards, top/bottom trades
- [x] 03-02-PLAN.md — Mobile bottom navigation bar, NavBar slim variant, layout padding for bottom nav
- [x] 03-03-PLAN.md — Timeline collapsible building/floor groups and responsive pass on all remaining pages

### Phase 4: Code Quality & API Hardening
**Goal**: API routes validate all inputs, known query performance issues are fixed, and no security vulnerabilities remain in production
**Depends on**: Phase 3
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05
**Success Criteria** (what must be TRUE):
  1. Sending malformed JSON or invalid parameters to any API route returns a structured error, not a 500
  2. The sync endpoint rejects requests attempting to access paths outside the allowed scope (SSRF fixed)
  3. Import, companies, and scorecard routes use joined queries instead of N+1 patterns
  4. All internal links and fetch calls work correctly at the /tracking basePath without hardcoded path strings
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Safeguards | 0/3 | Planning complete | - |
| 2. Scorecard Enhancement | 0/2 | Planning complete | - |
| 3. Responsive Dashboard & Layout | 0/3 | Planning complete | - |
| 4. Code Quality & API Hardening | 0/? | Not started | - |

## Backlog

### Phase 999.1: Site Walk UX Overhaul (BACKLOG)

**Goal:** Clean up the site walk page UI/UX, improve the recording workflow, and fix any data integrity issues with walk observations
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)
