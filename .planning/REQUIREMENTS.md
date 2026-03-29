# Requirements: Takt Flow Tracking App

**Defined:** 2026-03-28
**Core Value:** Give a construction PM an accurate, at-a-glance picture of schedule health — which trades are on track, which are falling behind, and what the downstream impact looks like — so they can act before problems cascade.

## v1.1 Requirements

Requirements for the Site Walk Overhaul milestone. Each maps to roadmap phases.

### Photo Capture

- [x] **PHOTO-01**: User can tap a camera icon during entry recording to snap a photo from phone's rear camera
- [x] **PHOTO-02**: Uploaded photos are automatically resized to thumbnails for fast display
- [x] **PHOTO-03**: Photos are stored on local disk and tied to the specific site walk entry
- [ ] **PHOTO-04**: User can see a photo count badge on entries that have photos attached

### Observations

- [x] **OBS-01**: User can mark a delayed entry with severity (Low/Medium/High/Critical) — visual tracker only, does not affect scoring
- [x] **OBS-02**: User can record percent complete (0/25/50/75/100) on in-progress tasks — visual tracker only, does not affect scheduling

### Walk Summary

- [x] **SUM-01**: Walk summary groups entries by company showing which trades are on track vs behind
- [x] **SUM-02**: Walk summary shows delayed task details (task name, zone, variance code, delay days, severity)
- [x] **SUM-03**: Walk summary shows "Next up" — trades scheduled for the next 2-3 days with dates
- [x] **SUM-04**: Walk summary shows walk-to-walk trend (better/worse/same vs last walk)

### Walk History

- [ ] **HIST-01**: User can view a list of past walks with summary stats (date, entry counts, status breakdown)

### Bug Fixes

- [ ] **FIX-01**: Companies page uses active plan ID instead of hardcoded plan ID 1
- [ ] **FIX-02**: Scorecard "View downstream impact" links to a working destination
- [ ] **FIX-03**: statusColors.ts shared module is adopted across all pages (remove local color constants)

## Future Requirements

### Deferred from v1.1

- **PHOTO-05**: Photo markup/annotation — draw arrows, circles, text on photos to highlight issues
- **VOICE-01**: Voice note recording attached to entries — schema field exists, needs MediaRecorder API
- **REPORT-01**: Exportable field report as PDF — print-friendly HTML covers 90% of the use case
- **NOTIFY-01**: Severity-driven notification priority — high-severity delays bubble to dashboard

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mandatory photo per entry | Breaks three-tap walk speed — photos must always be optional |
| Offline photo storage with sync | PWA-grade complexity for a single-user app — upload immediately or retry |
| AI-powered photo analysis | Zero practical value for schedule tracking |
| Complex form builder for observations | Fixed optional fields (severity, percent) are fast; custom forms are slow |
| Full gallery/media management | Separate product domain (CompanyCam) — store per entry, display inline, done |
| Real-time sync/collaboration | Single user — server roundtrip on save is fine |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PHOTO-01 | Phase 5 | Complete |
| PHOTO-02 | Phase 5 | Complete |
| PHOTO-03 | Phase 5 | Complete |
| PHOTO-04 | Phase 5 | Pending |
| OBS-01 | Phase 5 | Complete |
| OBS-02 | Phase 5 | Complete |
| SUM-01 | Phase 6 | Complete |
| SUM-02 | Phase 6 | Complete |
| SUM-03 | Phase 6 | Complete |
| SUM-04 | Phase 6 | Complete |
| HIST-01 | Phase 7 | Pending |
| FIX-01 | Phase 7 | Pending |
| FIX-02 | Phase 7 | Pending |
| FIX-03 | Phase 7 | Pending |

**Coverage:**
- v1.1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after roadmap creation*
