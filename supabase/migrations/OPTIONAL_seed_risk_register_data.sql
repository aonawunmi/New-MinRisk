-- Migration: Seed Data for Risk Register Redesign
-- Description: Populate initial data for root causes, impacts, controls, and KRIs/KCIs
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26

-- NOTE: This seed data is organization-agnostic.
-- You'll need to replace 'YOUR_ORG_ID' with actual organization IDs in production
-- For testing, we'll use a placeholder that should be replaced

-- SEED ROOT CAUSE REGISTER
-- These are common organizational root causes

INSERT INTO root_cause_register (cause_code, cause_name, cause_description, category, subcategory, status, organization_id, approved_at) VALUES
('RC-001', 'Poor capacity planning', 'Inadequate planning for system capacity and resource allocation', 'Operational Risk', 'Operational Capacity', 'active', 'YOUR_ORG_ID', NOW()),
('RC-002', 'Inadequate access controls', 'Insufficient or improperly configured access control mechanisms', 'Technology & Cyber Risk', 'Identity & Access Management', 'active', 'YOUR_ORG_ID', NOW()),
('RC-003', 'Insufficient training', 'Lack of adequate training for staff on processes, systems, or compliance requirements', 'Human Capital Risk', 'Training & Development', 'active', 'YOUR_ORG_ID', NOW()),
('RC-004', 'Legacy system limitations', 'Technical debt and limitations in legacy systems', 'Technology & Cyber Risk', 'Technology Obsolescence', 'active', 'YOUR_ORG_ID', NOW()),
('RC-005', 'Third-party dependencies', 'Over-reliance on external vendors or service providers', 'Supply Chain & Logistics Risk', 'Supplier Reliability', 'active', 'YOUR_ORG_ID', NOW()),
('RC-006', 'Weak governance oversight', 'Inadequate board or management oversight of key processes', 'Governance & Reputational Risk', 'Board Effectiveness', 'active', 'YOUR_ORG_ID', NOW()),
('RC-007', 'Inadequate security patching', 'Delayed or inconsistent application of security patches', 'Technology & Cyber Risk', 'Cybersecurity Threats', 'active', 'YOUR_ORG_ID', NOW()),
('RC-008', 'Process complexity', 'Overly complex processes leading to errors and inefficiencies', 'Operational Risk', 'Process Inefficiency', 'active', 'YOUR_ORG_ID', NOW()),
('RC-009', 'Inadequate data quality controls', 'Poor data validation, cleansing, and quality assurance processes', 'Technology & Cyber Risk', 'IT Service Management', 'active', 'YOUR_ORG_ID', NOW()),
('RC-010', 'Insufficient budget allocation', 'Inadequate funding for critical infrastructure, resources, or initiatives', 'Financial Risk', 'Budgeting & Forecasting', 'active', 'YOUR_ORG_ID', NOW()),
('RC-011', 'Lack of business continuity planning', 'Absence or inadequacy of disaster recovery and business continuity plans', 'Operational Risk', 'Business Continuity', 'active', 'YOUR_ORG_ID', NOW()),
('RC-012', 'Regulatory changes', 'Evolving regulatory landscape requiring rapid adaptation', 'Compliance & Legal Risk', 'Regulatory Compliance', 'active', 'YOUR_ORG_ID', NOW())
ON CONFLICT (organization_id, cause_code) DO NOTHING;

-- SEED IMPACT REGISTER
-- These are common organizational impacts

