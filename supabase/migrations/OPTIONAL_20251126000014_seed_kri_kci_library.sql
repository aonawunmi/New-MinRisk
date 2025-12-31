-- Migration: Seed KRI/KCI Library
-- Description: Complete KRI/KCI library from user-provided markdown files
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26

-- NOTE: Replace 'YOUR_ORG_ID' with actual organization ID before deployment
-- Threshold values are examples - should be customized per organization

-- ============================================================================
-- KRIs (Leading Indicators - Likelihood) - 21 indicators
-- ============================================================================

INSERT INTO kri_kci_library (
  indicator_code, indicator_type, indicator_name, indicator_description,
  measurement_unit, measurement_frequency, threshold_warning, threshold_critical,
  indicator_category, indicator_subtype, status, organization_id
) VALUES
-- Infrastructure KRIs
('KRI-001', 'KRI', 'CPU > 80%', 'CPU utilization exceeds 80% threshold', '%', 'real-time', 80, 90, 'Infrastructure', 'Threshold', 'active', 'YOUR_ORG_ID'),
('KRI-002', 'KRI', 'Memory saturation > 75%', 'Memory usage exceeds 75% threshold', '%', 'real-time', 75, 85, 'Infrastructure', 'Threshold', 'active', 'YOUR_ORG_ID'),
('KRI-003', 'KRI', 'Disk I/O latency spikes', 'Disk input/output latency exceeds baseline', 'ms', 'real-time', 100, 200, 'Infrastructure', 'Threshold', 'active', 'YOUR_ORG_ID'),
('KRI-004', 'KRI', 'Network packet loss > 2%', 'Network packet loss exceeds 2%', '%', 'real-time', 2, 5, 'Infrastructure', 'Threshold', 'active', 'YOUR_ORG_ID'),

-- Operational KRIs
('KRI-005', 'KRI', 'API failure rates > baseline', 'API failure rate exceeds normal baseline', '%', 'daily', 5, 10, 'Operational', 'Trend', 'active', 'YOUR_ORG_ID'),
('KRI-006', 'KRI', 'Interface timeout frequency', 'Frequency of interface timeout errors', 'count', 'daily', 10, 25, 'Operational', 'Threshold', 'active', 'YOUR_ORG_ID'),
('KRI-007', 'KRI', 'Queue backlog growth rate', 'Rate of queue backlog accumulation', 'items/hr', 'real-time', 1000, 5000, 'Operational', 'Capacity', 'active', 'YOUR_ORG_ID'),
('KRI-008', 'KRI', 'Microservice error propagation', 'Errors propagating across microservices', 'count', 'daily', 5, 15, 'Infrastructure', 'Stability', 'active', 'YOUR_ORG_ID'),

-- Cybersecurity KRIs
('KRI-009', 'KRI', 'Login failures / min', 'Failed login attempts per minute', 'count', 'real-time', 10, 25, 'Cybersecurity', 'Threshold', 'active', 'YOUR_ORG_ID'),
('KRI-010', 'KRI', 'Privileged login volume spike', 'Unusual increase in privileged account logins', 'count', 'daily', 50, 100, 'Cybersecurity', 'Anomaly', 'active', 'YOUR_ORG_ID'),
('KRI-011', 'KRI', 'Unauthorized access attempts', 'Detected unauthorized access attempts', 'count', 'daily', 5, 15, 'Cybersecurity', 'Count', 'active', 'YOUR_ORG_ID'),
('KRI-012', 'KRI', 'Endpoint malware detection', 'Malware detected on endpoints', 'count', 'daily', 1, 5, 'Cybersecurity', 'Security', 'active', 'YOUR_ORG_ID'),
('KRI-013', 'KRI', 'Unpatched vulnerabilities', 'Number of unpatched critical vulnerabilities', 'count', 'weekly', 5, 15, 'Cybersecurity', 'Count', 'active', 'YOUR_ORG_ID'),

-- Third-Party KRIs
('KRI-014', 'KRI', 'Vendor SLA breach count', 'Number of vendor SLA breaches', 'count', 'monthly', 2, 5, 'Third-Party', 'Contractual', 'active', 'YOUR_ORG_ID'),
('KRI-015', 'KRI', 'Dependency failure frequency', 'Frequency of third-party dependency failures', 'count', 'weekly', 3, 7, 'Third-Party', 'Reliability', 'active', 'YOUR_ORG_ID'),

-- Data Governance KRIs
('KRI-016', 'KRI', 'Data mismatch occurrences', 'Data validation failures or mismatches', 'count', 'daily', 10, 25, 'Data Governance', 'Validation', 'active', 'YOUR_ORG_ID'),

-- Governance KRIs
('KRI-017', 'KRI', 'Manual override frequency', 'Frequency of manual process overrides', 'count', 'weekly', 5, 15, 'Governance', 'Exception', 'active', 'YOUR_ORG_ID'),
('KRI-018', 'KRI', 'Internal SOP violations', 'Standard operating procedure violations', 'count', 'monthly', 3, 10, 'Governance', 'Culture', 'active', 'YOUR_ORG_ID'),

