-- HOTFIX: Seed Global Libraries with Missing Data
-- Run this AFTER the hybrid architecture deployment
-- This populates the global_control_library and global_kri_kci_library tables

-- ============================================================================
-- SEED GLOBAL CONTROL LIBRARY (95 Core Controls)
-- ============================================================================

INSERT INTO global_control_library (
  control_code, control_name, control_description, control_type, control_category,
  design_score, implementation_score, monitoring_score, evaluation_score,
  automation_level, complexity_level
) VALUES
-- CYBERSECURITY CONTROLS
('CTL-001', 'MFA', 'Multi-factor authentication for user access', 'preventive', 'Cybersecurity', 75, 70, 60, 50, 'Semi-Automated', 'Basic'),
('CTL-002', 'RBAC', 'Role-based access control', 'preventive', 'Cybersecurity', 75, 70, 60, 50, 'Fully-Automated', 'Basic'),
('CTL-003', 'Privileged Access Mgmt (PAM)', 'Privileged access management system', 'preventive', 'Cybersecurity', 80, 70, 60, 55, 'Semi-Automated', 'Intermediate'),
('CTL-004', 'Password complexity enforcement', 'Enforce strong password policies', 'preventive', 'Cybersecurity', 80, 70, 60, 55, 'Fully-Automated', 'Intermediate'),
('CTL-005', 'Credential rotation', 'Regular rotation of credentials and passwords', 'preventive', 'Cybersecurity', 80, 70, 60, 55, 'Semi-Automated', 'Intermediate'),
('CTL-006', 'Network segmentation', 'Segment network into security zones', 'preventive', 'Cybersecurity', 80, 70, 60, 55, 'Manual', 'Intermediate'),
('CTL-007', 'Firewall rule hardening', 'Harden and optimize firewall rules', 'preventive', 'Cybersecurity', 80, 70, 60, 55, 'Manual', 'Intermediate'),
('CTL-008', 'Intrusion Detection (IDS)', 'Intrusion detection system', 'detective', 'Cybersecurity', 75, 70, 60, 50, 'Fully-Automated', 'Basic'),
('CTL-009', 'Intrusion Prevention (IPS)', 'Intrusion prevention system', 'preventive', 'Cybersecurity', 75, 70, 60, 50, 'Fully-Automated', 'Basic'),
('CTL-010', 'Endpoint security / EDR', 'Endpoint detection and response', 'detective', 'Cybersecurity', 80, 70, 60, 55, 'Fully-Automated', 'Intermediate'),
('CTL-011', 'Security patching cadence', 'Regular security patch deployment', 'preventive', 'Cybersecurity', 75, 70, 60, 50, 'Semi-Automated', 'Basic'),
('CTL-012', 'DNS filtering', 'Filter malicious DNS requests', 'preventive', 'Cybersecurity', 75, 70, 60, 50, 'Fully-Automated', 'Basic'),
('CTL-013', 'Firmware integrity validation', 'Validate firmware integrity', 'preventive', 'Cybersecurity', 80, 70, 60, 55, 'Semi-Automated', 'Intermediate'),
('CTL-014', 'Privileged session recording', 'Record privileged user sessions', 'detective', 'Cybersecurity', 80, 70, 60, 55, 'Fully-Automated', 'Intermediate'),
('CTL-015', 'Security incident response plan', 'Documented security incident response procedures', 'corrective', 'Cybersecurity', 75, 70, 60, 50, 'Manual', 'Basic'),
('CTL-016', 'Penetration testing', 'Regular penetration testing', 'detective', 'Cybersecurity', 75, 70, 60, 50, 'Manual', 'Basic'),
('CTL-017', 'Automated vulnerability scanning', 'Automated scanning for vulnerabilities', 'detective', 'Cybersecurity', 80, 70, 60, 55, 'Fully-Automated', 'Intermediate'),
('CTL-018', 'Zero-trust network', 'Zero-trust network architecture', 'preventive', 'Cybersecurity', 90, 75, 65, 55, 'Semi-Automated', 'Advanced'),

