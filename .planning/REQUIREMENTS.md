# Requirements: Takt Flow — Review & Improvement

**Defined:** 2026-03-27
**Core Value:** Give a construction PM an accurate, at-a-glance picture of schedule health so they can act before problems cascade.

## v1 Requirements

### Foundation

- [x] **FOUND-01**: Shared UI component library initialized (shadcn/ui) with consistent status colors across all pages
- [x] **FOUND-02**: Reusable data fetching hooks replace scattered useState/useEffect/fetch patterns on all client pages
- [x] **FOUND-03**: Database backup script that snapshots takt-flow.db before any schema change
- [x] **FOUND-04**: Drizzle migration infrastructure set up with tracked migration history
- [x] **FOUND-05**: Missing schema tables added (delayWeights, importChangelog) and broken routes fixed
- [x] **FOUND-06**: Missing task columns added (prev_planned_start, prev_planned_end) via non-destructive migration

### Scorecard

- [ ] **SCORE-01**: User can click a trade on the scorecard to see task-level detail (which tasks are behind, on track, or ahead)
- [ ] **SCORE-02**: Scorecard shows performance trend over time via weekly charts (requires snapshot table)
- [ ] **SCORE-03**: Scorecard displays per-trade breakdown with comparison view (delay days, recovery rate, task completion)
- [ ] **SCORE-04**: Scorecard shows Percent Plan Complete (PPC) metric calculated from existing site walk data
- [ ] **SCORE-05**: Scorecard service layer extracted from recovery-engine with filtered queries (no full table scans)

### UI/Layout

- [x] **UILAY-01**: Responsive layout across all pages — dashboard-rich on desktop, clean/task-focused on mobile
- [x] **UILAY-02**: Mobile bottom navigation bar for field use (replaces top-nav-only pattern)
- [x] **UILAY-03**: Dashboard overhaul with Schedule Health Index, key metrics at a glance, and quick actions
- [x] **UILAY-04**: Timeline uses virtual scroll or pagination instead of rendering all 200+ tasks
- [x] **UILAY-05**: Skeleton loading states on all data-dependent pages

### Code Quality

- [ ] **QUAL-01**: Zod schema validation on all API route request bodies
- [ ] **QUAL-02**: Integer parameter parsing validates for NaN on all dynamic routes
- [ ] **QUAL-03**: N+1 query patterns fixed in import, companies, and scorecard routes
- [ ] **QUAL-04**: BasePath references use Next.js helpers instead of hardcoded /tracking/ strings
- [ ] **QUAL-05**: SSRF vulnerability fixed in sync endpoint (path validation)

## v2 Requirements

### Advanced Analytics

- **ANLYT-01**: Cascading delay visualization showing downstream impact tree
- **ANLYT-02**: PDF export of scorecard and schedule reports for owner meetings
- **ANLYT-03**: Configurable Schedule Health Index weights (SPI + PPC + compression)

### Field Features

- **FIELD-01**: Offline/PWA support for site walks without connectivity
- **FIELD-02**: Photo attachment to site walk entries with thumbnails
- **FIELD-03**: Constraint checklist completion tracking during site walks

### Platform

- **PLAT-01**: Multi-project support (switch between projects)
- **PLAT-02**: Authentication layer for shared access
- **PLAT-03**: Automated daily database backups

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-user auth system | Single user for now — revisit when sharing with trades |
| PostgreSQL migration | SQLite is fine for single-user, no concurrency issues |
| Mobile native app | Responsive web covers field use adequately |
| Real-time collaboration | Single user — no need for live sync |
| Gantt chart view | Takt schedule is zone-based, not activity-based — Gantt doesn't fit |
| Integration with P6/MS Project | Import from inTakt covers the workflow |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 1 | Complete |
| FOUND-06 | Phase 1 | Complete |
| SCORE-01 | Phase 2 | Pending |
| SCORE-02 | Phase 2 | Pending |
| SCORE-03 | Phase 2 | Pending |
| SCORE-04 | Phase 2 | Pending |
| SCORE-05 | Phase 2 | Pending |
| UILAY-01 | Phase 3 | Complete |
| UILAY-02 | Phase 3 | Complete |
| UILAY-03 | Phase 3 | Complete |
| UILAY-04 | Phase 3 | Complete |
| UILAY-05 | Phase 3 | Complete |
| QUAL-01 | Phase 4 | Pending |
| QUAL-02 | Phase 4 | Pending |
| QUAL-03 | Phase 4 | Pending |
| QUAL-04 | Phase 4 | Pending |
| QUAL-05 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-03-27*
*Last updated: 2026-03-27 after roadmap creation*
