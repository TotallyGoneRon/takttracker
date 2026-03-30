# Requirements: Takt Flow Tracking App

**Defined:** 2026-03-30
**Core Value:** Give a construction PM an accurate, at-a-glance picture of schedule health — which trades are on track, which are falling behind, and what the downstream impact looks like — so they can act before problems cascade.

## v1.2 Requirements

Requirements for the Scoring & Delay Overhaul milestone. Each maps to roadmap phases.

### Delay Justification

- [ ] **DELAY-01**: When marking a task complete, user can indicate if it was late and record delay days and reason — delays are justified at completion, not during walk recording
- [ ] **DELAY-02**: Walk recording status options are On Track, Delayed, and Completed only — "Recovered" is removed (recovery calculated automatically on completion)
- [ ] **DELAY-03**: Existing delay recording during walks (variance code, delay days) is removed — delays are only created through the completion flow

### Prerequisite Matching

- [ ] **PREREQ-01**: When a delay reason is "prerequisite" (another trade's fault), the system checks for existing assigned delays on predecessor trades in the same zone and links them
- [ ] **PREREQ-02**: User can see which predecessor trade caused an inherited delay, with the original delay record linked

### Historical Delays

- [ ] **HIST-01**: User can bulk-mark tasks that were already delayed before tool adoption — a one-time setup or import-time flow for pre-existing delays
- [ ] **HIST-02**: Historical delays are distinguished from tool-recorded delays in scoring (flagged as "pre-existing")

### Delay Management

- [ ] **MGMT-01**: User can delete a delay record that was created by mistake
- [ ] **MGMT-02**: User can edit delay days or reason on an existing delay record
- [ ] **MGMT-03**: When a delay record is deleted or edited, inherited delays on successor tasks are automatically recalculated
- [ ] **MGMT-04**: When a delay record changes, recovery scores on affected completed tasks are automatically recalculated

### Score Recalculation

- [ ] **SCORE-01**: Recovery points are only calculated when a task is marked complete — no scoring for on_track or delayed walk entries
- [ ] **SCORE-02**: Changing a task's completion date triggers recovery score recalculation for that task and any tasks that inherit delays from it

## Future Requirements

### Deferred from v1.2

- **DELAY-04**: Delay justification with photo evidence — attach a photo showing the cause of delay
- **DELAY-05**: Delay approval workflow — delays above a threshold require PM sign-off
- **REPORT-01**: Exportable delay report as PDF — print-friendly delay history per trade

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time delay notifications | Single user — server roundtrip on save is fine |
| AI-powered delay prediction | Predictive flags system already exists for cascading warnings |
| Multi-project delay comparison | Single project focus for now |
| Automated delay detection from schedule | Delays are PM observations, not schedule calculations |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DELAY-01 | Phase 8 | Pending |
| DELAY-02 | Phase 8 | Pending |
| DELAY-03 | Phase 8 | Pending |
| SCORE-01 | Phase 8 | Pending |
| PREREQ-01 | Phase 9 | Pending |
| PREREQ-02 | Phase 9 | Pending |
| HIST-01 | Phase 9 | Pending |
| HIST-02 | Phase 9 | Pending |
| MGMT-01 | Phase 10 | Pending |
| MGMT-02 | Phase 10 | Pending |
| MGMT-03 | Phase 10 | Pending |
| MGMT-04 | Phase 10 | Pending |
| SCORE-02 | Phase 10 | Pending |

**Coverage:**
- v1.2 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

---
*Requirements defined: 2026-03-30*
