# Milestones

## v1.0 MVP (Shipped: 2026-03-29)

**Phases completed:** 5 phases, 13 plans, 21 tasks

**Key accomplishments:**

- SQLite backup script with WAL-safe snapshot and 10-backup retention, plus Drizzle schema synced to add delayWeights, importChangelog tables and 6 missing columns on zones/tasks
- shadcn/ui initialized with 10 components, unified status color tokens in Tailwind config, all 4 schedule pages migrated to single-source color system
- SWR installed with centralized basePath-aware fetcher, 6 client pages migrated from useEffect/fetch to useSWR hooks with skeleton loading states
- Schedule Health Index with three-factor composite score (PPC/SPI/compression) and responsive dashboard layout hiding detailed metrics on mobile
- Mobile bottom tab bar with 4 tabs (Home, Timeline, Walk, Score) for plan-context pages, plus NavBar slim variant hiding duplicate links
- Collapsible Building > Floor > Task hierarchy replacing flat task list, responsive padding on all 8 pages
- Fixed always-false mobile hamburger condition so Map link is accessible on mobile in plan context
- Zod validation library with shared parseIntParam/validateBody helpers, basePath-aware apiMutate fetcher, and SSRF sync endpoint removal
- Zod validation on all 12 simple API routes with parseIntParam replacing every raw parseInt and structured 400 error responses
- Eliminated N+1 queries in 3 routes (companies, flags, site-walks) using JOIN/batch patterns and added Zod validation to all inputs
- Migrated all 6 remaining client pages from hardcoded /tracking/ fetch calls to SWR reads and apiMutate writes -- zero hardcoded basePath references remain in client code

---
