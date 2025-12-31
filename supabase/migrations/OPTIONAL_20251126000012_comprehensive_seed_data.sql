-- Migration: Comprehensive Seed Data for Risk Register
-- Description: Complete library data from MASTER_CONTROL_LIBRARY, KRIs, KCIs, and mappings
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26
-- Data Source: User-provided markdown files

-- NOTE: Replace 'YOUR_ORG_ID' with actual organization ID before deployment

-- ============================================================================
-- PART 1: ROOT CAUSE REGISTER (23 Root Causes)
-- ============================================================================

INSERT INTO root_cause_register (cause_code, cause_name, cause_description, category, subcategory, status, organization_id, approved_at) VALUES
('RC-001', 'Poor capacity planning', 'Inadequate planning for system capacity and resource allocation', 'Operational Risk', 'Operational Capacity', 'active', 'YOUR_ORG_ID', NOW()),
('RC-002', 'Under-resourced infrastructure', 'Insufficient infrastructure resources to meet demand', 'Operational Risk', 'Operational Capacity', 'active', 'YOUR_ORG_ID', NOW()),
('RC-003', 'Legacy systems', 'Outdated technology systems limiting performance and flexibility', 'Technology & Cyber Risk', 'Technology Obsolescence', 'active', 'YOUR_ORG_ID', NOW()),
('RC-004', 'Lack of redundancy', 'Absence of backup systems or failover mechanisms', 'Operational Risk', 'Business Continuity', 'active', 'YOUR_ORG_ID', NOW()),
('RC-005', 'Single point of failure', 'Critical dependency on single component without backup', 'Operational Risk', 'Business Continuity', 'active', 'YOUR_ORG_ID', NOW()),
('RC-006', 'Insufficient staffing', 'Inadequate number of staff to handle workload', 'Human Capital Risk', 'Workforce Planning', 'active', 'YOUR_ORG_ID', NOW()),
('RC-007', 'Human error', 'Mistakes made by personnel in executing tasks', 'Human Capital Risk', 'Performance Management', 'active', 'YOUR_ORG_ID', NOW()),
('RC-008', 'Weak change management', 'Inadequate processes for managing system or process changes', 'Operational Risk', 'Process Inefficiency', 'active', 'YOUR_ORG_ID', NOW()),
('RC-009', 'Bad code quality', 'Poor software development practices leading to defects', 'Technology & Cyber Risk', 'Software Development Failures', 'active', 'YOUR_ORG_ID', NOW()),
('RC-010', 'Vendor failure', 'Third-party vendor unable to deliver services', 'Supply Chain & Logistics Risk', 'Supplier Reliability', 'active', 'YOUR_ORG_ID', NOW()),
('RC-011', 'Unpatched systems', 'Security vulnerabilities from lack of timely patching', 'Technology & Cyber Risk', 'Cybersecurity Threats', 'active', 'YOUR_ORG_ID', NOW()),
('RC-012', 'Inaccurate data', 'Data quality issues affecting decision-making', 'Operational Risk', 'Quality Management', 'active', 'YOUR_ORG_ID', NOW()),
('RC-013', 'Corrupted data', 'Data integrity issues from corruption or tampering', 'Technology & Cyber Risk', 'Database Security', 'active', 'YOUR_ORG_ID', NOW()),
('RC-014', 'Unauthorized access', 'Breach of access controls allowing unauthorized entry', 'Technology & Cyber Risk', 'Identity & Access Management', 'active', 'YOUR_ORG_ID', NOW()),
('RC-015', 'Lack of monitoring', 'Insufficient visibility into system health and performance', 'Technology & Cyber Risk', 'IT Service Management', 'active', 'YOUR_ORG_ID', NOW()),
('RC-016', 'Regulatory breach', 'Violation of regulatory requirements', 'Compliance & Legal Risk', 'Regulatory Compliance', 'active', 'YOUR_ORG_ID', NOW()),
('RC-017', 'Funding stress', 'Inadequate financial resources', 'Financial Risk', 'Liquidity Risk', 'active', 'YOUR_ORG_ID', NOW()),
('RC-018', 'Interest rate volatility', 'Exposure to interest rate fluctuations', 'Financial Risk', 'Market Risk (Interest Rate, FX, Commodity)', 'active', 'YOUR_ORG_ID', NOW()),
('RC-019', 'FX rate exposure', 'Exposure to foreign exchange rate fluctuations', 'Financial Risk', 'Foreign Exchange Exposure', 'active', 'YOUR_ORG_ID', NOW()),
('RC-020', 'Lack of ownership', 'Unclear accountability and responsibility', 'Governance & Reputational Risk', 'Corporate Governance Structure', 'active', 'YOUR_ORG_ID', NOW()),
('RC-021', 'Poor communication', 'Inadequate communication channels or practices', 'Governance & Reputational Risk', 'Stakeholder Management', 'active', 'YOUR_ORG_ID', NOW()),
('RC-022', 'Weak governance', 'Inadequate governance structures and oversight', 'Governance & Reputational Risk', 'Board Effectiveness', 'active', 'YOUR_ORG_ID', NOW()),
('RC-023', 'Third-party dependencies', 'Over-reliance on external vendors or service providers', 'Supply Chain & Logistics Risk', 'Single Source Dependency', 'active', 'YOUR_ORG_ID', NOW())
ON CONFLICT (organization_id, cause_code) DO NOTHING;