-- OPERATIONAL CONTROLS
('CTL-019', 'Load balancing', 'Distribute load across multiple resources', 'preventive', 'Operational', 80, 70, 60, 55, 'Fully-Automated', 'Intermediate'),
('CTL-020', 'Auto-scaling', 'Automatic resource scaling based on demand', 'preventive', 'Operational', 75, 70, 60, 50, 'Fully-Automated', 'Basic'),
('CTL-021', 'Fail-over infrastructure', 'Automatic failover to backup systems', 'corrective', 'Operational', 75, 70, 60, 50, 'Fully-Automated', 'Basic'),
('CTL-022', 'Queue buffering & throttling', 'Buffer and throttle request queues', 'preventive', 'Operational', 80, 70, 60, 55, 'Fully-Automated', 'Intermediate'),
('CTL-023', 'Maintenance windows', 'Scheduled maintenance windows', 'preventive', 'Operational', 80, 70, 60, 55, 'Manual', 'Intermediate'),
('CTL-024', 'Standard Operating Procedures', 'Documented SOPs for critical processes', 'preventive', 'Operational', 75, 70, 60, 50, 'Manual', 'Basic'),
('CTL-025', 'QA/QC workflow', 'Quality assurance and quality control workflow', 'preventive', 'Operational', 75, 70, 60, 50, 'Semi-Automated', 'Basic'),
('CTL-026', 'Dual validation (4-eyes)', 'Two-person verification for critical actions', 'preventive', 'Operational', 90, 75, 65, 55, 'Manual', 'Advanced'),
('CTL-027', 'Exception logging', 'Log all exceptions and errors', 'detective', 'Operational', 90, 75, 65, 55, 'Fully-Automated', 'Advanced'),
('CTL-028', 'Audit & control testing', 'Regular audit and control effectiveness testing', 'detective', 'Operational', 90, 75, 65, 55, 'Manual', 'Advanced'),
('CTL-029', 'Process monitoring', 'Monitor process execution and performance', 'detective', 'Operational', 90, 75, 65, 55, 'Fully-Automated', 'Advanced'),
('CTL-030', 'Real-time alerting', 'Real-time alerts for critical events', 'detective', 'Operational', 90, 75, 65, 55, 'Fully-Automated', 'Advanced'),
('CTL-031', 'RTO/RPO definition', 'Define Recovery Time and Recovery Point Objectives', 'preventive', 'Operational', 90, 75, 65, 55, 'Manual', 'Advanced'),
('CTL-032', 'Business continuity manuals', 'Documented business continuity procedures', 'corrective', 'Operational', 90, 75, 65, 55, 'Manual', 'Advanced'),

-- DATA GOVERNANCE CONTROLS
('CTL-033', 'Data validation (input)', 'Validate data at input', 'preventive', 'Data Governance', 90, 75, 65, 55, 'Fully-Automated', 'Advanced'),
('CTL-034', 'Data reconciliation', 'Reconcile data across systems', 'detective', 'Data Governance', 90, 75, 65, 55, 'Semi-Automated', 'Advanced'),
('CTL-035', 'Master data management', 'Centralized master data management', 'preventive', 'Data Governance', 90, 75, 65, 55, 'Semi-Automated', 'Advanced'),
('CTL-036', 'Access-based data partitioning', 'Partition data based on access rights', 'preventive', 'Data Governance', 75, 70, 60, 50, 'Fully-Automated', 'Basic'),
('CTL-037', 'Checksum data integrity', 'Use checksums to verify data integrity', 'detective', 'Data Governance', 75, 70, 60, 50, 'Fully-Automated', 'Basic'),
('CTL-038', 'Data masking/tokenizing', 'Mask or tokenize sensitive data', 'preventive', 'Data Governance', 75, 70, 60, 50, 'Fully-Automated', 'Basic'),
('CTL-039', 'Encryption at rest', 'Encrypt data at rest', 'preventive', 'Data Governance', 80, 70, 60, 55, 'Fully-Automated', 'Intermediate'),
('CTL-040', 'Encryption in transit', 'Encrypt data in transit', 'preventive', 'Data Governance', 80, 70, 60, 55, 'Fully-Automated', 'Intermediate'),
('CTL-041', 'Data classification', 'Classify data by sensitivity', 'preventive', 'Data Governance', 80, 70, 60, 55, 'Manual', 'Intermediate'),
('CTL-042', 'Data retention policies', 'Define and enforce data retention policies', 'preventive', 'Data Governance', 80, 70, 60, 55, 'Semi-Automated', 'Intermediate'),
('CTL-043', 'PII/PHI privacy enforcement', 'Enforce privacy controls for sensitive data', 'preventive', 'Data Governance', 80, 70, 60, 55, 'Semi-Automated', 'Intermediate'),

