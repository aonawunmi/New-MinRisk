-- HOTFIX: Seed KRI/KCI Indicators Only
-- Run this to seed just the 39 indicators

-- First, let's clear any test data
DELETE FROM global_kri_kci_library;

-- Now insert all 39 indicators
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
('KCI-019', 'KCI', 'Market share shift', 'Percentage change in market share', '%', 'quarterly', -2, -5, 'Business', 'Loss');

-- Verify
SELECT
  indicator_type,
  COUNT(*) as count
FROM global_kri_kci_library
GROUP BY indicator_type
ORDER BY indicator_type;

SELECT 'SUCCESS: ' || COUNT(*) || ' indicators seeded' as status
FROM global_kri_kci_library;
