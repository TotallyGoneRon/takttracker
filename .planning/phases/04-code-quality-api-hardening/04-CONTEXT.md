# Phase 4: Code Quality & API Hardening - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Validate all API route inputs with Zod schemas, fix NaN-unsafe parseInt calls on all dynamic routes, eliminate N+1 query patterns in companies/flags/site-walks routes, remove hardcoded `/tracking/` basePath strings by migrating remaining pages to SWR, remove the unused SSRF-vulnerable sync endpoint, and establish a consistent structured error response format across all API routes.

</domain>

<decisions>
## Implementation Decisions

### Validation Strategy
- **D-01:** Add Zod as a dependency and create Zod schemas for all API route request bodies and query parameters. Strict mode — reject malformed requests with 400 status.
- **D-02:** Extra unknown fields are stripped silently (Zod `.strip()` behavior). Missing required fields and type mismatches return structured errors.
- **D-03:** All `parseInt()` calls on dynamic route params (planId, taskId, companyId, etc.) must validate for NaN and return 400 with a specific message (e.g., "planId must be a positive integer").
- **D-04:** Error responses use a structured format: `{ error: "Validation failed", details: [{ field: "planId", message: "Must be a positive integer" }] }`. Field-level detail helps Ron debug issues quickly.

### BasePath Cleanup
- **D-05:** Migrate all remaining raw `fetch()` pages to SWR hooks using the existing basePath-aware fetcher from Phase 1. This eliminates hardcoded `/tracking/` strings AND adds caching/loading states.
- **D-06:** Pages to migrate: import, site-walk, settings, companies. POST/mutation calls (e.g., import file upload) still need a basePath-aware fetch helper for writes — SWR handles reads.
- **D-07:** After migration, zero instances of hardcoded `/tracking/` should remain in client-side fetch calls.

### SSRF / Sync Endpoint
- **D-08:** Remove the sync endpoint (`/api/sync/route.ts`) entirely. The original plan was for a mobile app sync feature, but that's unnecessary — the responsive web app covers field use. Also remove the `idb` dependency if it's only used by the sync feature.

### N+1 Query Fixes
- **D-09:** Fix all three N+1 patterns: companies, flags, and site-walks routes. Use JOIN-based queries with in-memory grouping (matching the efficient pattern already used in `scorecard-service.ts`).
- **D-10:** Companies route: Replace per-company activity/task loops with a single JOIN + GROUP BY query.
- **D-11:** Flags route: Replace per-flag task lookups with a single `inArray` batch query.
- **D-12:** Site-walks route: Replace per-walk entry lookups with a single JOIN, then group entries by walk in memory.

### Claude's Discretion
- Zod schema organization (one file per route vs. shared schemas for common params like planId)
- Whether to create a shared `parseIntParam()` helper or inline validation per route
- How to structure the basePath-aware mutation helper for POST/PUT calls
- Whether to keep `idb` dependency (check if anything else uses it before removing)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### API Routes (All need validation)
- `src/app/api/plans/[planId]/route.ts` — Plan CRUD, pagination params, NaN risk on planId
- `src/app/api/tasks/[taskId]/route.ts` — Task updates, NaN risk on taskId
- `src/app/api/companies/route.ts` — N+1 pattern (per-company activity/task loops)
- `src/app/api/companies/[id]/route.ts` — Company updates, NaN risk on id
- `src/app/api/site-walks/route.ts` — Multi-action POST, N+1 on GET, no body validation
- `src/app/api/scorecard/route.ts` — NaN risk on planId/buildingId query params
- `src/app/api/plans/[planId]/flags/route.ts` — N+1 per-flag enrichment
- `src/app/api/tasks/[taskId]/successors/route.ts` — NaN on taskId and limit param
- `src/app/api/tasks/[taskId]/delays/route.ts` — Delay recording
- `src/app/api/activities/[id]/company/route.ts` — Activity company assignment
- `src/app/api/import/route.ts` — XLSX import (POST with file)
- `src/app/api/import/changelog/route.ts` — NaN on importLogId
- `src/app/api/settings/delay-weights/route.ts` — Weight config updates
- `src/app/api/sync/route.ts` — SSRF vulnerability (to be REMOVED)

### Client Pages with Hardcoded BasePath
- `src/app/settings/page.tsx` — 1 hardcoded `/tracking/` fetch
- `src/app/import/page.tsx` — 1 hardcoded `/tracking/` fetch
- `src/app/companies/page.tsx` — 2 hardcoded `/tracking/` fetches
- `src/app/schedule/[planId]/site-walk/page.tsx` — 5 hardcoded `/tracking/` fetches

### Phase 1 Infrastructure (to leverage)
- `src/lib/fetcher.ts` — SWR fetcher with /tracking basePath handling
- `src/app/providers.tsx` — SWRConfig provider
- `src/components/ui/` — shadcn/ui components available

### Efficient Query Reference
- `src/lib/scorecard-service.ts` — Good JOIN pattern to follow for N+1 fixes

### Requirements
- `.planning/REQUIREMENTS.md` — QUAL-01 through QUAL-05

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/fetcher.ts`: SWR fetcher auto-prepends `/tracking` basePath — key to D-05
- `src/lib/scorecard-service.ts`: Efficient JOIN + in-memory filtering pattern — template for N+1 fixes
- `src/app/providers.tsx`: SWRConfig already wraps app — new SWR pages just work

### Established Patterns
- API routes: try/catch at top, `NextResponse.json({ error })` on failure
- Client pages: `'use client'` + SWR (newer pages) or useState/useEffect/fetch (older pages)
- DB queries: Drizzle ORM `db.select().from(table).where(...)` with `.get()` for singles

### Integration Points
- All 14 API route files need Zod schemas added
- 4 client page files need SWR migration
- `package.json` needs `zod` added as dependency
- `package.json` may need `idb` removed (check usage first)
- Sync route file deleted entirely

</code_context>

<specifics>
## Specific Ideas

- Ron noted the sync endpoint was originally for a mobile app plan that's now unnecessary — the responsive web app covers field use. Remove it entirely rather than fixing the SSRF.
- Single-user app means detailed validation errors are helpful, not a security concern — show field-level details to aid debugging.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-code-quality-api-hardening*
*Context gathered: 2026-03-28*