INSERT INTO impact_register (impact_code, impact_name, impact_description, impact_type, category, subcategory, status, organization_id, approved_at) VALUES
('IMP-001', 'Customer dissatisfaction', 'Negative customer experience leading to complaints and churn', 'reputational', 'Governance & Reputational Risk', 'Customer Complaints', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-002', 'Financial loss', 'Direct monetary losses from events or incidents', 'financial', 'Financial Risk', 'Revenue Recognition', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-003', 'Regulatory penalties', 'Fines, sanctions, or enforcement actions from regulators', 'regulatory', 'Compliance & Legal Risk', 'Regulatory Compliance', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-004', 'Reputational damage', 'Harm to brand reputation and stakeholder trust', 'reputational', 'Governance & Reputational Risk', 'Brand Reputation', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-005', 'Service disruption', 'Interruption to business operations or service delivery', 'operational', 'Operational Risk', 'Service Delivery Failures', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-006', 'Data breach', 'Unauthorized access, disclosure, or loss of sensitive data', 'regulatory', 'Technology & Cyber Risk', 'Data Breaches', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-007', 'Employee safety incidents', 'Harm or injury to employees', 'safety', 'Physical & Safety Risk', 'Workplace Accidents', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-008', 'Market share loss', 'Erosion of competitive position and market share', 'strategic', 'Strategic Risk', 'Market Competition', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-009', 'Litigation', 'Legal disputes and associated costs', 'regulatory', 'Compliance & Legal Risk', 'Legal Disputes & Litigation', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-010', 'Environmental damage', 'Harm to the environment from operations or incidents', 'environmental', 'ESG & Sustainability Risk', 'Environmental Pollution', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-011', 'Operational inefficiency', 'Reduced productivity and increased costs', 'operational', 'Operational Risk', 'Process Inefficiency', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-012', 'Stakeholder confidence loss', 'Erosion of investor, board, or stakeholder trust', 'reputational', 'Governance & Reputational Risk', 'Shareholder Relations', 'active', 'YOUR_ORG_ID', NOW())
ON CONFLICT (organization_id, impact_code) DO NOTHING;

-- SEED CONTROL LIBRARY
-- These are common organizational controls with DIME scores

INSERT INTO control_library (
  control_code, control_name, control_description, control_type, control_effect,
  design_score, implementation_score, monitoring_score, evaluation_score,
  status, organization_id, approved_at
) VALUES
-- Preventive Controls (Likelihood-Reducing)
('CTL-001', 'Capacity monitoring and alerting', 'Real-time monitoring of system capacity with automated alerts', 'preventive', 'likelihood_reducing', 80, 70, 85, 65, 'active', 'YOUR_ORG_ID', NOW()),
('CTL-002', 'Auto-scaling infrastructure', 'Automated scaling of infrastructure based on demand', 'preventive', 'likelihood_reducing', 85, 75, 80, 70, 'active', 'YOUR_ORG_ID', NOW()),
('CTL-003', 'Multi-factor authentication', 'Require multiple factors for user authentication', 'preventive', 'likelihood_reducing', 90, 85, 80, 75, 'active', 'YOUR_ORG_ID', NOW()),
('CTL-004', 'Regular security patching', 'Scheduled application of security patches to all systems', 'preventive', 'likelihood_reducing', 85, 70, 75, 80, 'active', 'YOUR_ORG_ID', NOW()),
('CTL-005', 'Employee training program', 'Comprehensive training on processes, compliance, and security', 'preventive', 'likelihood_reducing', 75, 65, 60, 70, 'active', 'YOUR_ORG_ID', NOW()),
('CTL-006', 'Vendor due diligence', 'Thorough assessment of third-party vendors before onboarding', 'preventive', 'likelihood_reducing', 80, 75, 70, 65, 'active', 'YOUR_ORG_ID', NOW()),
('CTL-007', 'Access control policy', 'Defined policies for granting and revoking system access', 'preventive', 'likelihood_reducing', 85, 80, 75, 70, 'active', 'YOUR_ORG_ID', NOW()),
('CTL-008', 'Data quality validation', 'Automated checks for data accuracy and completeness', 'preventive', 'likelihood_reducing', 80, 70, 75, 65, 'active', 'YOUR_ORG_ID', NOW()),

-- Detective Controls (Can be Likelihood or Impact Reducing)
('CTL-009', 'Intrusion detection system', 'Real-time monitoring for security threats and anomalies', 'detective', 'likelihood_reducing', 85, 80, 90, 75, 'active', 'YOUR_ORG_ID', NOW()),
('CTL-010', 'Transaction monitoring', 'Automated monitoring of transactions for anomalies', 'detective', 'likelihood_reducing', 80, 75, 85, 70, 'active', 'YOUR_ORG_ID', NOW()),
('CTL-011', 'Compliance audits', 'Regular internal and external compliance audits', 'detective', 'likelihood_reducing', 75, 70, 80, 85, 'active', 'YOUR_ORG_ID', NOW()),

-- Corrective Controls (Impact-Reducing)
('CTL-012', 'Incident response plan', 'Documented procedures for responding to incidents', 'corrective', 'impact_reducing', 80, 70, 75, 80, 'active', 'YOUR_ORG_ID', NOW()),
('CTL-013', 'Customer communication protocol', 'Standardized approach for communicating with affected customers', 'corrective', 'impact_reducing', 75, 70, 65, 60, 'active', 'YOUR_ORG_ID', NOW()),
('CTL-014', 'Disaster recovery plan', 'Comprehensive plan for recovering from major disruptions', 'corrective', 'impact_reducing', 85, 75, 70, 80, 'active', 'YOUR_ORG_ID', NOW()),
('CTL-015', 'Crisis management team', 'Designated team for managing crisis situations', 'corrective', 'impact_reducing', 80, 75, 70, 65, 'active', 'YOUR_ORG_ID', NOW()),
('CTL-016', 'Data backup and recovery', 'Regular backups with tested recovery procedures', 'corrective', 'impact_reducing', 85, 80, 85, 75, 'active', 'YOUR_ORG_ID', NOW())
ON CONFLICT (organization_id, control_code) DO NOTHING;

-- SEED KRI/KCI LIBRARY
-- Key Risk Indicators (KRIs) for monitoring root causes
-- Key Control Indicators (KCIs) for monitoring impacts

INSERT INTO kri_kci_library (
  indicator_code, indicator_type, indicator_name, indicator_description,
  measurement_unit, measurement_frequency, threshold_warning, threshold_critical,
  data_source, calculation_method, status, organization_id
) VALUES
-- KRIs (Root Cause Indicators)
('KRI-001', 'KRI', 'Server CPU utilization %', 'Average CPU utilization across all servers', '%', 'real-time', 75, 90, 'Infrastructure Monitoring System', 'Average of all server CPU usage', 'active', 'YOUR_ORG_ID'),
('KRI-002', 'KRI', 'Failed login attempts per day', 'Number of failed authentication attempts', 'count', 'daily', 50, 100, 'Authentication Logs', 'Count of failed login events', 'active', 'YOUR_ORG_ID'),
('KRI-003', 'KRI', 'Training completion rate %', 'Percentage of required training completed by employees', '%', 'monthly', 80, 70, 'LMS (Learning Management System)', '(Completed trainings / Required trainings) * 100', 'active', 'YOUR_ORG_ID'),
('KRI-004', 'KRI', 'Open security patches', 'Number of security patches pending application', 'count', 'weekly', 5, 10, 'Patch Management System', 'Count of unapplied critical patches', 'active', 'YOUR_ORG_ID'),
('KRI-005', 'KRI', 'Vendor SLA breaches', 'Number of vendor SLA breaches per month', 'count', 'monthly', 2, 5, 'Vendor Management System', 'Count of SLA breaches', 'active', 'YOUR_ORG_ID'),
('KRI-006', 'KRI', 'Process error rate %', 'Percentage of process executions with errors', '%', 'daily', 2, 5, 'Process Monitoring System', '(Failed processes / Total processes) * 100', 'active', 'YOUR_ORG_ID'),
('KRI-007', 'KRI', 'Data quality score', 'Overall data quality score based on validation rules', '%', 'weekly', 85, 75, 'Data Quality Tool', 'Weighted average of data quality checks', 'active', 'YOUR_ORG_ID'),
('KRI-008', 'KRI', 'Budget variance %', 'Percentage variance from approved budget', '%', 'monthly', 10, 20, 'Financial System', '((Actual - Budget) / Budget) * 100', 'active', 'YOUR_ORG_ID'),
('KRI-009', 'KRI', 'Unaddressed audit findings', 'Number of open audit findings past due date', 'count', 'monthly', 3, 7, 'Audit Management System', 'Count of overdue findings', 'active', 'YOUR_ORG_ID'),
('KRI-010', 'KRI', 'Regulatory changes pending review', 'Number of regulatory changes requiring assessment', 'count', 'monthly', 2, 5, 'Regulatory Watch Service', 'Count of unreviewed changes', 'active', 'YOUR_ORG_ID'),

-- KCIs (Impact Indicators)
('KCI-001', 'KCI', 'Customer complaints per 10k users', 'Number of customer complaints normalized by user base', 'count', 'monthly', 50, 100, 'CRM System', '(Total complaints / Total users) * 10000', 'active', 'YOUR_ORG_ID'),
('KCI-002', 'KCI', 'Revenue loss from incidents $', 'Monetary losses directly attributed to incidents', '$', 'monthly', 50000, 100000, 'Finance System', 'Sum of incident-related revenue losses', 'active', 'YOUR_ORG_ID'),
('KCI-003', 'KCI', 'Regulatory breach count', 'Number of regulatory breaches or violations', 'count', 'quarterly', 1, 3, 'Compliance System', 'Count of confirmed violations', 'active', 'YOUR_ORG_ID'),
('KCI-004', 'KCI', 'Net Promoter Score', 'Customer satisfaction and loyalty metric', 'score', 'quarterly', 30, 20, 'Customer Survey', 'NPS calculation from survey results', 'active', 'YOUR_ORG_ID'),
('KCI-005', 'KCI', 'System uptime %', 'Percentage of time systems are available', '%', 'daily', 99, 97, 'Uptime Monitoring', '(Uptime hours / Total hours) * 100', 'active', 'YOUR_ORG_ID'),
('KCI-006', 'KCI', 'Data breach incidents', 'Number of confirmed data breaches', 'count', 'quarterly', 1, 2, 'Security Incident System', 'Count of confirmed breach events', 'active', 'YOUR_ORG_ID'),
('KCI-007', 'KCI', 'Workplace injury rate', 'Number of workplace injuries per 100 employees', 'count', 'monthly', 1, 3, 'Safety Management System', '(Injuries / Employees) * 100', 'active', 'YOUR_ORG_ID'),
('KCI-008', 'KCI', 'Market share %', 'Company market share in primary market', '%', 'quarterly', 15, 10, 'Market Research', 'Company revenue / Total market revenue', 'active', 'YOUR_ORG_ID'),
('KCI-009', 'KCI', 'Legal costs from disputes $', 'Total legal costs from ongoing disputes', '$', 'quarterly', 500000, 1000000, 'Legal System', 'Sum of legal fees and settlements', 'active', 'YOUR_ORG_ID'),
('KCI-010', 'KCI', 'Carbon emissions tons', 'Total carbon emissions from operations', 'tons', 'quarterly', 5000, 7000, 'Environmental Monitoring', 'Sum of measured emissions', 'active', 'YOUR_ORG_ID')
ON CONFLICT (organization_id, indicator_code) DO NOTHING;

-- Comments
COMMENT ON TABLE root_cause_register IS 'Seeded with 12 common root causes across multiple risk categories';
COMMENT ON TABLE impact_register IS 'Seeded with 12 common impacts across financial, operational, regulatory, reputational, safety, environmental, and strategic types';
COMMENT ON TABLE control_library IS 'Seeded with 16 common controls (8 preventive, 3 detective, 5 corrective) with realistic DIME scores';
COMMENT ON TABLE kri_kci_library IS 'Seeded with 10 KRIs (for root causes) and 10 KCIs (for impacts) with thresholds and measurement details';
