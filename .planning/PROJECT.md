# Takt Flow Tracking App — Review & Improvement

## What This Is

A standalone takt schedule tracking app for construction project managers. It imports inTakt XLSX exports, tracks task progress across zones/floors/buildings, records site walk observations with photos and severity/percent-complete tagging, scores trade performance via a recovery system, and flags cascading delays. Features a dashboard with Schedule Health Index, field-report-style walk summaries with company grouping and trend tracking, walk history, responsive mobile-first layout with bottom navigation for field use, and Zod-validated API routes. Deployed at jobsitenexus.com/tracking and used daily by Ron for the HV Brooklyn project.

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

- ✓ Photo capture during site walks — snap photos per entry, stored locally with thumbnails — v1.1
- ✓ Richer site walk observations — severity, percent complete, notes on any entry — v1.1
- ✓ Walk summary field report — company grouping, delayed details, next-up trades, trend arrows — v1.1
- ✓ Walk history page — past walks with date, entry counts, status breakdown — v1.1
- ✓ Companies page dynamic plan selection — no longer hardcoded to plan 1 — v1.1
- ✓ Scorecard downstream impact link — working navigation to timeline — v1.1
- ✓ statusColors.ts consolidation — all pages use shared module — v1.1

### Active

- [ ] Delay justification at task completion — record delays when completing, not during walks
- [ ] Prerequisite delay matching — link delays to existing predecessor delays in same zone
- [ ] Historical delay handling — account for delays from before tool adoption
- [ ] Remove "Recovered" walk status — recovery calculated automatically on completion
- [ ] Undo/adjust delay records — delete or edit delays, recalculate downstream
- [ ] Score recalculation — recompute recovery and inherited delays when records change

## Current Milestone: v1.2 Scoring & Delay Overhaul

**Goal:** Restructure the delay and recovery scoring system around task completion, with prerequisite delay matching, historical delay handling, and the ability to adjust/undo delay records.

**Target features:**
- Delay justification at task completion (not during walk recording)
- Prerequisite delay matching — link to existing delays in same zone
- Historical/pre-existing delay handling for mid-project adoption
- Remove "Recovered" status from walk recording (calculated on completion)
- Undo/adjust delay records with downstream recalculation
- Score recalculation when delay records change

### Out of Scope

- Multi-user authentication system — single user for now, revisit later
- Migration to PostgreSQL — SQLite is fine for single-user
- Offline/PWA support — sync endpoint removed, not a priority
- Multi-project support — focused on HV Brooklyn for now
- Gantt chart view — Takt schedule is zone-based, not activity-based

## Context

- Shipped v1.1 with ~60 source files across 9 pages (+ walk-history) and 17 API routes
- Stack: Next.js 14 App Router, Drizzle ORM, SQLite (WAL mode), Tailwind CSS, Zod, SWR, sharp
- 17 database tables, scorecard-service.ts and summary API as business logic modules
- Site-walk page refactored from 961-line monolith to orchestrator + 15 extracted components
- Photo storage at data/photos/ with sharp thumbnail generation
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
| One photo per entry | Simple UX, no gallery complexity, replace-on-retake | ✓ Good — v1.1 |
| Conditional render over CSS hide | max-h-0 wasn't working reliably on mobile | ✓ Good — v1.1 |
| Component extraction before features | 961-line monolith needed decomposition before photo/observation work | ✓ Good — v1.1 |
| Summary API as single endpoint | One fetch for trend + next-up instead of multiple calls | ✓ Good — v1.1 |

## Known Gaps

- Phase 2 scorecard work was executed but not formally tracked (no 02-02-SUMMARY.md or VERIFICATION.md)
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
*Last updated: 2026-03-30 after v1.2 milestone start*