-- ============================================================================
-- PART 2: IMPACT REGISTER (11 Impacts)
-- ============================================================================

INSERT INTO impact_register (impact_code, impact_name, impact_description, impact_type, category, subcategory, status, organization_id, approved_at) VALUES
('IMP-001', 'Customer dissatisfaction', 'Negative customer experience leading to complaints and churn', 'reputational', 'Governance & Reputational Risk', 'Customer Complaints', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-002', 'Revenue loss', 'Direct monetary losses from incidents or service disruption', 'financial', 'Financial Risk', 'Revenue Recognition', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-003', 'Legal liability', 'Exposure to legal claims and lawsuits', 'regulatory', 'Compliance & Legal Risk', 'Legal Disputes & Litigation', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-004', 'Regulatory penalty', 'Fines, sanctions, or enforcement actions from regulators', 'regulatory', 'Compliance & Legal Risk', 'Regulatory Compliance', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-005', 'Data breach', 'Unauthorized access, disclosure, or loss of sensitive data', 'regulatory', 'Technology & Cyber Risk', 'Data Breaches', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-006', 'Reputation damage', 'Harm to brand reputation and stakeholder trust', 'reputational', 'Governance & Reputational Risk', 'Brand Reputation', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-007', 'Operational downtime', 'Interruption to business operations or service delivery', 'operational', 'Operational Risk', 'Service Delivery Failures', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-008', 'Safety risk', 'Potential harm or injury to employees or public', 'safety', 'Physical & Safety Risk', 'Workplace Accidents', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-009', 'Loss of competitive position', 'Erosion of market share and competitive advantage', 'strategic', 'Strategic Risk', 'Market Competition', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-010', 'Loss of trust', 'Erosion of stakeholder confidence and trust', 'reputational', 'Governance & Reputational Risk', 'Stakeholder Management', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-011', 'Service disruption', 'Interruption to critical services affecting customers', 'operational', 'Operational Risk', 'Service Delivery Failures', 'active', 'YOUR_ORG_ID', NOW())
ON CONFLICT (organization_id, impact_code) DO NOTHING;

-- NOTE: Control library, KRI/KCI library, and control mappings are in separate migration files:
-- - 20251126000013_seed_control_library.sql (95 controls)
-- - 20251126000014_seed_kri_kci_library.sql (39 KRIs/KCIs)
-- - 20251126000015_seed_control_mappings.sql (Root Cause → Control and Impact → Control mappings)

-- Comment
COMMENT ON TABLE root_cause_register IS 'Seeded with 23 comprehensive root causes mapped to RISK_TAXONOMY';
COMMENT ON TABLE impact_register IS 'Seeded with 11 comprehensive impacts mapped to RISK_TAXONOMY';