-- GOVERNANCE & COMPLIANCE CONTROLS
('CTL-044', 'Segregation of duties', 'Separate critical functions to prevent fraud', 'preventive', 'Governance & Compliance', 80, 70, 60, 55, 'Manual', 'Intermediate'),
('CTL-045', 'Approval workflows', 'Multi-level approval workflows', 'preventive', 'Governance & Compliance', 75, 70, 60, 50, 'Fully-Automated', 'Basic'),
('CTL-046', 'Board oversight escalation', 'Escalation framework to board', 'corrective', 'Governance & Compliance', 75, 70, 60, 50, 'Manual', 'Basic'),
('CTL-047', 'Risk ownership assignment', 'Clear risk ownership and accountability', 'preventive', 'Governance & Compliance', 75, 70, 60, 50, 'Manual', 'Basic'),
('CTL-048', 'Regulatory compliance monitoring', 'Monitor regulatory compliance', 'detective', 'Governance & Compliance', 80, 70, 60, 55, 'Semi-Automated', 'Intermediate'),
('CTL-049', 'Policy enforcement audits', 'Regular policy compliance audits', 'detective', 'Governance & Compliance', 80, 70, 60, 55, 'Manual', 'Intermediate'),
('CTL-050', 'Independent assurance reviews', 'Independent third-party reviews', 'detective', 'Governance & Compliance', 80, 70, 60, 55, 'Manual', 'Intermediate'),
('CTL-051', 'Ethical conduct program', 'Ethics training and enforcement program', 'preventive', 'Governance & Compliance', 80, 70, 60, 55, 'Manual', 'Intermediate'),
('CTL-052', 'Whistleblower & speak-up channel', 'Confidential whistleblower hotline', 'detective', 'Governance & Compliance', 80, 70, 60, 55, 'Manual', 'Intermediate'),

-- FINANCIAL CONTROLS
('CTL-053', 'Liquidity monitoring', 'Monitor cash flow and liquidity', 'detective', 'Financial', 75, 70, 60, 50, 'Semi-Automated', 'Basic'),
('CTL-054', 'Capital adequacy buffer', 'Maintain capital adequacy buffer', 'preventive', 'Financial', 75, 70, 60, 50, 'Manual', 'Basic'),
('CTL-055', 'Hedging strategy', 'Financial hedging for risk mitigation', 'preventive', 'Financial', 75, 70, 60, 50, 'Manual', 'Basic'),
('CTL-056', 'Stress testing', 'Regular financial stress testing', 'detective', 'Financial', 80, 70, 60, 55, 'Semi-Automated', 'Intermediate'),
('CTL-057', 'Sensitivity analysis', 'Sensitivity analysis for key assumptions', 'detective', 'Financial', 80, 70, 60, 55, 'Manual', 'Intermediate'),
('CTL-058', 'Counterparty credit evaluation', 'Evaluate counterparty credit risk', 'preventive', 'Financial', 80, 70, 60, 55, 'Manual', 'Intermediate'),
('CTL-059', 'Payment authorization limits', 'Tiered payment authorization limits', 'preventive', 'Financial', 80, 70, 60, 55, 'Manual', 'Intermediate'),
('CTL-060', 'Treasury segregation', 'Segregate treasury functions', 'preventive', 'Financial', 80, 70, 60, 55, 'Manual', 'Intermediate'),
('CTL-061', 'Fraud detection analytics', 'Automated fraud detection analytics', 'detective', 'Financial', 80, 70, 60, 55, 'Fully-Automated', 'Intermediate'),

