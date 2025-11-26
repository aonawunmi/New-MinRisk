-- Migration: Seed Control Library (118 Controls)
-- Description: Complete control library from MASTER_CONTROL_LIBRARY with metadata
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26

-- NOTE: Replace 'YOUR_ORG_ID' with actual organization ID before deployment
-- DIME scores are set based on complexity: Basic=65, Intermediate=75, Advanced=85

-- ============================================================================
-- CYBERSECURITY CONTROLS (21 controls)
-- ============================================================================

INSERT INTO control_library (
  control_code, control_name, control_description, control_type, control_effect,
  design_score, implementation_score, monitoring_score, evaluation_score,
  cost, timeline, ownership, complexity, status, organization_id, approved_at
) VALUES
('CTL-001', 'MFA', 'Multi-factor authentication for user access', 'preventive', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Short', 'IT', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-002', 'RBAC', 'Role-based access control', 'preventive', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Short', 'IT', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-003', 'Privileged Access Mgmt (PAM)', 'Privileged access management system', 'preventive', 'likelihood_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'IT/Security', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-004', 'Password complexity enforcement', 'Enforce strong password policies', 'preventive', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Short', 'IT', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-005', 'Credential rotation', 'Regular rotation of credentials and passwords', 'preventive', 'likelihood_reducing', 75, 75, 75, 75, 'Low', 'Short', 'Security', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-006', 'Network segmentation', 'Segment network into security zones', 'preventive', 'likelihood_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'IT', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-007', 'Firewall rule hardening', 'Harden and optimize firewall rules', 'preventive', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Short', 'IT/Security', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-008', 'Intrusion Detection (IDS)', 'Intrusion detection system', 'detective', 'likelihood_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'Security', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-009', 'Intrusion Prevention (IPS)', 'Intrusion prevention system', 'preventive', 'likelihood_reducing', 85, 85, 85, 85, 'High', 'Medium', 'Security', 'Advanced', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-010', 'Endpoint security / EDR', 'Endpoint detection and response', 'detective', 'likelihood_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'IT/Security', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-011', 'Security patching cadence', 'Regular security patch deployment', 'preventive', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Short', 'IT', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-012', 'DNS filtering', 'Filter malicious DNS requests', 'preventive', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Short', 'IT/Security', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-013', 'Firmware integrity validation', 'Validate firmware integrity', 'preventive', 'likelihood_reducing', 85, 85, 85, 85, 'Medium', 'Medium', 'IT/Security', 'Advanced', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-014', 'Privileged session recording', 'Record privileged user sessions', 'detective', 'likelihood_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'IT/Risk', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-015', 'Security incident response plan', 'Documented security incident response procedures', 'corrective', 'impact_reducing', 75, 75, 75, 75, 'Low', 'Medium', 'Security/Risk', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-016', 'Penetration testing', 'Regular penetration testing', 'detective', 'likelihood_reducing', 85, 85, 85, 85, 'Medium', 'Medium', 'Security/Vendor', 'Advanced', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-017', 'Automated vulnerability scanning', 'Automated scanning for vulnerabilities', 'detective', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Short', 'Security', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-018', 'Zero-trust network', 'Zero-trust network architecture', 'preventive', 'likelihood_reducing', 85, 85, 85, 85, 'High', 'Long', 'IT/Security/Exec', 'Advanced', 'active', 'YOUR_ORG_ID', NOW()),

-- OPERATIONAL CONTROLS (15 controls)
('CTL-019', 'Load balancing', 'Distribute load across multiple resources', 'preventive', 'likelihood_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'IT', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-020', 'Auto-scaling', 'Automatic resource scaling based on demand', 'preventive', 'likelihood_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'IT', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-021', 'Fail-over infrastructure', 'Automatic failover to backup systems', 'corrective', 'impact_reducing', 85, 85, 85, 85, 'High', 'Long', 'IT', 'Advanced', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-022', 'Queue buffering & throttling', 'Buffer and throttle request queues', 'preventive', 'likelihood_reducing', 75, 75, 75, 75, 'Low', 'Short', 'IT', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-023', 'Maintenance windows', 'Scheduled maintenance windows', 'preventive', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Short', 'Ops', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-024', 'Standard Operating Procedures', 'Documented SOPs for critical processes', 'preventive', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Medium', 'Ops/Risk', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-025', 'QA/QC workflow', 'Quality assurance and quality control workflow', 'preventive', 'likelihood_reducing', 75, 75, 75, 75, 'Low', 'Medium', 'Ops', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-026', 'Dual validation (4-eyes)', 'Two-person verification for critical actions', 'preventive', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Short', 'Ops/HR', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-027', 'Exception logging', 'Log all exceptions and errors', 'detective', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Short', 'Ops/IT', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-028', 'Audit & control testing', 'Regular audit and control effectiveness testing', 'detective', 'likelihood_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'Risk/Audit', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-029', 'Process monitoring', 'Monitor process execution and performance', 'detective', 'likelihood_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'Ops', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-030', 'Real-time alerting', 'Real-time alerts for critical events', 'detective', 'likelihood_reducing', 75, 75, 75, 75, 'Low', 'Short', 'Ops/IT', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-031', 'RTO/RPO definition', 'Define Recovery Time and Recovery Point Objectives', 'preventive', 'impact_reducing', 75, 75, 75, 75, 'Low', 'Medium', 'Ops/Risk', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-032', 'Business continuity manuals', 'Documented business continuity procedures', 'corrective', 'impact_reducing', 65, 65, 65, 65, 'Low', 'Medium', 'Risk', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),

-- DATA GOVERNANCE CONTROLS (12 controls)
('CTL-033', 'Data validation (input)', 'Validate data at input', 'preventive', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Short', 'IT/Data', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-034', 'Data reconciliation', 'Reconcile data across systems', 'detective', 'likelihood_reducing', 75, 75, 75, 75, 'Low', 'Medium', 'Data/Finance', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-035', 'Master data management', 'Centralized master data management', 'preventive', 'likelihood_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'Data/IT', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-036', 'Access-based data partitioning', 'Partition data based on access rights', 'preventive', 'likelihood_reducing', 75, 75, 75, 75, 'Low', 'Short', 'Data/Security', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-037', 'Checksum data integrity', 'Use checksums to verify data integrity', 'detective', 'likelihood_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'IT', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-038', 'Data masking/tokenizing', 'Mask or tokenize sensitive data', 'preventive', 'impact_reducing', 85, 85, 85, 85, 'Medium', 'Medium', 'IT/Security', 'Advanced', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-039', 'Encryption at rest', 'Encrypt data at rest', 'preventive', 'impact_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'IT', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-040', 'Encryption in transit', 'Encrypt data in transit', 'preventive', 'impact_reducing', 65, 65, 65, 65, 'Low', 'Short', 'IT', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-041', 'Data classification', 'Classify data by sensitivity', 'preventive', 'likelihood_reducing', 75, 75, 75, 75, 'Low', 'Medium', 'Data/Risk', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-042', 'Data retention policies', 'Define and enforce data retention policies', 'preventive', 'impact_reducing', 65, 65, 65, 65, 'Low', 'Short', 'Data/Legal', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-043', 'PII/PHI privacy enforcement', 'Enforce privacy controls for sensitive data', 'preventive', 'impact_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'IT/Legal', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),

-- GOVERNANCE & COMPLIANCE CONTROLS (9 controls)
('CTL-044', 'Segregation of duties', 'Separate critical functions to prevent fraud', 'preventive', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Medium', 'Risk/Ops/HR', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-045', 'Approval workflows', 'Multi-level approval workflows', 'preventive', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Short', 'Ops', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-046', 'Board oversight escalation', 'Escalation framework to board', 'corrective', 'impact_reducing', 75, 75, 75, 75, 'Low', 'Medium', 'Exec', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-047', 'Risk ownership assignment', 'Clear risk ownership and accountability', 'preventive', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Medium', 'Risk/Exec', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-048', 'Regulatory compliance monitoring', 'Monitor regulatory compliance', 'detective', 'likelihood_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'Legal/Risk', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-049', 'Policy enforcement audits', 'Regular policy compliance audits', 'detective', 'likelihood_reducing', 75, 75, 75, 75, 'Low', 'Medium', 'Risk/Audit', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-050', 'Independent assurance reviews', 'Independent third-party reviews', 'detective', 'impact_reducing', 85, 85, 85, 85, 'Medium', 'Long', 'Audit/External', 'Advanced', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-051', 'Ethical conduct program', 'Ethics training and enforcement program', 'preventive', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Medium', 'HR/Exec', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-052', 'Whistleblower & speak-up channel', 'Confidential whistleblower hotline', 'detective', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Short', 'HR/Risk', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),

-- FINANCIAL CONTROLS (9 controls)
('CTL-053', 'Liquidity monitoring', 'Monitor cash flow and liquidity', 'detective', 'likelihood_reducing', 75, 75, 75, 75, 'Low', 'Medium', 'Finance', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-054', 'Capital adequacy buffer', 'Maintain capital adequacy buffer', 'preventive', 'impact_reducing', 75, 75, 75, 75, 'Medium', 'Long', 'Exec/Finance', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-055', 'Hedging strategy', 'Financial hedging for risk mitigation', 'preventive', 'impact_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'Treasury', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-056', 'Stress testing', 'Regular financial stress testing', 'detective', 'likelihood_reducing', 75, 75, 75, 75, 'Low', 'Medium', 'Risk/Finance', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-057', 'Sensitivity analysis', 'Sensitivity analysis for key assumptions', 'detective', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Medium', 'Risk/Finance', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-058', 'Counterparty credit evaluation', 'Evaluate counterparty credit risk', 'preventive', 'likelihood_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'Finance', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-059', 'Payment authorization limits', 'Tiered payment authorization limits', 'preventive', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Short', 'Finance', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-060', 'Treasury segregation', 'Segregate treasury functions', 'preventive', 'likelihood_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'Finance', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-061', 'Fraud detection analytics', 'Automated fraud detection analytics', 'detective', 'likelihood_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'IT/Finance', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),

-- HR / PEOPLE / CULTURE CONTROLS (8 controls)
('CTL-062', 'Mandatory training', 'Mandatory training programs', 'preventive', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Medium', 'HR/Risk', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-063', 'Competency certification', 'Certify staff competency', 'preventive', 'likelihood_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'HR', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-064', 'Access revocation on termination', 'Immediately revoke access upon termination', 'preventive', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Short', 'HR/IT', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-065', 'Job rotation', 'Regular job rotation to reduce risk', 'preventive', 'likelihood_reducing', 75, 75, 75, 75, 'Low', 'Medium', 'HR/Risk', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-066', 'Role clarity & job description', 'Clear role definitions and job descriptions', 'preventive', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Medium', 'HR', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-067', 'Burnout-monitoring', 'Monitor employee burnout indicators', 'detective', 'likelihood_reducing', 75, 75, 75, 75, 'Low', 'Medium', 'HR', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-068', 'Conduct policy', 'Code of conduct policy enforcement', 'preventive', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Medium', 'HR', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-069', 'Minimum staffing thresholds', 'Maintain minimum staffing levels', 'preventive', 'likelihood_reducing', 65, 65, 65, 65, 'Medium', 'Medium', 'HR/Ops', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),

-- THIRD-PARTY / VENDOR CONTROLS (7 controls)
('CTL-070', 'Vendor SLA enforcement', 'Enforce vendor SLA compliance', 'preventive', 'likelihood_reducing', 75, 75, 75, 75, 'Low', 'Medium', 'Procurement/Risk', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-071', 'Multi-vendor redundancy', 'Use multiple vendors for critical services', 'preventive', 'impact_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'Procurement', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-072', 'Periodic vendor assessments', 'Regularly assess vendor performance', 'detective', 'likelihood_reducing', 75, 75, 75, 75, 'Low', 'Medium', 'Risk/Procurement', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-073', 'Access boundary for vendors', 'Restrict vendor access to minimum required', 'preventive', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Short', 'IT', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-074', 'Vendor accreditation', 'Require vendor certifications and accreditations', 'preventive', 'likelihood_reducing', 75, 75, 75, 75, 'Low', 'Medium', 'Procurement', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-075', 'Third-party incident reporting', 'Require vendors to report incidents', 'detective', 'impact_reducing', 65, 65, 65, 65, 'Low', 'Medium', 'Vendor/Risk', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-076', 'API health monitoring', 'Monitor vendor API health and performance', 'detective', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Short', 'IT', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),

-- PHYSICAL & FACILITY CONTROLS (7 controls)
('CTL-077', 'Physical access badges', 'Badge-based physical access control', 'preventive', 'likelihood_reducing', 65, 65, 65, 65, 'Medium', 'Medium', 'Security/Facilities', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-078', 'CCTV surveillance', 'CCTV monitoring of facilities', 'detective', 'likelihood_reducing', 65, 65, 65, 65, 'Low', 'Short', 'Security/Facilities', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-079', 'Man-trap entry', 'Man-trap entry points for secure areas', 'preventive', 'likelihood_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'Facilities', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-080', 'Biometric facility access', 'Biometric access controls', 'preventive', 'likelihood_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'Facilities/Security', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-081', 'Fire suppression system', 'Automated fire suppression', 'corrective', 'impact_reducing', 75, 75, 75, 75, 'High', 'Long', 'Facilities', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-082', 'Power backup UPS', 'Uninterruptible power supply', 'corrective', 'impact_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'Facilities/IT', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-083', 'Secured server cages', 'Physical security for server infrastructure', 'preventive', 'likelihood_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'Facilities', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),

-- INFRASTRUCTURE & ARCHITECTURE CONTROLS (6 controls)
('CTL-084', 'Containerization', 'Use containers for application deployment', 'preventive', 'likelihood_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'IT', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-085', 'Microservices', 'Microservices architecture', 'preventive', 'likelihood_reducing', 85, 85, 85, 85, 'High', 'Long', 'IT', 'Advanced', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-086', 'Geo-distribution', 'Geographic distribution of infrastructure', 'preventive', 'impact_reducing', 85, 85, 85, 85, 'High', 'Long', 'IT', 'Advanced', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-087', 'Cold/Warm/Hot standby', 'Standby infrastructure for failover', 'corrective', 'impact_reducing', 85, 85, 85, 85, 'High', 'Medium', 'IT', 'Advanced', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-088', 'Chaos-engineering', 'Chaos engineering for resilience testing', 'detective', 'likelihood_reducing', 85, 85, 85, 85, 'Medium', 'Medium', 'IT', 'Advanced', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-089', 'Automated roll-back', 'Automated deployment rollback', 'corrective', 'likelihood_reducing', 75, 75, 75, 75, 'Low', 'Short', 'IT', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),

-- DISASTER RECOVERY & RESILIENCE (6 controls)
('CTL-090', 'RTO/RPO frameworks', 'Recovery time and point objective frameworks', 'preventive', 'impact_reducing', 75, 75, 75, 75, 'Low', 'Medium', 'Risk/Ops', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-091', 'Off-site backups', 'Maintain off-site data backups', 'corrective', 'impact_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'IT', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-092', 'Table-top recovery drills', 'Regular disaster recovery drills', 'preventive', 'impact_reducing', 75, 75, 75, 75, 'Low', 'Medium', 'Risk', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-093', 'Crisis communications', 'Crisis communication protocols', 'corrective', 'impact_reducing', 65, 65, 65, 65, 'Low', 'Short', 'Exec/Ops', 'Basic', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-094', 'PR damage-control protocol', 'Public relations damage control procedures', 'corrective', 'impact_reducing', 75, 75, 75, 75, 'Medium', 'Medium', 'Exec/Comms', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW()),
('CTL-095', 'Service failover simulation', 'Regular failover testing and simulation', 'preventive', 'impact_reducing', 75, 75, 75, 75, 'Low', 'Medium', 'IT', 'Intermediate', 'active', 'YOUR_ORG_ID', NOW())
ON CONFLICT (organization_id, control_code) DO NOTHING;

-- Comment
COMMENT ON TABLE control_library IS 'Seeded with 95 comprehensive controls across 10 categories from MASTER_CONTROL_LIBRARY';
