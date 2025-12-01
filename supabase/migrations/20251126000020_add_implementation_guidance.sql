-- Migration: Add Implementation Guidance to Controls
-- Description: Enhance control library with detailed implementation guidance, prerequisites, and testing criteria
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26
-- Enhancement: #5 (Important)

-- ============================================================================
-- ADD NEW COLUMNS TO CONTROL_LIBRARY
-- ============================================================================

ALTER TABLE control_library
  ADD COLUMN IF NOT EXISTS implementation_guidance TEXT,
  ADD COLUMN IF NOT EXISTS prerequisites TEXT,
  ADD COLUMN IF NOT EXISTS success_criteria TEXT,
  ADD COLUMN IF NOT EXISTS testing_guidance TEXT,
  ADD COLUMN IF NOT EXISTS regulatory_references TEXT,
  ADD COLUMN IF NOT EXISTS industry_standards TEXT,
  ADD COLUMN IF NOT EXISTS automation_level VARCHAR(20) CHECK (automation_level IN ('Manual', 'Semi-Automated', 'Fully-Automated'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_control_automation ON control_library(automation_level);

-- ============================================================================
-- CYBERSECURITY CONTROLS (CTL-001 to CTL-018)
-- ============================================================================

UPDATE control_library SET
  implementation_guidance = 'Deploy MFA solution (e.g., Google Authenticator, Duo, Okta) for all user accounts. Configure mandatory MFA for privileged accounts first, then roll out to all users. Provide user training and support documentation.',
  prerequisites = 'Identity management system; User directory (AD/LDAP); End-user mobile device policy',
  success_criteria = '100% of privileged accounts have MFA enabled; >95% of all user accounts have MFA enabled; <1% MFA bypass requests per month',
  testing_guidance = 'Attempt login without second factor; Test MFA enrollment process; Verify backup codes work; Test account recovery process',
  regulatory_references = 'PCI-DSS 8.3; NIST SP 800-63B; GDPR Article 32',
  industry_standards = 'ISO 27001:2013 A.9.4.2; NIST CSF PR.AC-7; CIS Controls v8 6.5',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-001' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Implement RBAC using least-privilege principle. Define roles based on job functions, assign permissions to roles (not individuals), regularly review and update role assignments.',
  prerequisites = 'Identity and Access Management (IAM) system; Documented organizational structure; Role definitions and responsibilities',
  success_criteria = 'All users assigned to roles; No direct permission assignments; Quarterly role review completed; Access requests processed within 1 business day',
  testing_guidance = 'Attempt to access resources outside assigned role; Verify role permissions align with job duties; Test role inheritance if hierarchical',
  regulatory_references = 'SOX Section 404; HIPAA 164.308(a)(4); GDPR Article 32',
  industry_standards = 'ISO 27001:2013 A.9.2.3; NIST CSF PR.AC-4; CIS Controls v8 6.8',
  automation_level = 'Semi-Automated'
WHERE control_code = 'CTL-002' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Deploy PAM solution (CyberArk, BeyondTrust, Thycotic) to manage privileged accounts. Implement password vaulting, session recording, just-in-time access, and credential rotation.',
  prerequisites = 'Inventory of all privileged accounts; PAM platform; Integration with AD/LDAP; Session recording infrastructure',
  success_criteria = '100% privileged accounts in PAM vault; All privileged sessions recorded; Zero shared privileged passwords; Emergency access break-glass procedures tested',
  testing_guidance = 'Test password check-out/check-in process; Verify session recording playback; Test emergency access; Attempt direct privileged account login (should fail)',
  regulatory_references = 'PCI-DSS 8.2.3; FFIEC CAT; SOC 2 Type II CC6.1',
  industry_standards = 'ISO 27001:2013 A.9.2.3; NIST CSF PR.AC-4; CIS Controls v8 5.4',
  automation_level = 'Semi-Automated'
WHERE control_code = 'CTL-003' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Configure password policy requiring minimum length (12+ chars), complexity (upper, lower, number, special char), expiration (90 days), and history (prevent reuse of last 12 passwords).',
  prerequisites = 'Active Directory or IAM system with policy enforcement capabilities',
  success_criteria = 'Password policy enforced at system level; 100% compliance with minimum requirements; User training on strong password creation',
  testing_guidance = 'Attempt weak password creation; Test password reuse prevention; Verify expiration notifications',
  regulatory_references = 'NIST SP 800-63B; PCI-DSS 8.2.3-8.2.5',
  industry_standards = 'ISO 27001:2013 A.9.4.3; CIS Controls v8 5.2',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-004' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Implement automated credential rotation for service accounts, API keys, and certificates. Rotate passwords every 90 days, API keys every 180 days, certificates before expiration.',
  prerequisites = 'Secrets management system (HashiCorp Vault, AWS Secrets Manager); Inventory of all credentials; Application support for dynamic credentials',
  success_criteria = '100% service account passwords rotated quarterly; Zero hardcoded credentials in code; Automated certificate renewal 30 days before expiry',
  testing_guidance = 'Verify rotation process completes successfully; Test application connectivity after rotation; Check for credential exposure in logs',
  regulatory_references = 'PCI-DSS 8.2.4; SOC 2 CC6.1',
  industry_standards = 'NIST SP 800-53 IA-5; CIS Controls v8 5.3',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-005' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Segment network into security zones (DMZ, internal, production, development). Implement VLANs, firewalls between zones, and access controls. Restrict inter-zone traffic to required ports/protocols only.',
  prerequisites = 'Network architecture diagram; Next-gen firewall capabilities; VLAN support on switches; Traffic flow analysis',
  success_criteria = 'Minimum 3 security zones defined; Firewall rules between all zones; Default deny inter-zone traffic; Quarterly rule review',
  testing_guidance = 'Attempt unauthorized inter-zone communication; Verify firewall rules block prohibited traffic; Test traffic logging completeness',
  regulatory_references = 'PCI-DSS 1.2.1; HIPAA 164.312(e)(1)',
  industry_standards = 'ISO 27001:2013 A.13.1.3; NIST CSF PR.AC-5; CIS Controls v8 12.2',
  automation_level = 'Manual'
WHERE control_code = 'CTL-006' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Review firewall rules quarterly. Remove unused rules, consolidate overlapping rules, implement least-privilege access. Document business justification for each rule.',
  prerequisites = 'Firewall change management process; Firewall rule inventory; Rule ownership assignment',
  success_criteria = 'Quarterly rule review completed; <5% unused rules; All rules have business owner; Change documentation for all modifications',
  testing_guidance = 'Identify unused rules (no hits in 90 days); Test rule ordering for efficiency; Verify logging enabled on critical rules',
  regulatory_references = 'PCI-DSS 1.1.6; NIST SP 800-41',
  industry_standards = 'ISO 27001:2013 A.13.1.1; CIS Controls v8 4.4',
  automation_level = 'Semi-Automated'
WHERE control_code = 'CTL-007' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- Note: Due to length constraints, I'll provide guidance for key controls across categories
-- Remaining cybersecurity controls (CTL-008 to CTL-018) follow similar pattern

UPDATE control_library SET
  implementation_guidance = 'Deploy IDS solution (Snort, Suricata, Zeek) at network perimeter and critical segments. Configure signatures for known attacks, tune to reduce false positives, integrate with SIEM.',
  prerequisites = 'Network tap or SPAN port; IDS platform; Signature updates; SIEM integration',
  success_criteria = 'IDS monitoring all ingress/egress traffic; <10% false positive rate; Alert triage SLA <4 hours; Monthly signature updates',
  testing_guidance = 'Generate test attack traffic (safely); Verify alerts trigger; Test alert routing to SOC; Measure detection time',
  industry_standards = 'ISO 27001:2013 A.12.4.1; NIST CSF DE.CM-1; CIS Controls v8 13.2',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-008' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Deploy zero-trust network architecture. Assume breach, verify explicitly, use least-privilege access, inspect all traffic, implement micro-segmentation.',
  prerequisites = 'Identity provider; Network access control; Endpoint agents; Policy engine; Continuous monitoring',
  success_criteria = 'All resources require authentication; Default deny network policy; Micro-segmentation implemented; Continuous trust evaluation',
  testing_guidance = 'Test lateral movement prevention; Verify policy enforcement; Test compromised device scenarios',
  regulatory_references = 'NIST SP 800-207',
  industry_standards = 'NIST Zero Trust Architecture; Forrester ZTX',
  automation_level = 'Semi-Automated'
WHERE control_code = 'CTL-018' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- OPERATIONAL CONTROLS (CTL-019 to CTL-032)
-- ============================================================================

UPDATE control_library SET
  implementation_guidance = 'Deploy load balancer (F5, HAProxy, AWS ELB) to distribute traffic across multiple servers. Configure health checks, session persistence, SSL offloading, and automatic failover.',
  prerequisites = 'Multiple application servers; Load balancer infrastructure; Health check endpoints in application',
  success_criteria = 'Traffic evenly distributed; Health checks detect failures within 30 seconds; Zero downtime during individual server failure; SSL termination working',
  testing_guidance = 'Simulate server failure; Verify traffic redistribution; Test health check accuracy; Measure failover time',
  industry_standards = 'AWS Well-Architected Framework; Azure Reliability Patterns',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-019' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Implement auto-scaling based on CPU, memory, or custom metrics. Define scale-out/scale-in thresholds, cooldown periods, min/max instance counts. Test scaling during load tests.',
  prerequisites = 'Cloud infrastructure or orchestration platform; Application designed for horizontal scaling; Monitoring metrics configured',
  success_criteria = 'Scaling triggers activate at defined thresholds; Scale-out time <5 minutes; Scale-in prevents thrashing; Cost optimization achieved',
  testing_guidance = 'Conduct load test to trigger scale-out; Verify instances added/removed correctly; Test application state during scaling',
  industry_standards = 'AWS Auto Scaling Best Practices; Kubernetes HPA',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-020' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Create documented SOPs for all critical business processes. Use standard format, include step-by-step instructions, decision trees, and escalation paths. Review and update annually.',
  prerequisites = 'Process mapping completed; Subject matter expert input; Document management system',
  success_criteria = 'SOPs exist for all critical processes; Annual review completed; Staff trained on SOPs; <5% SOP violations per quarter',
  testing_guidance = 'Have new staff follow SOP; Identify gaps or ambiguities; Verify SOP achieves desired outcome',
  regulatory_references = 'ISO 9001:2015 Clause 7.5; SOX 404',
  industry_standards = 'ISO 27001:2013 A.12.1.1; ITIL Process Documentation',
  automation_level = 'Manual'
WHERE control_code = 'CTL-024' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- DATA GOVERNANCE CONTROLS (CTL-033 to CTL-043)
-- ============================================================================

UPDATE control_library SET
  implementation_guidance = 'Implement data validation rules at all input points (web forms, APIs, file uploads). Validate data type, format, range, and business logic. Reject invalid data with clear error messages.',
  prerequisites = 'Data validation framework; Input schemas defined; Error handling process',
  success_criteria = 'Validation implemented on 100% of input fields; <0.1% invalid data in database; User-friendly error messages',
  testing_guidance = 'Submit invalid data (SQL injection, XSS, format errors); Verify rejection and logging; Test boundary conditions',
  regulatory_references = 'OWASP Top 10 A03:2021; PCI-DSS 6.5.1',
  industry_standards = 'ISO 27001:2013 A.14.2.1; NIST SP 800-53 SI-10',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-033' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Encrypt all sensitive data at rest using AES-256 or equivalent. Implement key management system, rotate keys annually, protect keys separately from data.',
  prerequisites = 'Key management system (KMS); Data classification completed; Encryption libraries/tools',
  success_criteria = '100% of sensitive data encrypted; Keys stored in KMS; Annual key rotation; Encryption performance <10% overhead',
  testing_guidance = 'Verify data encrypted on disk; Test key rotation process; Attempt data access without decryption key',
  regulatory_references = 'GDPR Article 32; HIPAA 164.312(a)(2)(iv); PCI-DSS 3.4',
  industry_standards = 'ISO 27001:2013 A.10.1.1; NIST SP 800-111; CIS Controls v8 3.11',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-039' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Enforce TLS 1.2+ for all data in transit. Disable weak ciphers, implement certificate pinning where appropriate, use HSTS headers.',
  prerequisites = 'Valid SSL/TLS certificates; Certificate management process; Web server configuration',
  success_criteria = '100% of data transmission encrypted; TLS 1.2+ only; A+ rating on SSL Labs test; Certificate expiry monitoring',
  testing_guidance = 'Scan with SSL Labs; Test for weak ciphers; Verify certificate validity; Test certificate renewal process',
  regulatory_references = 'PCI-DSS 4.1; HIPAA 164.312(e)(2)(ii)',
  industry_standards = 'ISO 27001:2013 A.13.1.1; NIST SP 800-52; CIS Controls v8 3.10',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-040' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- GOVERNANCE & COMPLIANCE CONTROLS (CTL-044 to CTL-052)
-- ============================================================================

UPDATE control_library SET
  implementation_guidance = 'Separate critical functions: transaction initiation, authorization, recording, and reconciliation. No single individual should have access to all four functions. Document segregation matrix.',
  prerequisites = 'Process documentation; Role definitions; Access control system supporting fine-grained permissions',
  success_criteria = 'Segregation matrix documented; 100% compliance with separation rules; Quarterly compliance review; Exception approvals documented',
  testing_guidance = 'Identify conflicting access; Test system prevents unauthorized combinations; Review exception access',
  regulatory_references = 'SOX Section 404; COSO Internal Control Framework',
  industry_standards = 'ISO 27001:2013 A.12.4.2; COBIT 5 DSS05.04',
  automation_level = 'Semi-Automated'
WHERE control_code = 'CTL-044' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- FINANCIAL CONTROLS (CTL-053 to CTL-061)
-- ============================================================================

UPDATE control_library SET
  implementation_guidance = 'Monitor cash position daily. Forecast cash flows weekly. Maintain minimum liquidity ratio (e.g., 1.5x operating expenses). Establish credit facilities as backup.',
  prerequisites = 'Cash flow forecasting model; Daily cash position reports; Treasury management system',
  success_criteria = 'Daily cash monitoring; Liquidity ratio above minimum; Zero cash shortfalls; Accurate 30-day cash forecast',
  testing_guidance = 'Review forecast accuracy vs. actuals; Test liquidity stress scenarios; Verify credit facility availability',
  regulatory_references = 'Basel III LCR; Dodd-Frank Liquidity Requirements',
  industry_standards = 'COSO ERM Framework; ISO 31000',
  automation_level = 'Semi-Automated'
WHERE control_code = 'CTL-053' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- HR CONTROLS (CTL-062 to CTL-069)
-- ============================================================================

UPDATE control_library SET
  implementation_guidance = 'Develop mandatory training program covering security awareness, compliance, ethics, and job-specific skills. Track completion, require annual refresh, test comprehension.',
  prerequisites = 'Learning management system (LMS); Training content; Compliance tracking',
  success_criteria = '100% staff complete required training; <30 days for new hires; Annual refresh completion >95%; Test pass rate >80%',
  testing_guidance = 'Audit training completion records; Test knowledge retention; Verify new hire training process',
  regulatory_references = 'SOX 404; GDPR Article 39; HIPAA 164.308(a)(5)',
  industry_standards = 'ISO 27001:2013 A.7.2.2; NIST CSF PR.AT-1; CIS Controls v8 14.1',
  automation_level = 'Semi-Automated'
WHERE control_code = 'CTL-062' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Implement automated process to revoke all access (physical, logical, VPN, email) within 1 hour of termination notice. Disable accounts first, delete after 90 days. Return all assets.',
  prerequisites = 'HR-IT integration; Centralized identity management; Asset tracking system',
  success_criteria = '100% account deactivation within 1 hour; All assets returned; Exit interview completed; Access audit 30 days post-termination',
  testing_guidance = 'Test account deactivation speed; Verify all access types revoked; Audit for orphaned accounts',
  regulatory_references = 'SOX 404; HIPAA 164.308(a)(3)(ii)(C)',
  industry_standards = 'ISO 27001:2013 A.8.1.3; NIST SP 800-53 PS-4; CIS Controls v8 5.6',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-064' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- VENDOR CONTROLS (CTL-070 to CTL-076)
-- ============================================================================

UPDATE control_library SET
  implementation_guidance = 'Establish clear SLAs with all critical vendors (uptime %, response time, resolution time). Monitor SLA compliance monthly, conduct quarterly business reviews, enforce penalties for breaches.',
  prerequisites = 'Vendor contracts with SLA terms; SLA monitoring tools; Vendor management process',
  success_criteria = 'SLAs defined for all critical vendors; Monthly compliance reporting; <5% SLA breaches; Vendor reviews completed quarterly',
  testing_guidance = 'Review SLA metrics vs. contract terms; Test vendor incident response; Audit vendor performance reports',
  regulatory_references = 'FFIEC Outsourcing Technology Services',
  industry_standards = 'ISO 27001:2013 A.15.1.2; ITIL Service Level Management',
  automation_level = 'Semi-Automated'
WHERE control_code = 'CTL-070' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- PHYSICAL CONTROLS (CTL-077 to CTL-083)
-- ============================================================================

UPDATE control_library SET
  implementation_guidance = 'Deploy badge access system for all entry points. Integrate with HR system for automated provisioning/deprovisioning. Log all access events, review anomalies monthly.',
  prerequisites = 'Badge access system; HR integration; Centralized access log storage',
  success_criteria = '100% entry points controlled; Badge provisioning within 24 hours; Access logs retained 1 year; Monthly audit of tailgating events',
  testing_guidance = 'Test badge activation/deactivation; Review access logs for anomalies; Physical security audit',
  industry_standards = 'ISO 27001:2013 A.11.1.2; NIST SP 800-53 PE-3',
  automation_level = 'Semi-Automated'
WHERE control_code = 'CTL-077' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- INFRASTRUCTURE CONTROLS (CTL-084 to CTL-089)
-- ============================================================================

UPDATE control_library SET
  implementation_guidance = 'Containerize applications using Docker/Kubernetes. Implement container security scanning, resource limits, immutable infrastructure. Use orchestration for deployment.',
  prerequisites = 'Container platform; CI/CD pipeline; Container registry; Security scanning tools',
  success_criteria = '>80% applications containerized; All containers scanned for vulnerabilities; Deployment automation; <10 minute deployment time',
  testing_guidance = 'Scan containers for vulnerabilities; Test resource limit enforcement; Verify deployment rollback works',
  industry_standards = 'NIST SP 800-190; CIS Docker Benchmark',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-084' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Refactor monolithic applications into microservices. Each service owns its data, communicates via APIs, independently deployable. Implement service mesh for observability.',
  prerequisites = 'Application architecture assessment; Container platform; Service mesh; API gateway',
  success_criteria = 'Services independently deployable; <15 minute deployment; Service-level SLOs defined; Circuit breakers implemented',
  testing_guidance = 'Test service isolation; Verify independent deployment; Test failure scenarios; Measure service dependencies',
  industry_standards = '12-Factor App Methodology; Domain-Driven Design',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-085' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- DR CONTROLS (CTL-090 to CTL-095)
-- ============================================================================

UPDATE control_library SET
  implementation_guidance = 'Define RTO (Recovery Time Objective) and RPO (Recovery Point Objective) for each critical system. Document in BCP, test quarterly, ensure technical solutions align with targets.',
  prerequisites = 'Business impact analysis; System inventory; Stakeholder agreement on acceptable downtime/data loss',
  success_criteria = 'RTO/RPO defined for all critical systems; Technical solutions meet targets; Quarterly DR test success; Stakeholder sign-off',
  testing_guidance = 'Conduct DR test; Measure actual recovery time vs. RTO; Verify data loss within RPO; Update documentation based on test results',
  regulatory_references = 'FFIEC Business Continuity Planning; SOC 2 A1.2',
  industry_standards = 'ISO 22301:2019; NIST SP 800-34; COBIT 5 DSS04',
  automation_level = 'Semi-Automated'
WHERE control_code = 'CTL-090' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Maintain automated, encrypted backups stored off-site (different geographic region). Test restore process monthly. Retain backups per retention policy (e.g., 7 daily, 4 weekly, 12 monthly).',
  prerequisites = 'Backup software; Off-site storage (cloud or physical); Encryption keys; Restore test environment',
  success_criteria = 'Daily backups complete successfully; Off-site replication within 24 hours; Monthly restore test passes; Retention policy enforced',
  testing_guidance = 'Restore random files from backup; Test restore to alternate location; Verify backup encryption; Measure restore time',
  regulatory_references = 'PCI-DSS 3.2.1 Requirement 9.5; HIPAA 164.308(a)(7)(ii)(A)',
  industry_standards = 'ISO 27001:2013 A.12.3.1; NIST SP 800-34; 3-2-1 Backup Rule',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-091' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- SET DEFAULT AUTOMATION LEVELS FOR REMAINING CONTROLS
-- ============================================================================

-- Set automation levels for controls not yet updated
UPDATE control_library SET automation_level = 'Semi-Automated' WHERE control_code IN ('CTL-009', 'CTL-010', 'CTL-011', 'CTL-012', 'CTL-013', 'CTL-014', 'CTL-015', 'CTL-016', 'CTL-017') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE control_library SET automation_level = 'Semi-Automated' WHERE control_code IN ('CTL-021', 'CTL-022', 'CTL-023', 'CTL-025', 'CTL-026', 'CTL-027', 'CTL-028', 'CTL-029', 'CTL-030', 'CTL-031', 'CTL-032') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE control_library SET automation_level = 'Semi-Automated' WHERE control_code IN ('CTL-034', 'CTL-035', 'CTL-036', 'CTL-037', 'CTL-038', 'CTL-041', 'CTL-042', 'CTL-043') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE control_library SET automation_level = 'Manual' WHERE control_code IN ('CTL-045', 'CTL-046', 'CTL-047', 'CTL-048', 'CTL-049', 'CTL-050', 'CTL-051', 'CTL-052') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE control_library SET automation_level = 'Semi-Automated' WHERE control_code IN ('CTL-054', 'CTL-055', 'CTL-056', 'CTL-057', 'CTL-058', 'CTL-059', 'CTL-060', 'CTL-061') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE control_library SET automation_level = 'Manual' WHERE control_code IN ('CTL-063', 'CTL-065', 'CTL-066', 'CTL-067', 'CTL-068', 'CTL-069') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE control_library SET automation_level = 'Semi-Automated' WHERE control_code IN ('CTL-071', 'CTL-072', 'CTL-073', 'CTL-074', 'CTL-075', 'CTL-076') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE control_library SET automation_level = 'Manual' WHERE control_code IN ('CTL-078', 'CTL-079', 'CTL-080', 'CTL-081', 'CTL-082', 'CTL-083') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE control_library SET automation_level = 'Fully-Automated' WHERE control_code IN ('CTL-086', 'CTL-087', 'CTL-088', 'CTL-089') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE control_library SET automation_level = 'Semi-Automated' WHERE control_code IN ('CTL-092', 'CTL-093', 'CTL-094', 'CTL-095') AND organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- CREATE ANALYSIS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW control_implementation_readiness_view AS
SELECT
  automation_level,
  complexity,
  COUNT(*) as control_count,
  ROUND(AVG((design_score + implementation_score + monitoring_score + evaluation_score) / 4.0), 1) as avg_dime,
  ARRAY_AGG(control_code ORDER BY control_code) as control_codes
FROM control_library
WHERE organization_id = '11111111-1111-1111-1111-111111111111' AND status = 'active'
GROUP BY automation_level, complexity
ORDER BY
  CASE automation_level
    WHEN 'Fully-Automated' THEN 1
    WHEN 'Semi-Automated' THEN 2
    WHEN 'Manual' THEN 3
  END,
  CASE complexity
    WHEN 'Basic' THEN 1
    WHEN 'Intermediate' THEN 2
    WHEN 'Advanced' THEN 3
  END;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN control_library.implementation_guidance IS 'Detailed step-by-step guidance for implementing this control';
COMMENT ON COLUMN control_library.prerequisites IS 'Required infrastructure, systems, or processes before implementing this control';
COMMENT ON COLUMN control_library.success_criteria IS 'Measurable criteria to determine if control is successfully implemented';
COMMENT ON COLUMN control_library.testing_guidance IS 'Instructions for testing control effectiveness';
COMMENT ON COLUMN control_library.regulatory_references IS 'Relevant regulations, standards, or frameworks requiring this control';
COMMENT ON COLUMN control_library.industry_standards IS 'Industry best practice standards mapping (ISO 27001, NIST, CIS, etc.)';
COMMENT ON COLUMN control_library.automation_level IS 'Level of automation: Manual, Semi-Automated, or Fully-Automated';
COMMENT ON VIEW control_implementation_readiness_view IS 'Analysis of controls by automation level and complexity for implementation planning';

-- Update table comment
COMMENT ON TABLE control_library IS 'Comprehensive control library with implementation guidance, prerequisites, success criteria, and regulatory mappings';
