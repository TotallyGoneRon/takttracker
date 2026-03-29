# Takt Flow Tracking App — Review & Improvement

## What This Is

A standalone takt schedule tracking app for construction project managers. It imports inTakt XLSX exports, tracks task progress across zones/floors/buildings, records site walk observations, scores trade performance via a recovery system, and flags cascading delays. Features a dashboard with Schedule Health Index, responsive mobile-first layout with bottom navigation for field use, and Zod-validated API routes. Deployed at jobsitenexus.com/tracking and used daily by Ron for the HV Brooklyn project.

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
- ✓ Configure delay weight settings per project — existing
- ✓ Standalone deployment at /tracking basePath — existing
- ✓ Shared UI component library (shadcn/ui) with skeleton loading — v1.0
- ✓ Reusable SWR data fetching hooks with basePath-aware fetcher — v1.0
- ✓ Database backup and migration infrastructure — v1.0
- ✓ Missing schema tables and columns fixed (delayWeights, importChangelog) — v1.0
- ✓ Dashboard with Health Index hero metric, PPC, SPI, top/bottom trades — v1.0
- ✓ Mobile bottom navigation bar for field use — v1.0
- ✓ Collapsible building/floor timeline groups for 200+ task handling — v1.0
- ✓ Responsive design across all 8 pages (desktop + mobile) — v1.0
- ✓ Zod input validation on all API routes with structured error responses — v1.0
- ✓ N+1 query fixes on companies, flags, and site-walks routes — v1.0
- ✓ SSRF-vulnerable sync endpoint removed — v1.0
- ✓ All client pages migrated to SWR/apiMutate (zero hardcoded basePath strings) — v1.0
- ✓ Scorecard service layer with filtered queries and PPC metrics — v1.0
- ✓ Scorecard UI with stat cards, trend charts, and trade drill-down — v1.0

### Active

- [ ] Site walk UX overhaul — improve recording workflow and fix data integrity issues
- [ ] Companies page hardcoded plan ID 1 — shows wrong data for multi-plan projects
- [ ] Scorecard "View downstream impact" stub — dead link in drill-down panel
- [ ] statusColors.ts orphaned — Phase 3 rewrite reintroduced local color constants

### Out of Scope

- Multi-user authentication system — single user for now, revisit later
- Migration to PostgreSQL — SQLite is fine for single-user
- Offline/PWA support — sync endpoint removed, not a priority
- Multi-project support — focused on HV Brooklyn for now
- Gantt chart view — Takt schedule is zone-based, not activity-based

## Context

- Shipped v1.0 with ~50 source files across 8 pages and 15 API routes
- Stack: Next.js 14 App Router, Drizzle ORM, SQLite (WAL mode), Tailwind CSS, Zod, SWR
- 17 database tables, scorecard-service.ts extracted as business logic module
- Part of larger Jobsite Nexus platform but managed independently
- Server: 191.101.14.158, deployed via PM2 standalone build

## Constraints

- **Stack**: Keep Next.js 14 + Drizzle + SQLite + Tailwind — no framework changes
- **Deployment**: Must continue working at /tracking basePath on jobsitenexus.com
- **User**: Single PM user (Ron) — optimize for one person's workflow, not multi-tenant
- **Data**: Existing SQLite database with live project data — migrations must be non-destructive

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Review before rebuild | Need clear picture of issues before planning fixes | ✓ Good — UX reviews informed roadmap |
| Responsive over mobile-only | Dashboard-rich on PC, clean on mobile — both contexts matter | ✓ Good — Health Index desktop/mobile split works well |
| Keep SQLite | Single user, no concurrency issues, simple deployment | ✓ Good — WAL mode handles all needs |
| Scorecard as priority feature | Current scorecard lacks detail Ron needs for daily decisions | ✓ Good — service layer + UI shipped |
| Zod over manual validation | Consistent error format, type-safe schemas, composable | ✓ Good — zero raw parseInt remaining |
| SWR over custom hooks | Caching, dedup, revalidation for free | ✓ Good — all pages migrated |
| Health Index 3-factor formula | PPC (40%), SPI (35%), compression (25%) — balanced view | ✓ Good — single number captures schedule health |

## Known Gaps (from v1.0 audit)

- Phase 2 scorecard work was executed but not formally tracked (no 02-02-SUMMARY.md or VERIFICATION.md)
- statusColors.ts shared module is orphaned — pages use local color constants
- Tailwind status.* tokens defined but unused
- Timeline page uses inline TaskSkeleton instead of shadcn Skeleton

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-29 after v1.0 milestone*