-- HR KRIs
('KRI-019', 'KRI', 'Staffing below minimum', 'Staffing levels below minimum threshold', 'count', 'weekly', 1, 3, 'HR', 'Capacity', 'active', 'YOUR_ORG_ID'),
('KRI-020', 'KRI', 'Overtime & burnout metrics', 'Employee overtime hours indicating burnout risk', 'hours', 'weekly', 10, 20, 'HR', 'Fatigue', 'active', 'YOUR_ORG_ID')
ON CONFLICT (organization_id, indicator_code) DO NOTHING;

-- ============================================================================
-- KCIs (Lagging Indicators - Impact) - 20 indicators
-- ============================================================================

INSERT INTO kri_kci_library (
  indicator_code, indicator_type, indicator_name, indicator_description,
  measurement_unit, measurement_frequency, threshold_warning, threshold_critical,
  indicator_category, indicator_subtype, status, organization_id
) VALUES
-- Operations KCIs
('KCI-001', 'KCI', 'Average downtime duration', 'Average duration of service outages', 'hours', 'monthly', 2, 5, 'Operations', 'Impact', 'active', 'YOUR_ORG_ID'),
('KCI-002', 'KCI', 'Service unavailability hours', 'Total hours of service unavailability', 'hours', 'monthly', 8, 24, 'Operations', 'Impact', 'active', 'YOUR_ORG_ID'),
('KCI-003', 'KCI', 'Incident resolution time', 'Average time to resolve incidents', 'hours', 'monthly', 24, 48, 'Operations', 'Efficiency', 'active', 'YOUR_ORG_ID'),
('KCI-004', 'KCI', 'MTTR (Mean Time to Repair)', 'Mean time to repair after failure', 'hours', 'monthly', 4, 12, 'Operations', 'Efficiency', 'active', 'YOUR_ORG_ID'),
('KCI-005', 'KCI', 'MTBF (Mean Time Between Failures)', 'Mean time between system failures', 'days', 'monthly', 30, 15, 'Operations', 'Reliability', 'active', 'YOUR_ORG_ID'),

-- Customer KCIs
('KCI-006', 'KCI', 'Customer complaint volume', 'Number of customer complaints', 'count', 'monthly', 50, 100, 'Customer', 'Impact', 'active', 'YOUR_ORG_ID'),
('KCI-007', 'KCI', 'Complaint escalation rate', 'Percentage of complaints escalated', '%', 'monthly', 10, 20, 'Customer', 'Impact', 'active', 'YOUR_ORG_ID'),
('KCI-008', 'KCI', 'Client churn rate', 'Customer churn rate', '%', 'quarterly', 5, 10, 'Business', 'Retention', 'active', 'YOUR_ORG_ID'),

-- Finance KCIs
('KCI-009', 'KCI', 'Refunds issued', 'Total value of refunds issued', '$', 'monthly', 10000, 50000, 'Finance', 'Loss', 'active', 'YOUR_ORG_ID'),
('KCI-010', 'KCI', 'Transaction loss amount', 'Monetary value of lost transactions', '$', 'monthly', 5000, 25000, 'Finance', 'Loss', 'active', 'YOUR_ORG_ID'),
('KCI-011', 'KCI', 'Revenue impairment', 'Revenue loss from incidents', '$', 'monthly', 50000, 250000, 'Business', 'Loss', 'active', 'YOUR_ORG_ID'),

-- Compliance KCIs
('KCI-012', 'KCI', 'Regulatory fine amount', 'Total regulatory fines incurred', '$', 'quarterly', 10000, 100000, 'Compliance', 'Legal', 'active', 'YOUR_ORG_ID'),
('KCI-013', 'KCI', 'Audit finding count', 'Number of audit findings', 'count', 'quarterly', 5, 15, 'Compliance', 'Governance', 'active', 'YOUR_ORG_ID'),
('KCI-014', 'KCI', 'Compliance breach count', 'Number of regulatory compliance breaches', 'count', 'quarterly', 1, 3, 'Compliance', 'Legal', 'active', 'YOUR_ORG_ID'),

-- Security KCIs
('KCI-015', 'KCI', 'Confidential data exposure', 'Number of confidential data exposure incidents', 'count', 'quarterly', 1, 3, 'Security', 'Damage', 'active', 'YOUR_ORG_ID'),

-- Reputation KCIs
('KCI-016', 'KCI', 'Brand sentiment index', 'Brand sentiment score (0-100)', 'score', 'monthly', 60, 40, 'Reputation', 'PR', 'active', 'YOUR_ORG_ID'),
('KCI-017', 'KCI', 'Social media negative mentions', 'Volume of negative social media mentions', 'count', 'monthly', 50, 150, 'Reputation', 'PR', 'active', 'YOUR_ORG_ID'),
('KCI-018', 'KCI', 'Reputational damage severity', 'Qualitative assessment of reputational harm', 'score', 'quarterly', 3, 7, 'Reputation', 'Qualitative', 'active', 'YOUR_ORG_ID'),

-- Business KCIs
('KCI-019', 'KCI', 'Market share shift', 'Percentage change in market share', '%', 'quarterly', -2, -5, 'Business', 'Loss', 'active', 'YOUR_ORG_ID')
ON CONFLICT (organization_id, indicator_code) DO NOTHING;

-- Comment
COMMENT ON TABLE kri_kci_library IS 'Seeded with 20 KRIs (leading indicators) and 19 KCIs (lagging indicators) from user-provided files';
