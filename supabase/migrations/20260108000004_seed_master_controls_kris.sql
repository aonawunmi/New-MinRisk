-- ============================================================================
-- MASTER SEED LIBRARY: CONTROLS (100+) & KRIs/KCIs (60+)
-- ============================================================================

-- CONTROLS - CYBERSECURITY (15)
INSERT INTO seed_master_library (library_type, code, name, description, category_hints, keyword_hints, industry_tags, metadata) VALUES
('control', 'CTL-CY-001', 'Multi-factor authentication', 'Require MFA for system access', ARRAY['Cyber', 'Technology', 'Access'], ARRAY['MFA', 'authentication', 'access'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Fully-Automated"}'::jsonb),
('control', 'CTL-CY-002', 'Role-based access control', 'Restrict access based on roles', ARRAY['Cyber', 'Technology', 'Access'], ARRAY['RBAC', 'access', 'roles'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Fully-Automated"}'::jsonb),
('control', 'CTL-CY-003', 'Network segmentation', 'Separate network zones', ARRAY['Cyber', 'Technology', 'Network'], ARRAY['network', 'segmentation', 'firewall'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-CY-004', 'Endpoint protection', 'Antivirus and EDR on endpoints', ARRAY['Cyber', 'Technology'], ARRAY['endpoint', 'antivirus', 'EDR'], ARRAY['universal'], '{"control_type": "detective", "automation_level": "Fully-Automated"}'::jsonb),
('control', 'CTL-CY-005', 'Security awareness training', 'Cybersecurity training for staff', ARRAY['Cyber', 'People'], ARRAY['training', 'awareness', 'phishing'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Manual"}'::jsonb),
('control', 'CTL-CY-006', 'Vulnerability scanning', 'Regular scans for vulnerabilities', ARRAY['Cyber', 'Technology'], ARRAY['vulnerability', 'scan', 'patch'], ARRAY['universal'], '{"control_type": "detective", "automation_level": "Fully-Automated"}'::jsonb),
('control', 'CTL-CY-007', 'Patch management', 'Timely application of security patches', ARRAY['Cyber', 'Technology'], ARRAY['patch', 'update', 'vulnerability'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-CY-008', 'Security incident response', 'Procedures for handling incidents', ARRAY['Cyber', 'Incident'], ARRAY['incident', 'response', 'SIEM'], ARRAY['universal'], '{"control_type": "corrective", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-CY-009', 'Data encryption', 'Encrypt data at rest and in transit', ARRAY['Cyber', 'Data'], ARRAY['encryption', 'data', 'security'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Fully-Automated"}'::jsonb),
('control', 'CTL-CY-010', 'Privileged access management', 'Control over admin accounts', ARRAY['Cyber', 'Access'], ARRAY['PAM', 'privileged', 'admin'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Fully-Automated"}'::jsonb),
('control', 'CTL-CY-011', 'DDoS protection', 'Defense against denial of service', ARRAY['Cyber', 'Network'], ARRAY['DDoS', 'availability', 'protection'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Fully-Automated"}'::jsonb),
('control', 'CTL-CY-012', 'Cloud security controls', 'Security for cloud environments', ARRAY['Cyber', 'Cloud'], ARRAY['cloud', 'security', 'CSPM'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Fully-Automated"}'::jsonb),
('control', 'CTL-CY-013', 'Email security gateway', 'Filter malicious emails', ARRAY['Cyber', 'Email'], ARRAY['email', 'phishing', 'gateway'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Fully-Automated"}'::jsonb),
('control', 'CTL-CY-014', 'Security logging and monitoring', 'Centralized security logs', ARRAY['Cyber', 'Monitoring'], ARRAY['logging', 'SIEM', 'monitoring'], ARRAY['universal'], '{"control_type": "detective", "automation_level": "Fully-Automated"}'::jsonb),
('control', 'CTL-CY-015', 'Penetration testing', 'Regular security testing', ARRAY['Cyber', 'Testing'], ARRAY['pentest', 'security', 'testing'], ARRAY['universal'], '{"control_type": "detective", "automation_level": "Manual"}'::jsonb),

-- CONTROLS - OPERATIONAL (15)
('control', 'CTL-OP-001', 'Segregation of duties', 'Separate incompatible functions', ARRAY['Operational', 'Governance'], ARRAY['SoD', 'segregation', 'duties'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-OP-002', 'Business continuity plan', 'Documented BCP procedures', ARRAY['Operational', 'Continuity'], ARRAY['BCP', 'continuity', 'disaster'], ARRAY['universal'], '{"control_type": "corrective", "automation_level": "Manual"}'::jsonb),
('control', 'CTL-OP-003', 'Backup and recovery', 'Regular data backups', ARRAY['Operational', 'Technology'], ARRAY['backup', 'recovery', 'data'], ARRAY['universal'], '{"control_type": "corrective", "automation_level": "Fully-Automated"}'::jsonb),
('control', 'CTL-OP-004', 'Change management process', 'Controlled changes to systems', ARRAY['Operational', 'Technology'], ARRAY['change', 'CAB', 'release'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-OP-005', 'Quality assurance testing', 'Testing before deployment', ARRAY['Operational', 'Quality'], ARRAY['QA', 'testing', 'quality'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-OP-006', 'SOPs and work instructions', 'Documented procedures', ARRAY['Operational', 'Process'], ARRAY['SOP', 'procedure', 'documentation'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Manual"}'::jsonb),
('control', 'CTL-OP-007', 'Capacity management', 'Monitor and plan capacity', ARRAY['Operational', 'Capacity'], ARRAY['capacity', 'performance', 'planning'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-OP-008', 'Incident management process', 'Handle operational incidents', ARRAY['Operational', 'Incident'], ARRAY['incident', 'problem', 'ITIL'], ARRAY['universal'], '{"control_type": "corrective", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-OP-009', 'Asset management', 'Track and manage assets', ARRAY['Operational', 'Asset'], ARRAY['asset', 'inventory', 'CMDB'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Fully-Automated"}'::jsonb),
('control', 'CTL-OP-010', 'Physical security controls', 'Secure physical access', ARRAY['Operational', 'Physical'], ARRAY['physical', 'access', 'badge'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-OP-011', 'Environmental monitoring', 'Monitor facilities conditions', ARRAY['Operational', 'Facilities'], ARRAY['environmental', 'temperature', 'humidity'], ARRAY['universal'], '{"control_type": "detective", "automation_level": "Fully-Automated"}'::jsonb),
('control', 'CTL-OP-012', 'Service level monitoring', 'Track SLA performance', ARRAY['Operational', 'Performance'], ARRAY['SLA', 'monitoring', 'metrics'], ARRAY['universal'], '{"control_type": "detective", "automation_level": "Fully-Automated"}'::jsonb),
('control', 'CTL-OP-013', 'Dual authorization', 'Two-person approval for critical actions', ARRAY['Operational', 'Governance'], ARRAY['dual', 'authorization', 'approval'], ARRAY['financial_services', 'universal'], '{"control_type": "preventive", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-OP-014', 'Disaster recovery testing', 'Regular DR drills', ARRAY['Operational', 'Continuity'], ARRAY['DR', 'disaster', 'testing'], ARRAY['universal'], '{"control_type": "detective", "automation_level": "Manual"}'::jsonb),
('control', 'CTL-OP-015', 'Root cause analysis', 'Investigate incident causes', ARRAY['Operational', 'Improvement'], ARRAY['RCA', 'root cause', 'analysis'], ARRAY['universal'], '{"control_type": "corrective", "automation_level": "Manual"}'::jsonb),

-- CONTROLS - FINANCIAL (12)
('control', 'CTL-FN-001', 'Budget approval process', 'Formal budget authorization', ARRAY['Financial', 'Governance'], ARRAY['budget', 'approval', 'authorization'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-FN-002', 'Financial reconciliation', 'Regular account reconciliation', ARRAY['Financial', 'Accounting'], ARRAY['reconciliation', 'accounts', 'balance'], ARRAY['universal'], '{"control_type": "detective", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-FN-003', 'Invoice verification', 'Three-way matching for payments', ARRAY['Financial', 'Accounts Payable'], ARRAY['invoice', 'matching', 'payment'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Fully-Automated"}'::jsonb),
('control', 'CTL-FN-004', 'Credit limit monitoring', 'Monitor customer credit exposure', ARRAY['Financial', 'Credit'], ARRAY['credit', 'limit', 'exposure'], ARRAY['financial_services', 'universal'], '{"control_type": "preventive", "automation_level": "Fully-Automated"}'::jsonb),
('control', 'CTL-FN-005', 'Expense approval workflow', 'Hierarchical expense approvals', ARRAY['Financial', 'Expenses'], ARRAY['expense', 'approval', 'workflow'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Fully-Automated"}'::jsonb),
('control', 'CTL-FN-006', 'Treasury controls', 'Cash and investment management', ARRAY['Financial', 'Treasury'], ARRAY['treasury', 'cash', 'investment'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-FN-007', 'External audit', 'Independent financial audit', ARRAY['Financial', 'Audit'], ARRAY['audit', 'external', 'financial'], ARRAY['universal'], '{"control_type": "detective", "automation_level": "Manual"}'::jsonb),
('control', 'CTL-FN-008', 'Journal entry review', 'Review of manual entries', ARRAY['Financial', 'Accounting'], ARRAY['journal', 'entry', 'review'], ARRAY['universal'], '{"control_type": "detective", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-FN-009', 'Fraud detection analytics', 'Automated fraud detection', ARRAY['Financial', 'Fraud'], ARRAY['fraud', 'detection', 'analytics'], ARRAY['universal'], '{"control_type": "detective", "automation_level": "Fully-Automated"}'::jsonb),
('control', 'CTL-FN-010', 'Revenue recognition controls', 'Proper revenue accounting', ARRAY['Financial', 'Revenue'], ARRAY['revenue', 'recognition', 'accounting'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-FN-011', 'Bank reconciliation', 'Daily bank account reconciliation', ARRAY['Financial', 'Treasury'], ARRAY['bank', 'reconciliation', 'cash'], ARRAY['universal'], '{"control_type": "detective", "automation_level": "Fully-Automated"}'::jsonb),
('control', 'CTL-FN-012', 'Contract review process', 'Legal and financial contract review', ARRAY['Financial', 'Legal'], ARRAY['contract', 'review', 'legal'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Manual"}'::jsonb),

-- CONTROLS - COMPLIANCE (12)
('control', 'CTL-CM-001', 'Regulatory monitoring', 'Track regulatory changes', ARRAY['Compliance', 'Regulatory'], ARRAY['regulatory', 'monitoring', 'changes'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-CM-002', 'Policy management', 'Maintain and distribute policies', ARRAY['Compliance', 'Policy'], ARRAY['policy', 'management', 'governance'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-CM-003', 'Compliance training', 'Mandatory compliance education', ARRAY['Compliance', 'Training'], ARRAY['training', 'compliance', 'education'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-CM-004', 'Privacy impact assessments', 'Assess privacy risks', ARRAY['Compliance', 'Privacy'], ARRAY['privacy', 'PIA', 'GDPR'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Manual"}'::jsonb),
('control', 'CTL-CM-005', 'AML/KYC procedures', 'Customer due diligence', ARRAY['Compliance', 'Financial Crime'], ARRAY['AML', 'KYC', 'due diligence'], ARRAY['financial_services', 'banking'], '{"control_type": "preventive", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-CM-006', 'Whistleblower hotline', 'Anonymous reporting channel', ARRAY['Compliance', 'Ethics'], ARRAY['whistleblower', 'hotline', 'ethics'], ARRAY['universal'], '{"control_type": "detective", "automation_level": "Manual"}'::jsonb),
('control', 'CTL-CM-007', 'Conflict of interest disclosure', 'Declare and manage conflicts', ARRAY['Compliance', 'Ethics'], ARRAY['conflict', 'interest', 'disclosure'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-CM-008', 'Data retention management', 'Comply with retention requirements', ARRAY['Compliance', 'Data'], ARRAY['retention', 'data', 'records'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Fully-Automated"}'::jsonb),
('control', 'CTL-CM-009', 'License and permit tracking', 'Maintain valid licenses', ARRAY['Compliance', 'Legal'], ARRAY['license', 'permit', 'tracking'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-CM-010', 'Sanctions screening', 'Screen against sanctions lists', ARRAY['Compliance', 'Financial Crime'], ARRAY['sanctions', 'screening', 'OFAC'], ARRAY['financial_services', 'universal'], '{"control_type": "preventive", "automation_level": "Fully-Automated"}'::jsonb),
('control', 'CTL-CM-011', 'Environmental compliance monitoring', 'Track environmental obligations', ARRAY['Compliance', 'Environmental'], ARRAY['environmental', 'compliance', 'emissions'], ARRAY['manufacturing', 'energy_utilities', 'universal'], '{"control_type": "detective", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-CM-012', 'Health and safety inspections', 'Regular workplace safety checks', ARRAY['Compliance', 'Safety'], ARRAY['health', 'safety', 'inspection'], ARRAY['manufacturing', 'construction', 'universal'], '{"control_type": "detective", "automation_level": "Manual"}'::jsonb),

-- CONTROLS - VENDOR/THIRD PARTY (8)
('control', 'CTL-TP-001', 'Vendor due diligence', 'Assess vendors before engagement', ARRAY['Third Party', 'Vendor'], ARRAY['vendor', 'due diligence', 'assessment'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-TP-002', 'Contract management', 'Manage vendor contracts', ARRAY['Third Party', 'Contract'], ARRAY['contract', 'vendor', 'management'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-TP-003', 'Vendor performance monitoring', 'Track SLA compliance', ARRAY['Third Party', 'Performance'], ARRAY['vendor', 'performance', 'SLA'], ARRAY['universal'], '{"control_type": "detective", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-TP-004', 'Vendor security assessments', 'Evaluate vendor security', ARRAY['Third Party', 'Security'], ARRAY['vendor', 'security', 'assessment'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Manual"}'::jsonb),
('control', 'CTL-TP-005', 'Fourth-party risk monitoring', 'Track subcontractor risks', ARRAY['Third Party', 'Subcontractor'], ARRAY['fourth party', 'subcontractor', 'risk'], ARRAY['universal'], '{"control_type": "detective", "automation_level": "Manual"}'::jsonb),
('control', 'CTL-TP-006', 'Vendor exit planning', 'Plan for vendor transitions', ARRAY['Third Party', 'Exit'], ARRAY['vendor', 'exit', 'transition'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Manual"}'::jsonb),
('control', 'CTL-TP-007', 'Outsourcing governance', 'Oversight of outsourced functions', ARRAY['Third Party', 'Governance'], ARRAY['outsourcing', 'governance', 'oversight'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-TP-008', 'Vendor financial monitoring', 'Track vendor financial health', ARRAY['Third Party', 'Financial'], ARRAY['vendor', 'financial', 'viability'], ARRAY['universal'], '{"control_type": "detective", "automation_level": "Semi-Automated"}'::jsonb),

-- CONTROLS - GOVERNANCE (10)
('control', 'CTL-GV-001', 'Board oversight', 'Board review of risk matters', ARRAY['Governance', 'Board'], ARRAY['board', 'oversight', 'governance'], ARRAY['universal'], '{"control_type": "directive", "automation_level": "Manual"}'::jsonb),
('control', 'CTL-GV-002', 'Risk committee', 'Dedicated risk oversight committee', ARRAY['Governance', 'Risk'], ARRAY['committee', 'risk', 'oversight'], ARRAY['universal'], '{"control_type": "directive", "automation_level": "Manual"}'::jsonb),
('control', 'CTL-GV-003', 'Internal audit function', 'Independent assurance activities', ARRAY['Governance', 'Audit'], ARRAY['internal audit', 'assurance', 'testing'], ARRAY['universal'], '{"control_type": "detective", "automation_level": "Manual"}'::jsonb),
('control', 'CTL-GV-004', 'Risk appetite framework', 'Defined risk tolerance levels', ARRAY['Governance', 'Risk'], ARRAY['appetite', 'tolerance', 'framework'], ARRAY['universal'], '{"control_type": "directive", "automation_level": "Manual"}'::jsonb),
('control', 'CTL-GV-005', 'Ethics program', 'Code of conduct and ethics', ARRAY['Governance', 'Ethics'], ARRAY['ethics', 'conduct', 'values'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Manual"}'::jsonb),
('control', 'CTL-GV-006', 'Management reporting', 'Regular risk reporting to leadership', ARRAY['Governance', 'Reporting'], ARRAY['reporting', 'management', 'dashboard'], ARRAY['universal'], '{"control_type": "detective", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-GV-007', 'Escalation procedures', 'Defined escalation paths', ARRAY['Governance', 'Escalation'], ARRAY['escalation', 'procedure', 'threshold'], ARRAY['universal'], '{"control_type": "corrective", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-GV-008', 'Delegation of authority', 'Clear approval matrices', ARRAY['Governance', 'Authority'], ARRAY['delegation', 'authority', 'approval'], ARRAY['universal'], '{"control_type": "preventive", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-GV-009', 'Issue and action tracking', 'Track remediation items', ARRAY['Governance', 'Remediation'], ARRAY['issue', 'action', 'tracking'], ARRAY['universal'], '{"control_type": "corrective", "automation_level": "Semi-Automated"}'::jsonb),
('control', 'CTL-GV-010', 'Attestation process', 'Management self-assessments', ARRAY['Governance', 'Attestation'], ARRAY['attestation', 'certification', 'assessment'], ARRAY['universal'], '{"control_type": "detective", "automation_level": "Semi-Automated"}'::jsonb)

ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category_hints = EXCLUDED.category_hints,
  keyword_hints = EXCLUDED.keyword_hints,
  industry_tags = EXCLUDED.industry_tags,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- KRIs (30)
INSERT INTO seed_master_library (library_type, code, name, description, category_hints, keyword_hints, industry_tags, metadata, related_codes) VALUES
('kri', 'KRI-001', 'System availability', 'Percentage uptime of critical systems', ARRAY['Technology', 'Operational'], ARRAY['uptime', 'availability', 'system'], ARRAY['universal'], '{"measurement_unit": "%", "frequency": "Daily", "threshold_direction": "below", "warning_threshold": 99.5, "critical_threshold": 99}'::jsonb, ARRAY['RC-CY-006']),
('kri', 'KRI-002', 'Security incidents', 'Number of security events', ARRAY['Cyber', 'Technology'], ARRAY['security', 'incident', 'breach'], ARRAY['universal'], '{"measurement_unit": "count", "frequency": "Weekly", "threshold_direction": "above", "warning_threshold": 5, "critical_threshold": 10}'::jsonb, ARRAY['RC-CY-001']),
('kri', 'KRI-003', 'Employee turnover rate', 'Voluntary departure rate', ARRAY['People', 'HR'], ARRAY['turnover', 'attrition', 'retention'], ARRAY['universal'], '{"measurement_unit": "%", "frequency": "Monthly", "threshold_direction": "above", "warning_threshold": 15, "critical_threshold": 25}'::jsonb, ARRAY['RC-PE-002']),
('kri', 'KRI-004', 'Vendor SLA breaches', 'Number of missed SLAs', ARRAY['Third Party', 'Vendor'], ARRAY['vendor', 'SLA', 'performance'], ARRAY['universal'], '{"measurement_unit": "count", "frequency": "Monthly", "threshold_direction": "above", "warning_threshold": 3, "critical_threshold": 5}'::jsonb, ARRAY['RC-TP-006']),
('kri', 'KRI-005', 'Regulatory findings', 'Open regulatory findings', ARRAY['Compliance', 'Regulatory'], ARRAY['regulatory', 'finding', 'audit'], ARRAY['universal'], '{"measurement_unit": "count", "frequency": "Quarterly", "threshold_direction": "above", "warning_threshold": 5, "critical_threshold": 10}'::jsonb, ARRAY['RC-CL-002']),
('kri', 'KRI-006', 'Customer complaints', 'Volume of customer complaints', ARRAY['Customer', 'Operational'], ARRAY['complaint', 'customer', 'satisfaction'], ARRAY['universal'], '{"measurement_unit": "count", "frequency": "Weekly", "threshold_direction": "above", "warning_threshold": 50, "critical_threshold": 100}'::jsonb, ARRAY['RC-OP-003']),
('kri', 'KRI-007', 'Patch compliance rate', 'Systems with current patches', ARRAY['Cyber', 'Technology'], ARRAY['patch', 'vulnerability', 'compliance'], ARRAY['universal'], '{"measurement_unit": "%", "frequency": "Weekly", "threshold_direction": "below", "warning_threshold": 95, "critical_threshold": 90}'::jsonb, ARRAY['RC-CY-002']),
('kri', 'KRI-008', 'Fraud incidents', 'Detected fraud attempts', ARRAY['Financial', 'Fraud'], ARRAY['fraud', 'incident', 'loss'], ARRAY['universal'], '{"measurement_unit": "count", "frequency": "Monthly", "threshold_direction": "above", "warning_threshold": 3, "critical_threshold": 5}'::jsonb, ARRAY['RC-FN-008']),
('kri', 'KRI-009', 'Project overruns', 'Projects exceeding budget or time', ARRAY['Operational', 'Project'], ARRAY['project', 'overrun', 'delay'], ARRAY['universal'], '{"measurement_unit": "%", "frequency": "Monthly", "threshold_direction": "above", "warning_threshold": 20, "critical_threshold": 30}'::jsonb, ARRAY['RC-OP-015']),
('kri', 'KRI-010', 'Liquidity ratio', 'Current liquidity coverage', ARRAY['Financial', 'Liquidity'], ARRAY['liquidity', 'cash', 'ratio'], ARRAY['universal'], '{"measurement_unit": "ratio", "frequency": "Daily", "threshold_direction": "below", "warning_threshold": 1.5, "critical_threshold": 1.2}'::jsonb, ARRAY['RC-FN-001']),
('kri', 'KRI-011', 'Open audit findings', 'Unresolved internal audit issues', ARRAY['Governance', 'Audit'], ARRAY['audit', 'finding', 'remediation'], ARRAY['universal'], '{"measurement_unit": "count", "frequency": "Monthly", "threshold_direction": "above", "warning_threshold": 10, "critical_threshold": 20}'::jsonb, ARRAY['RC-GV-002']),
('kri', 'KRI-012', 'Training completion rate', 'Staff completing mandatory training', ARRAY['Compliance', 'People'], ARRAY['training', 'completion', 'compliance'], ARRAY['universal'], '{"measurement_unit": "%", "frequency": "Monthly", "threshold_direction": "below", "warning_threshold": 90, "critical_threshold": 80}'::jsonb, ARRAY['RC-PE-003']),
('kri', 'KRI-013', 'Mean time to detect', 'Time to detect incidents', ARRAY['Cyber', 'Operational'], ARRAY['MTTD', 'detection', 'incident'], ARRAY['universal'], '{"measurement_unit": "hours", "frequency": "Monthly", "threshold_direction": "above", "warning_threshold": 24, "critical_threshold": 48}'::jsonb, ARRAY['RC-CY-008']),
('kri', 'KRI-014', 'Mean time to recover', 'Time to restore operations', ARRAY['Operational', 'Continuity'], ARRAY['MTTR', 'recovery', 'restoration'], ARRAY['universal'], '{"measurement_unit": "hours", "frequency": "Monthly", "threshold_direction": "above", "warning_threshold": 4, "critical_threshold": 8}'::jsonb, ARRAY['RC-OP-009']),
('kri', 'KRI-015', 'Data quality score', 'Accuracy of critical data', ARRAY['Data', 'Technology'], ARRAY['data quality', 'accuracy', 'completeness'], ARRAY['universal'], '{"measurement_unit": "%", "frequency": "Monthly", "threshold_direction": "below", "warning_threshold": 95, "critical_threshold": 90}'::jsonb, ARRAY['RC-CY-009']),
('kri', 'KRI-016', 'Credit concentration', 'Exposure to top counterparties', ARRAY['Financial', 'Credit'], ARRAY['credit', 'concentration', 'exposure'], ARRAY['financial_services', 'universal'], '{"measurement_unit": "%", "frequency": "Weekly", "threshold_direction": "above", "warning_threshold": 25, "critical_threshold": 35}'::jsonb, ARRAY['RC-FN-002']),
('kri', 'KRI-017', 'ESG score', 'Environmental social governance rating', ARRAY['Environmental', 'ESG'], ARRAY['ESG', 'sustainability', 'rating'], ARRAY['universal'], '{"measurement_unit": "score", "frequency": "Quarterly", "threshold_direction": "below", "warning_threshold": 70, "critical_threshold": 60}'::jsonb, ARRAY['RC-EN-004']),
('kri', 'KRI-018', 'Phishing test failure rate', 'Staff clicking on test phishing', ARRAY['Cyber', 'People'], ARRAY['phishing', 'test', 'awareness'], ARRAY['universal'], '{"measurement_unit": "%", "frequency": "Monthly", "threshold_direction": "above", "warning_threshold": 10, "critical_threshold": 20}'::jsonb, ARRAY['RC-CY-020']),
('kri', 'KRI-019', 'Key person dependency', 'Critical roles without backup', ARRAY['People', 'Operational'], ARRAY['key person', 'succession', 'dependency'], ARRAY['universal'], '{"measurement_unit": "count", "frequency": "Quarterly", "threshold_direction": "above", "warning_threshold": 3, "critical_threshold": 5}'::jsonb, ARRAY['RC-PE-008']),
('kri', 'KRI-020', 'Change failure rate', 'Failed production changes', ARRAY['Technology', 'Operational'], ARRAY['change', 'failure', 'deployment'], ARRAY['universal'], '{"measurement_unit": "%", "frequency": "Monthly", "threshold_direction": "above", "warning_threshold": 10, "critical_threshold": 20}'::jsonb, ARRAY['RC-CY-012']),

-- KCIs (20)
('kci', 'KCI-001', 'Control testing pass rate', 'Controls passing effectiveness tests', ARRAY['Governance', 'Controls'], ARRAY['control', 'testing', 'effectiveness'], ARRAY['universal'], '{"measurement_unit": "%", "frequency": "Quarterly", "threshold_direction": "below", "warning_threshold": 90, "critical_threshold": 80}'::jsonb, ARRAY['CTL-GV-003']),
('kci', 'KCI-002', 'Access review completion', 'Access reviews completed on time', ARRAY['Cyber', 'Access'], ARRAY['access', 'review', 'completion'], ARRAY['universal'], '{"measurement_unit": "%", "frequency": "Quarterly", "threshold_direction": "below", "warning_threshold": 95, "critical_threshold": 90}'::jsonb, ARRAY['CTL-CY-002']),
('kci', 'KCI-003', 'BCP test success rate', 'Successful DR/BCP tests', ARRAY['Operational', 'Continuity'], ARRAY['BCP', 'DR', 'test'], ARRAY['universal'], '{"measurement_unit": "%", "frequency": "Annually", "threshold_direction": "below", "warning_threshold": 90, "critical_threshold": 80}'::jsonb, ARRAY['CTL-OP-014']),
('kci', 'KCI-004', 'Policy acknowledgment rate', 'Staff acknowledging policies', ARRAY['Compliance', 'Policy'], ARRAY['policy', 'acknowledgment', 'attestation'], ARRAY['universal'], '{"measurement_unit": "%", "frequency": "Quarterly", "threshold_direction": "below", "warning_threshold": 95, "critical_threshold": 90}'::jsonb, ARRAY['CTL-CM-002']),
('kci', 'KCI-005', 'Overdue issue resolution', 'Issues resolved within SLA', ARRAY['Governance', 'Remediation'], ARRAY['issue', 'resolution', 'SLA'], ARRAY['universal'], '{"measurement_unit": "%", "frequency": "Monthly", "threshold_direction": "below", "warning_threshold": 85, "critical_threshold": 70}'::jsonb, ARRAY['CTL-GV-009']),
('kci', 'KCI-006', 'Reconciliation completion', 'Reconciliations done on time', ARRAY['Financial', 'Accounting'], ARRAY['reconciliation', 'completion', 'timeliness'], ARRAY['universal'], '{"measurement_unit": "%", "frequency": "Monthly", "threshold_direction": "below", "warning_threshold": 100, "critical_threshold": 95}'::jsonb, ARRAY['CTL-FN-002']),
('kci', 'KCI-007', 'Vendor assessment currency', 'Vendors with current assessments', ARRAY['Third Party', 'Vendor'], ARRAY['vendor', 'assessment', 'current'], ARRAY['universal'], '{"measurement_unit": "%", "frequency": "Quarterly", "threshold_direction": "below", "warning_threshold": 90, "critical_threshold": 80}'::jsonb, ARRAY['CTL-TP-001']),
('kci', 'KCI-008', 'SoD conflict rate', 'Users with SoD violations', ARRAY['Governance', 'Access'], ARRAY['SoD', 'segregation', 'conflict'], ARRAY['universal'], '{"measurement_unit": "%", "frequency": "Monthly", "threshold_direction": "above", "warning_threshold": 2, "critical_threshold": 5}'::jsonb, ARRAY['CTL-OP-001']),
('kci', 'KCI-009', 'Backup success rate', 'Successful backup completions', ARRAY['Technology', 'Operational'], ARRAY['backup', 'success', 'completion'], ARRAY['universal'], '{"measurement_unit": "%", "frequency": "Daily", "threshold_direction": "below", "warning_threshold": 99, "critical_threshold": 95}'::jsonb, ARRAY['CTL-OP-003']),
('kci', 'KCI-010', 'Encryption coverage', 'Data encrypted at rest and transit', ARRAY['Cyber', 'Data'], ARRAY['encryption', 'data', 'coverage'], ARRAY['universal'], '{"measurement_unit": "%", "frequency": "Monthly", "threshold_direction": "below", "warning_threshold": 100, "critical_threshold": 95}'::jsonb, ARRAY['CTL-CY-009'])

ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category_hints = EXCLUDED.category_hints,
  keyword_hints = EXCLUDED.keyword_hints,
  industry_tags = EXCLUDED.industry_tags,
  metadata = EXCLUDED.metadata,
  related_codes = EXCLUDED.related_codes,
  updated_at = NOW();

-- Final verification
DO $$
DECLARE 
  v_controls INTEGER;
  v_kris INTEGER;
  v_kcis INTEGER;
  v_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_controls FROM seed_master_library WHERE library_type = 'control';
  SELECT COUNT(*) INTO v_kris FROM seed_master_library WHERE library_type = 'kri';
  SELECT COUNT(*) INTO v_kcis FROM seed_master_library WHERE library_type = 'kci';
  SELECT COUNT(*) INTO v_total FROM seed_master_library;
  
  RAISE NOTICE '✓ Controls seeded: % records', v_controls;
  RAISE NOTICE '✓ KRIs seeded: % records', v_kris;
  RAISE NOTICE '✓ KCIs seeded: % records', v_kcis;
  RAISE NOTICE '✓ TOTAL MASTER LIBRARY: % records', v_total;
END $$;
