# MinRisk Security Hardening TODO

**Created:** 2025-12-15
**Status:** Pending
**Priority:** HIGH - Required for regulatory approval

---

## 🔴 CRITICAL - Priority 1 (This Week)

### 1. Remove Service Role Key from Client Environment
**Risk:** CRITICAL - Bypasses all security, full database access from browser
**Regulator Impact:** CBN/SEC audit failure

**Tasks:**
- [ ] Remove `VITE_SUPABASE_SERVICE_ROLE_KEY` from `.env.development`
- [ ] Audit all client-side code for service role usage
- [ ] Ensure only `VITE_SUPABASE_ANON_KEY` is used in browser
- [ ] Move service role operations to Edge Functions only
- [ ] Update Render environment variables (remove service role from client)
- [ ] Test all features still work with anon key only

**Files to Check:**
- `src/lib/supabase.ts`
- All component files using Supabase client
- `.env.development`
- Render environment config

---

### 2. Separate Dev and Production Environments
**Risk:** HIGH - Data contamination, compliance violations
**Regulator Impact:** SOC 2, ISO 27001 failure

**Tasks:**
- [ ] Create new Supabase project for production
- [ ] Set up separate database with production data only
- [ ] Configure production-only environment variables
- [ ] Update Render to point to production Supabase project
- [ ] Document environment separation in operations manual
- [ ] Create migration path from shared to separate DBs

**Notes:**
- Current: Single project `qrxwgjjgaekalvaqzpuf` for both dev/prod
- Target: Two projects - one for dev, one for production

---

### 3. Implement Comprehensive Audit Logging
**Risk:** HIGH - No accountability, forensics impossible
**Regulator Impact:** CBN/SEC compliance requirement

**Tasks:**
- [ ] Create `audit_log` table in database
- [ ] Log all data access events (views, exports, modifications)
- [ ] Log authentication events (login, logout, failed attempts)
- [ ] Log administrative actions (user approvals, role changes)
- [ ] Log risk assessment changes (who, what, when)
- [ ] Add audit log viewer in Admin panel
- [ ] Implement log retention policy (7 years for financial data)
- [ ] Add audit log export functionality

**Schema Design:**
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES user_profiles(id),
  action_type TEXT NOT NULL, -- 'VIEW', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'LOGIN', 'ADMIN_ACTION'
  entity_type TEXT, -- 'risk', 'incident', 'user', etc.
  entity_id UUID,
  details JSONB, -- Action-specific details
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🟡 MEDIUM - Priority 2 (This Month)

### 4. Add Rate Limiting to API Endpoints
**Risk:** MEDIUM - DDoS, brute force attacks
**Regulator Impact:** Operational resilience requirement

**Tasks:**
- [ ] Implement rate limiting in Edge Functions
- [ ] Add login attempt throttling (5 attempts per 15 min)
- [ ] Add API call limits per user (1000/hour)
- [ ] Add CAPTCHA for repeated failed logins
- [ ] Monitor and alert on rate limit violations

---

### 5. Implement Failed Login Monitoring
**Risk:** MEDIUM - Undetected brute force attacks
**Regulator Impact:** Security monitoring requirement

**Tasks:**
- [ ] Log all failed login attempts with IP address
- [ ] Alert on 10+ failed attempts from same IP
- [ ] Alert on 5+ failed attempts for same account
- [ ] Add temporary account lockout (30 min after 5 failures)
- [ ] Create security dashboard showing login anomalies

---

### 6. Create Incident Response Plan
**Risk:** MEDIUM - Unprepared for security incidents
**Regulator Impact:** SEC cybersecurity rule requirement

**Tasks:**
- [ ] Document breach notification process
- [ ] Define roles and responsibilities
- [ ] Create communication templates (users, regulators)
- [ ] Establish incident severity levels
- [ ] Define response timelines (detect, contain, recover)
- [ ] Test incident response quarterly

---

### 7. Document Data Retention Policy
**Risk:** MEDIUM - Regulatory non-compliance
**Regulator Impact:** Data protection laws

**Tasks:**
- [ ] Define retention periods per data type:
  - Active risks: Until closed + 7 years
  - Closed risks: 7 years
  - Incidents: 7 years
  - User data: Account lifetime + 2 years
  - Audit logs: 7 years
- [ ] Implement automated archival jobs
- [ ] Create data deletion procedures
- [ ] Add user data export (GDPR right to portability)
- [ ] Add user data deletion (GDPR right to erasure)

---

### 8. Encrypt Sensitive Fields at Rest
**Risk:** MEDIUM - Data exposure if database compromised
**Regulator Impact:** Data protection requirement

**Tasks:**
- [ ] Identify highly sensitive fields (financial impact, incident details)
- [ ] Implement column-level encryption for:
  - `risks.financial_impact`
  - `incidents.description`
  - `incidents.financial_impact`
  - User personal data (if any)
