# MinRisk — Master TODO

**Last Updated:** 2026-02-24
**Branch:** staging

---

## CRITICAL — Deploy / Unblock

- [ ] **Deploy incident mapping Edge Function fix** — duplicate key error fix is code-complete, needs deployment to production
  - `npx supabase functions deploy analyze-incident-for-risk-mapping --project-ref qrxwgjjgaekalvaqzpuf`
- [ ] **Unblock Clerk invitation system** — code complete, blocked by Clerk Dev Mode not delivering emails
  - Switch Clerk to Production mode OR configure custom email provider (SendGrid/Resend)
  - Re-test full invitation flow end-to-end once unblocked
- [ ] **Merge staging → main** — 10+ commits on staging not yet in production (PCI redesign, Clerk auth, AI model config, SEC narrative fixes)

---

## HIGH — Features & Architecture

### Continuous Evolution (Phase 8 UI)
- [ ] Risk History View — read-only risk register for past periods
- [ ] Period Comparison UI — "Current vs Last Snapshot" comparison
- [ ] Analytics with Historical Period Support — modify `getHeatmapData()` to use `risk_history`
- [ ] Period Management Admin UI — active period banner, "Commit Period" button
- [ ] Updated Risk Register UI — remove redundant `period` column, add banner
- [ ] Control Assessments UI — pre-fill Q4 scores from Q3, require explicit "Confirm" or "Re-assess"

### Database Migration (Phase 7 prerequisite for Phase 8)
- [ ] Run `supabase/migrations/20250101_continuous_risk_architecture.sql` on staging
- [ ] Verify 4 new tables: `active_period`, `risk_history`, `period_commits`, `control_assessments`
- [ ] Test `commitPeriod()` function manually
- [ ] Validate data integrity and foreign key relationships

### KRI & Appetite Enhancements
- [ ] Add Trends/History view to KRI Data Entry tab
- [ ] Add Tolerance Breach Alerts section to Risk Appetite & Tolerance tab
- [ ] Enhance AI to generate DIRECTIONAL metrics

### Risk Intelligence — Investigate & Fix
- [ ] Investigate Risk Intelligence system running poorly (reported Dec 2025)
  - Check Edge Function logs for errors
  - Test event creation workflow end-to-end
  - Review alert relevance scoring and keyword matching

---

## MEDIUM — Feature Porting & Improvements

### ERM Reports (port from minrisk-starter)
- [ ] AI-powered narrative generation
- [ ] Stakeholder-specific reports (Regulator / Board / CEO)
- [ ] Auto-regulator routing (Bank→CBN, Capital Markets→SEC)
- [ ] Word & PDF export with watermarks
- [ ] Risk velocity analysis
- [ ] Report template system

### AI Suggestion UX
- [ ] Bulk accept/reject for multiple suggestions
- [ ] Allow ADMIN to edit suggestions before accepting
- [ ] "Suggest Alternative Risk" option
- [ ] Suggestion history (accepted/rejected counts)
- [ ] Confidence calibration metrics
- [ ] Email notifications for new suggestions

### Risk Intelligence Phase 2 — RSS Automation
- [ ] RSS feed ingestion system
- [ ] Intelligent pre-filtering (keyword matching — 97% cost reduction)
- [ ] Category-based filtering
- [ ] ML-powered alert prioritization
- [ ] Daily digest emails
- [ ] Automated overnight processing

---

## SECURITY HARDENING — High Priority

> Full details in `SECURITY-HARDENING-TODO.md`

### Critical (immediate)
- [x] Remove service role key from client environment ✅
- [x] Audit logging foundation ✅
- [ ] Update Render env vars — remove service role from client
- [ ] Implement log retention policy (7 years for financial data)

### Medium (this month)
- [ ] Rate limiting on Edge Functions
- [ ] Failed login monitoring + temporary lockout
- [ ] Incident response plan
- [ ] Data retention policy
- [ ] Encrypt sensitive fields at rest (financial impact, PII)

### Future (next quarter)
- [ ] Third-party penetration test (~$10-25K)
- [ ] SOC 2 Type 1 preparation (~$15-40K, 6-12 months)
- [ ] Disaster recovery testing (RTO: 4h, RPO: 1h)
- [ ] Security awareness training program

---

## COMPLETED (recent)

- [x] PCI template selector redesign — category icons, colour borders, hints, AI rationale
- [x] PCI workflow fix — replace `.single()` with `getAuthenticatedProfile()`
- [x] Clerk auth for all Edge Functions — x-clerk-token CORS + headers
- [x] AI model config standardization — correct IDs, single source of truth
- [x] Deprecated Haiku model update → `claude-haiku-4-5-20250514`
- [x] SEC narrative Edge Function — apikey header, severity column fix
- [x] Incident mapping duplicate key fix (code complete, awaiting deploy)
- [x] Admin invite system (code complete, blocked by Clerk dev mode)
- [x] Owner enrichment via Edge Function (security hardening)
- [x] RLS policy tightening — principle of least privilege
- [x] User audit system — production deployment
- [x] Incident void system — soft delete with audit trail
- [x] Risk register incident counts

---

## Review

_To be updated after each major milestone._
