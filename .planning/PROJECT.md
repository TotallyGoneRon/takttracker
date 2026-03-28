# Takt Flow Tracking App — Review & Improvement

## What This Is

A standalone takt schedule tracking app for construction project managers. It imports inTakt XLSX exports, tracks task progress across zones/floors/buildings, records site walk observations, scores trade performance via a recovery system, and flags cascading delays. Currently deployed at jobsitenexus.com/tracking and used daily by Ron for the HV Brooklyn project.

## Core Value

Give a construction PM an accurate, at-a-glance picture of schedule health — which trades are on track, which are falling behind, and what the downstream impact looks like — so they can act before problems cascade.

## Requirements

### Validated

- ✓ Import inTakt XLSX schedules with automatic zone/building/company detection — existing
- ✓ View task timeline grouped by building with status indicators — existing
- ✓ Record site walk observations with three-tap workflow (zone → task → status) — existing
- ✓ Track and propagate delays through predecessor/successor relationships — existing
- ✓ Calculate recovery points when trades absorb inherited delays — existing
- ✓ Generate per-company scorecard with delay and recovery metrics — existing
- ✓ Flag cascading delays on higher floors via predictive system — existing
- ✓ View schedule on interactive floor plan map — existing
- ✓ Manage company assignments to activities — existing
- ✓ Configure delay weight settings per project — existing (route exists, schema incomplete)
- ✓ Standalone deployment at /tracking basePath — existing
- ✓ Shared UI component library (shadcn/ui) with consistent status colors — Phase 1
- ✓ Reusable SWR data fetching hooks with skeleton loading — Phase 1
- ✓ Database backup and migration infrastructure — Phase 1
- ✓ Missing schema tables and columns fixed (delayWeights, importChangelog) — Phase 1

### Active

- [ ] Full front-end and feature audit (UX, bugs, code quality, feature gaps)
- [ ] Scorecard overhaul — task-level detail, trend over time, trade breakdown
- [ ] UI/UX overhaul — dashboard-rich on desktop, clean/task-focused on mobile
- [ ] Fix security issues (no auth, SSRF in sync, no input validation)
- [ ] Fix performance bottlenecks (N+1 queries, full table scans, no pagination)
- [ ] Responsive design across all pages

### Out of Scope

- Multi-user authentication system — single user for now, revisit later
- Migration to PostgreSQL — SQLite is fine for single-user
- Offline/PWA support — sync endpoint is stubbed but not priority
- Multi-project support — focused on HV Brooklyn for now

## Context

- Brownfield codebase: Next.js 14 App Router, Drizzle ORM, SQLite (WAL mode), Tailwind CSS
- 17 database tables, ~40 source files, deployed as standalone build
- Built by AI assistants across multiple sessions — some inconsistencies in patterns
- Three existing UX review documents in repo (UX-REVIEW.md, UX-REVIEW-ROUND2.md, UX-CODE-REVIEW.md)
- Part of larger Jobsite Nexus platform (monorepo at projects/jobsite-nexus) but managed independently
- Server: 191.101.14.158, deployed via PM2 standalone build

## Constraints

- **Stack**: Keep Next.js 14 + Drizzle + SQLite + Tailwind — no framework changes
- **Deployment**: Must continue working at /tracking basePath on jobsitenexus.com
- **User**: Single PM user (Ron) — optimize for one person's workflow, not multi-tenant
- **Data**: Existing SQLite database with live project data — migrations must be non-destructive

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Review before rebuild | Need clear picture of issues before planning fixes | — Pending |
| Responsive over mobile-only | Dashboard-rich on PC, clean on mobile — both contexts matter | — Pending |
| Keep SQLite | Single user, no concurrency issues, simple deployment | — Pending |
| Scorecard as priority feature | Current scorecard lacks detail Ron needs for daily decisions | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-28 after Phase 1 completion*