-- HR / PEOPLE CONTROLS
('CTL-062', 'Mandatory training', 'Mandatory training programs', 'preventive', 'Human Capital', 75, 70, 60, 50, 'Manual', 'Basic'),
('CTL-063', 'Competency certification', 'Certify staff competency', 'preventive', 'Human Capital', 75, 70, 60, 50, 'Manual', 'Basic'),
('CTL-064', 'Access revocation on termination', 'Immediately revoke access upon termination', 'preventive', 'Human Capital', 75, 70, 60, 50, 'Semi-Automated', 'Basic'),
('CTL-065', 'Job rotation', 'Regular job rotation to reduce risk', 'preventive', 'Human Capital', 80, 70, 60, 55, 'Manual', 'Intermediate'),
('CTL-066', 'Role clarity & job description', 'Clear role definitions and job descriptions', 'preventive', 'Human Capital', 80, 70, 60, 55, 'Manual', 'Intermediate'),
('CTL-067', 'Burnout-monitoring', 'Monitor employee burnout indicators', 'detective', 'Human Capital', 80, 70, 60, 55, 'Manual', 'Intermediate'),
('CTL-068', 'Conduct policy', 'Code of conduct policy enforcement', 'preventive', 'Human Capital', 80, 70, 60, 55, 'Manual', 'Intermediate'),
('CTL-069', 'Minimum staffing thresholds', 'Maintain minimum staffing levels', 'preventive', 'Human Capital', 80, 70, 60, 55, 'Manual', 'Intermediate'),

-- THIRD-PARTY / VENDOR CONTROLS
('CTL-070', 'Vendor SLA enforcement', 'Enforce vendor SLA compliance', 'preventive', 'Third-Party Risk', 75, 70, 60, 50, 'Manual', 'Basic'),
('CTL-071', 'Multi-vendor redundancy', 'Use multiple vendors for critical services', 'preventive', 'Third-Party Risk', 75, 70, 60, 50, 'Manual', 'Basic'),
('CTL-072', 'Vendor risk assessment', 'Regular vendor risk assessments', 'detective', 'Third-Party Risk', 75, 70, 60, 50, 'Manual', 'Basic'),
('CTL-073', 'Contract exit clauses', 'Include exit clauses in vendor contracts', 'preventive', 'Third-Party Risk', 80, 70, 60, 55, 'Manual', 'Intermediate'),
('CTL-074', 'Vendor audit rights', 'Right to audit vendor operations', 'detective', 'Third-Party Risk', 80, 70, 60, 55, 'Manual', 'Intermediate'),
('CTL-075', 'Vendor insurance requirements', 'Require adequate insurance coverage from vendors', 'preventive', 'Third-Party Risk', 80, 70, 60, 55, 'Manual', 'Intermediate'),

