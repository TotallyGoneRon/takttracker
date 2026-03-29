# Phase 4: Code Quality & API Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 04-code-quality-api-hardening
**Areas discussed:** Validation strictness, BasePath cleanup, SSRF fix scope, N+1 priorities

---

## Validation Strictness

| Option | Description | Selected |
|--------|-------------|----------|
| Strict reject | Reject malformed requests with 400 + specific field errors. Extra unknown fields stripped silently. | ✓ |
| Lenient coerce | Accept loose inputs — coerce strings to numbers, fill missing optional fields with defaults. | |
| You decide | Claude picks the right strictness per route. | |

**User's choice:** Strict reject
**Notes:** None

### Follow-up: Error Response Format

| Option | Description | Selected |
|--------|-------------|----------|
| Field-level details | Return { error, details: [{ field, message }] } — helpful for debugging. | ✓ |
| Simple message only | Return { error: "Invalid planId" } — single string. | |
| You decide | Claude picks the format. | |

**User's choice:** Field-level details
**Notes:** None

---

## BasePath Cleanup Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Migrate all to SWR | Convert remaining raw fetch() pages to SWR hooks with existing fetcher. Eliminates basePath + adds caching. | ✓ |
| Central fetch helper | Create basePath-aware wrapper. Less refactoring, doesn't add SWR everywhere. | |
| You decide | Claude picks per page. | |

**User's choice:** Migrate all to SWR
**Notes:** None

---

## SSRF Fix Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Disable it | Remove sync route entirely. Unused, offline sync not on roadmap. | ✓ |
| Fix with allowlist | Keep endpoint, add path validation. | |
| You decide | Claude picks safest approach. | |

**User's choice:** Disable it
**Notes:** "the original plan was to have it combined with a mobile app but that's unnecessary"

---

## N+1 Fix Priorities

| Option | Description | Selected |
|--------|-------------|----------|
| Fix all three | Companies, flags, and site-walks all get JOIN-based queries. | ✓ |
| Companies + site-walks only | Focus on most-used pages. | |
| You decide | Claude prioritizes by impact. | |

**User's choice:** Fix all three
**Notes:** None

---

## Claude's Discretion

- Zod schema file organization
- Shared `parseIntParam()` helper vs inline validation
- BasePath-aware mutation helper structure
- Whether to keep/remove `idb` dependency

## Deferred Ideas

None