- [ ] Use Supabase Vault or application-level encryption
- [ ] Document encryption key management
- [ ] Test decryption performance impact

---

## 🟢 FUTURE - Priority 3 (Next Quarter)

### 9. Third-Party Security Audit
**Risk:** LOW - Unknown vulnerabilities
**Regulator Impact:** Due diligence requirement

**Tasks:**
- [ ] Engage cybersecurity firm for penetration test
- [ ] Conduct vulnerability assessment
- [ ] Review code for security issues
- [ ] Test authentication/authorization bypasses
- [ ] Generate formal audit report
- [ ] Remediate all findings
- [ ] Re-test after fixes

**Budget:** ~$10,000 - $25,000 USD

---

### 10. SOC 2 Type 1 Audit Preparation
**Risk:** LOW - Compliance credibility
**Regulator Impact:** Industry standard for SaaS

**Tasks:**
- [ ] Document security controls
- [ ] Implement missing controls (see above)
- [ ] Create security policy manual
- [ ] Conduct internal control testing
- [ ] Engage SOC 2 auditor
- [ ] Complete formal audit
- [ ] Publish SOC 2 report for customers

**Timeline:** 6-12 months
**Budget:** ~$15,000 - $40,000 USD

---

### 11. Disaster Recovery Testing
**Risk:** LOW - Data loss in catastrophe
**Regulator Impact:** Business continuity requirement

**Tasks:**
- [ ] Document backup procedures (Supabase automatic backups)
- [ ] Test database restoration from backup
- [ ] Define RTO (Recovery Time Objective): 4 hours
- [ ] Define RPO (Recovery Point Objective): 1 hour
- [ ] Create failover plan
- [ ] Test disaster recovery annually
- [ ] Document lessons learned

---

### 12. Security Awareness Training
**Risk:** LOW - User-caused security incidents
**Regulator Impact:** Security culture requirement

**Tasks:**
- [ ] Create security onboarding materials
- [ ] Conduct phishing awareness training
- [ ] Document password policy
- [ ] Implement password strength requirements
- [ ] Add security tips to user interface
- [ ] Quarterly security reminders

---

## 📊 Compliance Checklist

### CBN Guidelines (Central Bank of Nigeria)
- [ ] Audit trail for all transactions
- [ ] Incident response plan documented
- [ ] Data encryption in transit (HTTPS) ✅
- [ ] Data encryption at rest
- [ ] Access control by role ✅
- [ ] Regular security assessments
- [ ] Business continuity plan

### SEC Cyber Rules
- [ ] Cybersecurity policies documented
- [ ] Incident response plan tested
- [ ] Annual risk assessment
- [ ] Board-level cyber oversight
- [ ] Vendor risk management
- [ ] Customer data protection

### ISO 27001
- [ ] Information Security Management System (ISMS)
- [ ] Risk assessment methodology
- [ ] Security controls implemented
- [ ] Internal audit program
- [ ] Management review process
- [ ] Continual improvement process

### SOC 2 (Trust Services Criteria)
- [ ] Security - Access controls ✅
- [ ] Availability - Uptime monitoring
- [ ] Processing Integrity - Data validation ✅
- [ ] Confidentiality - Encryption
- [ ] Privacy - Data handling procedures

---

## 🎯 Success Metrics

**By End of Month 1:**
- [ ] Service role removed from client
- [ ] Separate prod environment created
- [ ] Audit logging operational

**By End of Month 3:**
- [ ] Rate limiting implemented
- [ ] Failed login monitoring active
- [ ] Incident response plan documented
- [ ] Data retention policy defined

**By End of Month 6:**
- [ ] Third-party security audit completed
- [ ] All critical/high findings remediated
- [ ] SOC 2 preparation started

**By End of Year 1:**
- [ ] SOC 2 Type 1 certified
- [ ] Disaster recovery tested
- [ ] Security training program established

---

## 📞 When to Work on This

**Trigger phrases from user:**
- "Let's work on security"
- "Security hardening"
- "Regulatory compliance"
- "Audit preparation"
- "Fix security issues"
- "SOC 2" / "ISO 27001" / "CBN guidelines"

**Reference:** This file is linked in `CLAUDE.md` under "Security & Compliance"

---

## 💰 Estimated Costs

| Item | Cost (USD) | Timeline |
|------|-----------|----------|
| Separate Supabase prod project | $25/month | Ongoing |
| Security audit / penetration test | $10,000 - $25,000 | One-time |
| SOC 2 Type 1 audit | $15,000 - $40,000 | Annual |
| Security monitoring tools | $100 - $500/month | Ongoing |
| **Total Year 1** | **~$30,000 - $70,000** | |

---

## 📝 Notes

- This is a living document - update as items are completed
- Mark completed items with ✅ and date
- Add new security issues as discovered
- Review quarterly with user
- Link to actual implementation PRs when complete

**Last Updated:** 2025-12-15
**Next Review:** 2026-01-15