-- TECHNOLOGY / IT CONTROLS
('CTL-076', 'Disaster recovery testing', 'Regular disaster recovery testing', 'corrective', 'Technology & IT', 80, 70, 60, 55, 'Manual', 'Intermediate'),
('CTL-077', 'Backup & restoration procedures', 'Regular backup and restoration procedures', 'corrective', 'Technology & IT', 80, 70, 60, 55, 'Fully-Automated', 'Intermediate'),
('CTL-078', 'System capacity planning', 'Plan for system capacity and scalability', 'preventive', 'Technology & IT', 75, 70, 60, 50, 'Manual', 'Basic'),
('CTL-079', 'Change management process', 'Formal change management process', 'preventive', 'Technology & IT', 75, 70, 60, 50, 'Semi-Automated', 'Basic'),
('CTL-080', 'Versioning & rollback capability', 'Version control and rollback procedures', 'corrective', 'Technology & IT', 75, 70, 60, 50, 'Semi-Automated', 'Basic'),
('CTL-081', 'Configuration management', 'Centralized configuration management', 'preventive', 'Technology & IT', 80, 70, 60, 55, 'Fully-Automated', 'Intermediate'),
('CTL-082', 'Asset inventory', 'Maintain IT asset inventory', 'detective', 'Technology & IT', 80, 70, 60, 55, 'Fully-Automated', 'Intermediate'),
('CTL-083', 'Decommissioning procedures', 'Secure decommissioning of IT assets', 'preventive', 'Technology & IT', 80, 70, 60, 55, 'Manual', 'Intermediate'),

-- COMMUNICATION & STAKEHOLDER CONTROLS
('CTL-084', 'Crisis communication plan', 'Crisis communication procedures', 'corrective', 'Communication', 80, 70, 60, 55, 'Manual', 'Intermediate'),
('CTL-085', 'Media monitoring', 'Monitor media and social media', 'detective', 'Communication', 75, 70, 60, 50, 'Fully-Automated', 'Basic'),
('CTL-086', 'Stakeholder engagement', 'Regular stakeholder engagement', 'preventive', 'Communication', 75, 70, 60, 50, 'Manual', 'Basic'),
('CTL-087', 'Internal communications', 'Clear internal communication channels', 'preventive', 'Communication', 75, 70, 60, 50, 'Manual', 'Basic'),

-- PHYSICAL SECURITY CONTROLS
('CTL-088', 'Access control systems', 'Physical access control systems', 'preventive', 'Physical Security', 80, 70, 60, 55, 'Fully-Automated', 'Intermediate'),
('CTL-089', 'Surveillance systems', 'CCTV and surveillance systems', 'detective', 'Physical Security', 80, 70, 60, 55, 'Fully-Automated', 'Intermediate'),
('CTL-090', 'Environmental controls', 'Fire suppression, HVAC, power backup', 'preventive', 'Physical Security', 80, 70, 60, 55, 'Fully-Automated', 'Intermediate'),
('CTL-091', 'Visitor management', 'Visitor sign-in and escort procedures', 'preventive', 'Physical Security', 75, 70, 60, 50, 'Manual', 'Basic'),

-- LEGAL & REGULATORY CONTROLS
('CTL-092', 'Contract review process', 'Legal review of contracts', 'preventive', 'Legal & Regulatory', 75, 70, 60, 50, 'Manual', 'Basic'),
('CTL-093', 'Intellectual property protection', 'Protect intellectual property rights', 'preventive', 'Legal & Regulatory', 75, 70, 60, 50, 'Manual', 'Basic'),
('CTL-094', 'Regulatory reporting', 'Timely regulatory reporting', 'preventive', 'Legal & Regulatory', 80, 70, 60, 55, 'Semi-Automated', 'Intermediate'),
('CTL-095', 'Licensing compliance', 'Ensure software and service licensing compliance', 'preventive', 'Legal & Regulatory', 80, 70, 60, 55, 'Fully-Automated', 'Intermediate')

ON CONFLICT (control_code) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- ============================================================================
-- SEED GLOBAL KRI/KCI LIBRARY (39 Indicators)
-- ============================================================================

