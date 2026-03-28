<!-- GSD:project-start source:PROJECT.md -->
## Project

**Takt Flow Tracking App — Review & Improvement**

A standalone takt schedule tracking app for construction project managers. It imports inTakt XLSX exports, tracks task progress across zones/floors/buildings, records site walk observations, scores trade performance via a recovery system, and flags cascading delays. Currently deployed at jobsitenexus.com/tracking and used daily by Ron for the HV Brooklyn project.

**Core Value:** Give a construction PM an accurate, at-a-glance picture of schedule health — which trades are on track, which are falling behind, and what the downstream impact looks like — so they can act before problems cascade.

### Constraints

- **Stack**: Keep Next.js 14 + Drizzle + SQLite + Tailwind — no framework changes
- **Deployment**: Must continue working at /tracking basePath on jobsitenexus.com
- **User**: Single PM user (Ron) — optimize for one person's workflow, not multi-tenant
- **Data**: Existing SQLite database with live project data — migrations must be non-destructive
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript ^5.5.0 - All application code (frontend and backend)
- JavaScript - Configuration files only (`next.config.js`, `postcss.config.js`)
## Runtime
- Node.js (version not pinned; no `.nvmrc` or `.node-version` detected)
- Server runs on port 3001 (configured in `package.json` scripts)
- npm
- Lockfile: `package-lock.json` present
## Frameworks
- Next.js ^14.2.0 - Full-stack React framework (App Router)
- Tailwind CSS ^3.4.0 - Utility-first CSS
- tailwind-merge ^2.3.0 - Class deduplication utility
- clsx ^2.1.0 - Conditional class composition
- Drizzle ORM ^0.45.1 - Type-safe SQL ORM
- better-sqlite3 ^11.0.0 - SQLite driver (synchronous, WAL mode)
- Not detected (no test runner configured; `tests/` directory exists but no jest/vitest config)
- drizzle-kit ^0.31.10 - Schema migration tooling
- autoprefixer ^10.4.0 - CSS vendor prefixing
- TypeScript compiler (noEmit; type-checking only, Next.js handles transpilation)
## Key Dependencies
- `xlsx` ^0.18.5 - Parses inTakt XLSX export files (core import pipeline)
- `drizzle-orm` ^0.45.1 - All database access goes through Drizzle
- `better-sqlite3` ^11.0.0 - Embedded database engine (no external DB server)
- `idb` ^8.0.0 - IndexedDB wrapper for offline/client-side storage
- `lucide-react` ^0.400.0 - Icon library
- `sharp` ^0.33.0 - Image processing (likely for photo thumbnails in site walks)
- `next` ^14.2.0 - Handles routing, API, SSR, bundling
## Configuration
- `tsconfig.json`: strict mode, ES2017 target, bundler module resolution
- Path alias: `@/*` maps to `./src/*`
- `next.config.js`: standalone output, basePath `/tracking`
- `drizzle.config.ts`: SQLite dialect, schema at `./src/db/schema.ts`
- `tailwind.config.ts`: content glob `./src/**/*.{js,ts,jsx,tsx,mdx}`
- No `.env` files detected
- No environment variables required (SQLite is file-based, path hardcoded)
- Database path: `./data/takt-flow.db` (relative to `process.cwd()`)
## Database Schema
- `projects` - Top-level project container
- `importLogs` - XLSX import audit trail
- `buildings` - Building structures (SE, N, SW)
- `zones` - Spatial zones (interior, exterior, foundation, site, etc.)
- `companies` - Subcontractor companies
- `taktPlans` - Takt schedule plans
- `activities` - Activity definitions (grouped tasks)
- `tasks` - Individual scheduled tasks with planned/actual/baseline dates
- `taskRelationships` - Predecessor/successor links (FS/SS/FF/SF with lag)
- `taskDelays` - Delay records (assigned and inherited)
- `siteWalks` - Field inspection sessions
- `siteWalkEntries` - Per-task observations during walks
- `siteWalkPhotos` - Photos attached to walk entries
- `constraintChecklists` - Constraint checklist templates per activity
- `constraintResults` - Constraint completion status per task
- `predictiveFlags` - AI-generated delay risk flags
- `floorPlans` / `floorPlanZones` - Floor plan images with polygon zone mapping
## npm Scripts
## Platform Requirements
- Node.js (no minimum version pinned; TypeScript targets ES2017)
- npm for package management
- SQLite available via better-sqlite3 native addon (requires build tools for native compilation)
- Standalone Next.js build (suitable for Docker/PM2)
- Deployed at `jobsitenexus.com/tracking` (basePath `/tracking`)
- SQLite database stored in `./data/` directory (must be persistent volume)
- No external database server required
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Page components: `page.tsx` (Next.js App Router convention)
- API routes: `route.ts` (Next.js App Router convention)
- Shared components: PascalCase — `NavBar.tsx` at `src/app/NavBar.tsx`
- Library modules: kebab-case — `import-parser.ts`, `recovery-engine.ts` at `src/lib/`
- Utility modules: camelCase — `statusColors.ts`, `dates.ts` at `src/lib/`
- Database files: camelCase — `client.ts`, `schema.ts` at `src/db/`
- Config files: kebab-case at root — `drizzle.config.ts`, `tailwind.config.ts`, `postcss.config.js`
- Use camelCase for all functions: `parseInTaktXLSX`, `calculateRecovery`, `propagateDelay`
- React components use PascalCase: `DashboardPage`, `ImportPage`, `StatCard`, `RateBar`
- Async handlers: `handleImport`, `handleCreate`, `handleSort`, `handleSave`
- Data fetching helpers: `fetchData`, `fetchWeights`, `loadData`
- Use camelCase: `planId`, `taskId`, `buildingFilter`, `dateRange`
- State variables: descriptive nouns — `data`, `loading`, `error`, `scorecard`
- Boolean state: adjective form — `uploading`, `saving`, `showAllDates`, `showForm`
- Maps and lookups: `companyMap`, `zoneIdMap`, `activityIdMap`, `buildingIdMap`
- Use snake_case consistently: `takt_plan_id`, `planned_start`, `recovery_status`
- Foreign keys: `{table}_id` pattern — `project_id`, `company_id`, `activity_id`
- Timestamps: `created_at`, `updated_at` as ISO text strings
- PascalCase for interfaces: `Task`, `Building`, `PlanData`, `CompanyScore`, `Scorecard`
- Interfaces defined inline in page components (not shared across files)
- Schema exports use camelCase: `taktPlans`, `taskDelays`, `siteWalkEntries`
## Code Style
- No ESLint or Prettier config detected — relies on TypeScript defaults and editor settings
- Indentation: 2 spaces
- Semicolons: used consistently
- Trailing commas: used in multi-line arrays/objects
- String quotes: single quotes for imports and strings
- No linter configured. TypeScript strict mode (`"strict": true` in `tsconfig.json`) is the primary quality gate.
- Strict mode enabled in `tsconfig.json`
- `@/*` path alias maps to `./src/*`
- Target: ES2017, module: ESNext, bundler resolution
- Type annotations on function parameters; return types inferred
- `any` used sparingly — mainly for `Record<string, any>` in update objects and schema casts (`reason as any`)
## Component Patterns
- Pages without interactivity are async Server Components that query the DB directly
- Example pattern in `src/app/page.tsx`:
- Marked with `'use client'` directive at top of file
- Used for all interactive pages: import, schedule, map, scorecard, site-walk, settings, companies
- Data fetched via `useEffect` + `fetch()` to API routes
- Standard pattern:
- Defined as plain functions at bottom of same file (not exported)
- Examples: `StatCard` in `src/app/page.tsx`, `RateBar` in `src/app/schedule/[planId]/scorecard/page.tsx`
- Props typed inline: `{ label: string; value: number; color?: string }`
- Consistent spinner pattern across all pages:
## API Route Patterns
- Each route file exports HTTP method handlers: `GET`, `POST`, `PATCH`, `PUT`
- Use `NextRequest` and `NextResponse` from `next/server`
- Parse params from URL or request body
- Wrap in try/catch at top level
- Return `{ error: string }` JSON with appropriate status code
- Log errors with `console.error`
- Single POST endpoint dispatches on `body.action` field
- Used in `src/app/api/site-walks/route.ts` with actions: `create`, `add_entry`, `complete`
- Read from `new URL(request.url).searchParams`
- Parsed inline: `parseInt(params.planId)`, `url.searchParams.get('planId')`
## Import Organization
- `@/*` maps to `./src/*` — use this for all internal imports
- Examples: `@/db/client`, `@/db/schema`, `@/lib/recovery-engine`, `@/lib/import-parser`
## Error Handling
## State Management
- Loading/error/data triple: `const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(null);`
- Filter state kept in component: `statusFilter`, `buildingFilter`, `dateRange`
- Computed values via `useMemo` for expensive grouping operations (see `src/app/schedule/[planId]/page.tsx`)
- Form state: individual `useState` per field, not form library
## Styling
- Utility-first, all styles inline in className
- Conditional classes via template literals: `` `${isActive ? 'bg-blue-100' : 'text-gray-600'}` ``
- `clsx` and `tailwind-merge` are dependencies but usage is minimal — most pages use template literals
- CSS variables for status colors in `src/app/globals.css`
- Status color constants defined as `Record<string, string>` objects in page files
- Shared status colors module at `src/lib/statusColors.ts` (not yet adopted everywhere)
- Mobile-friendly: `min-h-[44px]`, `min-w-[48px]`, `min-h-[48px]` on interactive elements
- `active:scale-95` for tactile button feedback
- `md:` breakpoint for desktop layouts: `grid-cols-1 md:grid-cols-2`, `p-4 md:p-6`
- Mobile-first hamburger menu in `src/app/NavBar.tsx`
## Database Access
- Direct `db.select().from(table).where(...)` in Server Components
- API routes query via the same `db` instance from `@/db/client`
- `.get()` for single row, default for arrays
- `.returning()` after inserts to get the new row
- In-memory filtering preferred over complex SQL (see `src/app/api/plans/[planId]/route.ts`)
- All tables defined in `src/db/schema.ts` using `sqliteTable()`
- Primary keys: `integer('id').primaryKey({ autoIncrement: true })`
- Foreign keys with cascade deletes: `.references(() => table.id, { onDelete: 'cascade' })`
- Enums as `text` with `enum` option arrays
- Timestamps as ISO text: `text('created_at').notNull().default(sql\`(datetime('now'))\`)`
## Comments
- Section dividers in long files: `// --- Section Name ---` (see schema, import route)
- Unicode line dividers in lib files: `// ─── Section Name ─────────────`
- JSDoc on exported library functions in `src/lib/recovery-engine.ts` and `src/lib/predictive.ts`
- Inline comments for non-obvious logic: `// Apply filters in memory (simpler for SQLite)`
## URL Patterns
- Client-side fetch calls use `/tracking/api/...` prefix
- Links use `/tracking/schedule/...` prefix
- But the Next.js App Router structure is at root (`src/app/`)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Server Components for read-heavy pages (dashboard), Client Components (`'use client'`) for interactive pages (schedule, site-walk, scorecard, map, import, companies, settings)
- API Route Handlers (`route.ts`) serve as the data layer — no separate service/repository abstraction
- Domain logic lives in `src/lib/` utility modules (recovery-engine, predictive, import-parser, dates)
- SQLite with WAL mode provides single-file persistence at `data/takt-flow.db`
- All internal links and fetch calls use `/tracking/` prefix (configured via `next.config.js` basePath)
## Layers
- Purpose: Render views and handle user interactions
- Location: `src/app/` (page.tsx files)
- Contains: React components, local state management, fetch calls to API routes
- Depends on: API routes via `fetch()`
- Used by: End users via browser
- Purpose: CRUD operations, data transformation, business logic orchestration
- Location: `src/app/api/` (route.ts files)
- Contains: HTTP handlers (GET, POST, PATCH, PUT), Drizzle queries, calls to lib modules
- Depends on: `src/db/client.ts`, `src/db/schema.ts`, `src/lib/*`
- Used by: Page components via fetch
- Purpose: Core scheduling algorithms — recovery scoring, delay propagation, predictive flagging, XLSX parsing
- Location: `src/lib/`
- Contains: Pure functions and database-aware utilities
- Depends on: `src/db/client.ts`, `src/db/schema.ts`
- Used by: API routes
- Purpose: Schema definition and connection management
- Location: `src/db/`
- Contains: Drizzle schema tables, SQLite client initialization
- Depends on: `better-sqlite3`, `drizzle-orm`
- Used by: API routes and lib modules directly
## Data Flow
- No global state management library (no Redux, Zustand, etc.)
- Each client page manages its own state via `useState` / `useEffect`
- Data fetched on mount via `fetch()` calls to API routes
- No client-side caching or SWR/React Query
## Key Abstractions
- An **Activity** (`src/db/schema.ts` `activities` table) represents a trade/work type (e.g., "Rough-in Electrical") grouped by company + task name + phase
- A **Task** (`src/db/schema.ts` `tasks` table) is a specific instance of an activity in a particular zone with planned/actual dates
- Relationship: one Activity has many Tasks (same trade repeated across zones/floors)
- Pattern: Activities are grouped by `task_code` for cross-building assignment (`src/app/companies/page.tsx`)
- Purpose: Track and score how well trades absorb inherited delays
- `inherited_delay_days` on task: cumulative days inherited from predecessor delays
- `recovery_points` on task: days recovered (finished within baseline despite inherited delays)
- `recovery_status`: `on_track` | `delayed` | `recovered`
- Implementation: `src/lib/recovery-engine.ts` — `calculateRecovery()`, `propagateDelay()`, `getScorecard()`
- Purpose: Warn about cascading delays on higher floors
- When activity A delays on Floor N, flags same activity on Floors N+1, N+2, etc.
- Implementation: `src/lib/predictive.ts` — `flagCascadingDelays()`, `getActiveFlags()`, `dismissFlag()`
- Project -> Building -> Zone (with floor_number and zone_type)
- Zone types: `interior`, `exterior`, `common`, `foundation`, `site`, `parkade`, `roof`, `elevator`, `stairs`
- Detection from XLSX "Area" field: `src/lib/import-parser.ts` — `detectZones()`, `parseAreaToZone()`
- Configurable per-project weights for different delay reasons
- Reasons: `labor`, `material`, `prep`, `design`, `weather`, `inspection`, `prerequisite`, `other`
- Each has a weight (0-2), `impacts_score` flag, and `cascading_multiplier`
- Config: `src/app/api/settings/delay-weights/route.ts`
## Entry Points
- Location: `src/app/layout.tsx` (root layout)
- Triggers: Browser requests
- Responsibilities: Renders header/nav, wraps all pages
- Location: `src/app/page.tsx`
- Triggers: `GET /tracking/`
- Responsibilities: Server Component that queries plans, tasks, buildings directly from DB; shows stats and navigation
- Location: `src/app/import/page.tsx` + `src/app/api/import/route.ts`
- Triggers: User uploads XLSX
- Responsibilities: Parses inTakt export, populates entire data model
- Location: `scripts/init-db.js`
- Triggers: Manual execution (`node scripts/init-db.js`)
- Responsibilities: Creates all tables if not exist, runs column migrations
## Error Handling
- API routes wrap all logic in try/catch, return `NextResponse.json({ error: message }, { status: code })`
- Client pages check `res.ok` before processing response
- Import errors collected as array during parsing, stored in `import_logs.error_log` as JSON string
- No global error boundary or error reporting service
- No retry logic on client-side fetch failures
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