INSERT INTO global_kri_kci_library (
  indicator_code, indicator_type, indicator_name, indicator_description,
  measurement_unit, measurement_frequency, warning_threshold, critical_threshold,
  category, subcategory
) VALUES
-- KRIs (Leading Indicators - 20 indicators)
('KRI-001', 'KRI', 'CPU > 80%', 'CPU utilization exceeds 80% threshold', '%', 'real-time', 80, 90, 'Infrastructure', 'Threshold'),
('KRI-002', 'KRI', 'Memory saturation > 75%', 'Memory usage exceeds 75% threshold', '%', 'real-time', 75, 85, 'Infrastructure', 'Threshold'),
('KRI-003', 'KRI', 'Disk I/O latency spikes', 'Disk input/output latency exceeds baseline', 'ms', 'real-time', 100, 200, 'Infrastructure', 'Threshold'),
('KRI-004', 'KRI', 'Network packet loss > 2%', 'Network packet loss exceeds 2%', '%', 'real-time', 2, 5, 'Infrastructure', 'Threshold'),
('KRI-005', 'KRI', 'API failure rates > baseline', 'API failure rate exceeds normal baseline', '%', 'daily', 5, 10, 'Operational', 'Trend'),
('KRI-006', 'KRI', 'Interface timeout frequency', 'Frequency of interface timeout errors', 'count', 'daily', 10, 25, 'Operational', 'Threshold'),
('KRI-007', 'KRI', 'Queue backlog growth rate', 'Rate of queue backlog accumulation', 'items/hr', 'real-time', 1000, 5000, 'Operational', 'Capacity'),
('KRI-008', 'KRI', 'Microservice error propagation', 'Errors propagating across microservices', 'count', 'daily', 5, 15, 'Infrastructure', 'Stability'),
('KRI-009', 'KRI', 'Login failures / min', 'Failed login attempts per minute', 'count', 'real-time', 10, 25, 'Cybersecurity', 'Threshold'),
('KRI-010', 'KRI', 'Privileged login volume spike', 'Unusual increase in privileged account logins', 'count', 'daily', 50, 100, 'Cybersecurity', 'Anomaly'),
('KRI-011', 'KRI', 'Unauthorized access attempts', 'Detected unauthorized access attempts', 'count', 'daily', 5, 15, 'Cybersecurity', 'Count'),
('KRI-012', 'KRI', 'Endpoint malware detection', 'Malware detected on endpoints', 'count', 'daily', 1, 5, 'Cybersecurity', 'Security'),
('KRI-013', 'KRI', 'Unpatched vulnerabilities', 'Number of unpatched critical vulnerabilities', 'count', 'weekly', 5, 15, 'Cybersecurity', 'Count'),
('KRI-014', 'KRI', 'Vendor SLA breach count', 'Number of vendor SLA breaches', 'count', 'monthly', 2, 5, 'Third-Party', 'Contractual'),
('KRI-015', 'KRI', 'Dependency failure frequency', 'Frequency of third-party dependency failures', 'count', 'weekly', 3, 7, 'Third-Party', 'Reliability'),
('KRI-016', 'KRI', 'Data mismatch occurrences', 'Data validation failures or mismatches', 'count', 'daily', 10, 25, 'Data Governance', 'Validation'),
('KRI-017', 'KRI', 'Manual override frequency', 'Frequency of manual process overrides', 'count', 'weekly', 5, 15, 'Governance', 'Exception'),
('KRI-018', 'KRI', 'Internal SOP violations', 'Standard operating procedure violations', 'count', 'monthly', 3, 10, 'Governance', 'Culture'),
('KRI-019', 'KRI', 'Staffing below minimum', 'Staffing levels below minimum threshold', 'count', 'weekly', 1, 3, 'HR', 'Capacity'),
('KRI-020', 'KRI', 'Overtime & burnout metrics', 'Employee overtime hours indicating burnout risk', 'hours', 'weekly', 10, 20, 'HR', 'Fatigue'),

-- KCIs (Lagging Indicators - 19 indicators)
('KCI-001', 'KCI', 'Average downtime duration', 'Average duration of service outages', 'hours', 'monthly', 2, 5, 'Operations', 'Impact'),
('KCI-002', 'KCI', 'Service unavailability hours', 'Total hours of service unavailability', 'hours', 'monthly', 8, 24, 'Operations', 'Impact'),
('KCI-003', 'KCI', 'Incident resolution time', 'Average time to resolve incidents', 'hours', 'monthly', 24, 48, 'Operations', 'Efficiency'),
('KCI-004', 'KCI', 'MTTR (Mean Time to Repair)', 'Mean time to repair after failure', 'hours', 'monthly', 4, 12, 'Operations', 'Efficiency'),
('KCI-005', 'KCI', 'MTBF (Mean Time Between Failures)', 'Mean time between system failures', 'days', 'monthly', 30, 15, 'Operations', 'Reliability'),
('KCI-006', 'KCI', 'Customer complaint volume', 'Number of customer complaints', 'count', 'monthly', 50, 100, 'Customer', 'Impact'),
('KCI-007', 'KCI', 'Complaint escalation rate', 'Percentage of complaints escalated', '%', 'monthly', 10, 20, 'Customer', 'Impact'),
('KCI-008', 'KCI', 'Client churn rate', 'Customer churn rate', '%', 'quarterly', 5, 10, 'Business', 'Retention'),
('KCI-009', 'KCI', 'Refunds issued', 'Total value of refunds issued', '$', 'monthly', 10000, 50000, 'Finance', 'Loss'),
('KCI-010', 'KCI', 'Transaction loss amount', 'Monetary value of lost transactions', '$', 'monthly', 5000, 25000, 'Finance', 'Loss'),
('KCI-011', 'KCI', 'Revenue impairment', 'Revenue loss from incidents', '$', 'monthly', 50000, 250000, 'Business', 'Loss'),
('KCI-012', 'KCI', 'Regulatory fine amount', 'Total regulatory fines incurred', '$', 'quarterly', 10000, 100000, 'Compliance', 'Legal'),
('KCI-013', 'KCI', 'Audit finding count', 'Number of audit findings', 'count', 'quarterly', 5, 15, 'Compliance', 'Governance'),
('KCI-014', 'KCI', 'Compliance breach count', 'Number of regulatory compliance breaches', 'count', 'quarterly', 1, 3, 'Compliance', 'Legal'),
('KCI-015', 'KCI', 'Confidential data exposure', 'Number of confidential data exposure incidents', 'count', 'quarterly', 1, 3, 'Security', 'Damage'),
('KCI-016', 'KCI', 'Brand sentiment index', 'Brand sentiment score (0-100)', 'score', 'monthly', 60, 40, 'Reputation', 'PR'),
('KCI-017', 'KCI', 'Social media negative mentions', 'Volume of negative social media mentions', 'count', 'monthly', 50, 150, 'Reputation', 'PR'),
('KCI-018', 'KCI', 'Reputational damage severity', 'Qualitative assessment of reputational harm', 'score', 'quarterly', 3, 7, 'Reputation', 'Qualitative'),
('KCI-019', 'KCI', 'Market share shift', 'Percentage change in market share', '%', 'quarterly', -2, -5, 'Business', 'Loss')

ON CONFLICT (indicator_code) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_control_count INTEGER;
  v_indicator_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_control_count FROM global_control_library;
  SELECT COUNT(*) INTO v_indicator_count FROM global_kri_kci_library;

  RAISE NOTICE '✓ Global control library populated: % controls', v_control_count;
  RAISE NOTICE '✓ Global KRI/KCI library populated: % indicators', v_indicator_count;

  IF v_control_count < 95 THEN
    RAISE WARNING 'Expected 95 controls, found %', v_control_count;
  END IF;

  IF v_indicator_count < 39 THEN
    RAISE WARNING 'Expected 39 indicators, found %', v_indicator_count;
  END IF;
END $$;

SELECT
  (SELECT COUNT(*) FROM global_control_library) as controls,
  (SELECT COUNT(*) FROM global_kri_kci_library) as indicators,
  'HOTFIX COMPLETE - Global libraries seeded' as status;
