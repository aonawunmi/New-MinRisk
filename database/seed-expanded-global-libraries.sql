-- =====================================================
-- MinRisk: Expanded Global Library Seed Data
-- =====================================================
-- Date: 2025-11-26
-- Purpose: Comprehensive root causes and impacts for enterprise risk management
-- Coverage: 70 root causes + 45 impacts across all risk domains
-- =====================================================

-- =====================================================
-- PART 1: ROOT CAUSES (70 total)
-- =====================================================

-- Clear existing global root causes (optional - comment out if you want to keep existing)
-- TRUNCATE TABLE global_root_cause_library CASCADE;

INSERT INTO global_root_cause_library
  (cause_code, cause_name, cause_description, category, subcategory, is_active)
VALUES

-- OPERATIONAL RISKS (15 root causes)
('RC-OP-001', 'Inadequate internal controls', 'Weak or missing control frameworks that fail to prevent errors or detect issues in operational processes', 'Operational', 'Process Controls', true),
('RC-OP-002', 'Insufficient capacity or resources', 'Limited staff, budget, infrastructure, or technology capacity to meet operational demands', 'Operational', 'Resource Management', true),
('RC-OP-003', 'Process inefficiency or failure', 'Poorly designed, outdated, or broken business processes that cause delays, errors, or failures', 'Operational', 'Process Design', true),
('RC-OP-004', 'Infrastructure breakdown', 'Failure of critical physical infrastructure (facilities, equipment, utilities) supporting operations', 'Operational', 'Infrastructure', true),
('RC-OP-005', 'Supply chain disruption', 'Interruption to critical suppliers, logistics, or procurement channels affecting operations', 'Operational', 'Supply Chain', true),
('RC-OP-006', 'Quality control failures', 'Inadequate quality assurance processes leading to defective products or services', 'Operational', 'Quality Management', true),
('RC-OP-007', 'Operational complexity', 'Overly complex operations with multiple dependencies creating fragility and failure points', 'Operational', 'Process Complexity', true),
('RC-OP-008', 'Single points of failure', 'Critical dependencies on single systems, processes, or individuals without redundancy', 'Operational', 'Business Continuity', true),
('RC-OP-009', 'Inadequate business continuity planning', 'Lack of disaster recovery, backup systems, or crisis management plans', 'Operational', 'Business Continuity', true),
('RC-OP-010', 'Geographic concentration', 'Over-reliance on single geographic locations for operations, exposing to regional disruptions', 'Operational', 'Geographic Risk', true),
('RC-OP-011', 'Outdated equipment or technology', 'Aging systems, machinery, or infrastructure requiring replacement or modernization', 'Operational', 'Infrastructure', true),
('RC-OP-012', 'Maintenance failures', 'Inadequate preventive maintenance programs leading to equipment breakdowns', 'Operational', 'Asset Management', true),
('RC-OP-013', 'Inventory management issues', 'Poor inventory control causing stockouts, overstock, or obsolescence', 'Operational', 'Inventory Management', true),
('RC-OP-014', 'Transportation and logistics failures', 'Breakdowns in shipping, distribution, or transportation networks', 'Operational', 'Logistics', true),
('RC-OP-015', 'Project management failures', 'Inadequate planning, execution, or oversight of strategic projects', 'Operational', 'Project Management', true),

-- STRATEGIC RISKS (12 root causes)
('RC-ST-001', 'Market disruption or technological change', 'Disruptive innovations, new business models, or technologies that obsolete existing offerings', 'Strategic', 'Market Dynamics', true),
('RC-ST-002', 'Ineffective strategic planning', 'Poor strategic decision-making, lack of vision, or misalignment between strategy and execution', 'Strategic', 'Strategy', true),
('RC-ST-003', 'Competitive pressure', 'Aggressive competitors, price wars, market share erosion, or loss of competitive advantage', 'Strategic', 'Competition', true),
('RC-ST-004', 'M&A integration failures', 'Poorly executed mergers, acquisitions, or divestitures creating value destruction', 'Strategic', 'M&A', true),
('RC-ST-005', 'Customer preference changes', 'Shifting consumer tastes, demographics, or buying behaviors reducing demand', 'Strategic', 'Customer Dynamics', true),
('RC-ST-006', 'Reputational damage', 'Negative publicity, brand erosion, or loss of stakeholder trust affecting business value', 'Strategic', 'Reputation', true),
('RC-ST-007', 'Innovation failure', 'Inability to develop new products, services, or capabilities to meet market needs', 'Strategic', 'Innovation', true),
('RC-ST-008', 'Poor market positioning', 'Ineffective branding, messaging, or market segmentation reducing competitiveness', 'Strategic', 'Market Positioning', true),
('RC-ST-009', 'Economic downturn', 'Recession, economic contraction, or reduced consumer spending affecting revenue', 'Strategic', 'Macroeconomic', true),
('RC-ST-010', 'Dependency on key customers', 'Over-reliance on small number of major clients creating revenue concentration risk', 'Strategic', 'Customer Concentration', true),
('RC-ST-011', 'Product obsolescence', 'Products or services becoming outdated or irrelevant to market needs', 'Strategic', 'Product Lifecycle', true),
('RC-ST-012', 'Strategic partnership failures', 'Breakdown of key alliances, joint ventures, or partnerships', 'Strategic', 'Partnerships', true),

-- FINANCIAL RISKS (10 root causes)
('RC-FN-001', 'Liquidity constraints', 'Insufficient cash flow or access to funding to meet short-term obligations', 'Financial', 'Liquidity', true),
('RC-FN-002', 'Credit risk exposure', 'Risk of counterparty default or non-payment by customers, partners, or financial institutions', 'Financial', 'Credit Risk', true),
('RC-FN-003', 'Market volatility', 'Adverse movements in interest rates, foreign exchange rates, equity prices, or commodity prices', 'Financial', 'Market Risk', true),
('RC-FN-004', 'Excessive leverage', 'High debt levels creating financial stress, covenant breaches, or refinancing risk', 'Financial', 'Leverage', true),
('RC-FN-005', 'Budgetary pressures', 'Cost overruns, revenue shortfalls, or inability to meet financial targets', 'Financial', 'Budget Management', true),
('RC-FN-006', 'Inadequate financial controls', 'Weak financial reporting, accounting controls, or internal audit functions', 'Financial', 'Financial Controls', true),
('RC-FN-007', 'Foreign exchange exposure', 'Unhedged currency risk from international operations or transactions', 'Financial', 'FX Risk', true),
('RC-FN-008', 'Fraud or embezzlement', 'Internal or external financial fraud, theft, or misappropriation of assets', 'Financial', 'Fraud', true),
('RC-FN-009', 'Investment underperformance', 'Poor returns on strategic investments, capital projects, or financial assets', 'Financial', 'Investment Risk', true),
('RC-FN-010', 'Concentration of revenue sources', 'Over-dependence on single product, service, or revenue stream', 'Financial', 'Revenue Concentration', true),

-- COMPLIANCE & LEGAL RISKS (8 root causes)
('RC-CL-001', 'Regulatory changes', 'New or changing laws, regulations, or compliance requirements affecting operations', 'Compliance', 'Regulatory Change', true),
('RC-CL-002', 'Non-compliance with regulations', 'Failure to adhere to applicable laws, rules, or industry standards', 'Compliance', 'Regulatory Compliance', true),
('RC-CL-003', 'Legal disputes or litigation', 'Lawsuits, legal claims, or disputes with stakeholders creating financial or reputational exposure', 'Compliance', 'Legal', true),
('RC-CL-004', 'Contractual failures', 'Breach of contract terms, poorly drafted agreements, or contract disputes', 'Compliance', 'Contract Management', true),
('RC-CL-005', 'Sanctions or trade restrictions', 'International sanctions, export controls, or trade barriers affecting business', 'Compliance', 'Trade Compliance', true),
('RC-CL-006', 'Anti-bribery and corruption violations', 'Violations of FCPA, UK Bribery Act, or local anti-corruption laws', 'Compliance', 'Anti-Corruption', true),
('RC-CL-007', 'Data privacy violations', 'Non-compliance with GDPR, CCPA, or other data protection regulations', 'Compliance', 'Data Privacy', true),
('RC-CL-008', 'Intellectual property disputes', 'Patent, trademark, or copyright infringement claims or losses', 'Compliance', 'Intellectual Property', true),

-- CYBERSECURITY & TECHNOLOGY RISKS (10 root causes)
('RC-CY-001', 'Cyberattack or data breach', 'Malicious hacking, ransomware, phishing, or other cyber intrusions compromising systems or data', 'Cybersecurity', 'Cyber Threats', true),
('RC-CY-002', 'System vulnerabilities', 'Unpatched software, weak configurations, or security flaws enabling exploitation', 'Cybersecurity', 'Vulnerabilities', true),
('RC-CY-003', 'Inadequate cybersecurity controls', 'Weak firewalls, insufficient monitoring, or poor access controls creating exposure', 'Cybersecurity', 'Security Controls', true),
('RC-CY-004', 'Insider threats', 'Malicious or negligent employees, contractors, or partners compromising security', 'Cybersecurity', 'Insider Risk', true),
('RC-CY-005', 'Third-party security failures', 'Vendors, suppliers, or partners with weak security creating supply chain cyber risk', 'Cybersecurity', 'Third-Party Risk', true),
('RC-CY-006', 'Technology infrastructure failure', 'Outages, crashes, or performance degradation of critical IT systems', 'Technology', 'Infrastructure', true),
('RC-CY-007', 'Cloud service provider failures', 'Downtime, security breaches, or service degradation from cloud vendors', 'Technology', 'Cloud Risk', true),
('RC-CY-008', 'Legacy system limitations', 'Outdated technology platforms unable to meet business needs or security standards', 'Technology', 'Legacy Systems', true),
('RC-CY-009', 'Data loss or corruption', 'Loss of critical business data due to technical failures, errors, or malicious acts', 'Technology', 'Data Management', true),
('RC-CY-010', 'AI/ML model failures', 'Algorithmic bias, model drift, or incorrect AI outputs causing business errors', 'Technology', 'AI/ML Risk', true),

-- PEOPLE & CULTURE RISKS (7 root causes)
('RC-PE-001', 'Leadership failures', 'Ineffective executive leadership, poor governance, or management misconduct', 'People', 'Leadership', true),
('RC-PE-002', 'Talent shortage or turnover', 'Inability to attract, retain, or develop skilled employees in critical roles', 'People', 'Talent Management', true),
('RC-PE-003', 'Inadequate training', 'Insufficient employee development, skills training, or knowledge transfer programs', 'People', 'Training & Development', true),
('RC-PE-004', 'Poor organizational culture', 'Toxic work environment, low morale, or values misalignment undermining performance', 'People', 'Culture', true),
('RC-PE-005', 'Succession planning gaps', 'Lack of pipeline for leadership roles or critical positions creating continuity risk', 'People', 'Succession Planning', true),
('RC-PE-006', 'Employee misconduct', 'Unethical behavior, policy violations, or criminal acts by employees', 'People', 'Conduct Risk', true),
('RC-PE-007', 'Health and safety failures', 'Inadequate workplace safety programs leading to injuries, illnesses, or fatalities', 'People', 'Health & Safety', true),

-- ENVIRONMENTAL & ESG RISKS (4 root causes)
('RC-EN-001', 'Climate change impacts', 'Physical risks from extreme weather, sea level rise, or chronic climate changes', 'Environmental', 'Climate Risk', true),
('RC-EN-002', 'Environmental violations', 'Non-compliance with environmental regulations causing fines or operational restrictions', 'Environmental', 'Environmental Compliance', true),
('RC-EN-003', 'Carbon transition risk', 'Business model disruption from shift to low-carbon economy and net-zero policies', 'Environmental', 'Transition Risk', true),
('RC-EN-004', 'ESG performance gaps', 'Poor environmental, social, or governance ratings affecting investor relations or reputation', 'Environmental', 'ESG', true),

-- GEOPOLITICAL & EXTERNAL RISKS (4 root causes)
('RC-GE-001', 'Political instability', 'Political unrest, regime changes, or policy uncertainty in operating regions', 'Geopolitical', 'Political Risk', true),
('RC-GE-002', 'Trade wars or tariffs', 'International trade conflicts, tariffs, or protectionist policies affecting commerce', 'Geopolitical', 'Trade Policy', true),
('RC-GE-003', 'Geopolitical conflicts', 'Wars, armed conflicts, or international tensions disrupting operations', 'Geopolitical', 'Conflict Risk', true),
('RC-GE-004', 'Pandemic or public health crisis', 'Disease outbreaks, pandemics, or public health emergencies disrupting business', 'Geopolitical', 'Health Crises', true)

ON CONFLICT (cause_code) DO UPDATE SET
  cause_name = EXCLUDED.cause_name,
  cause_description = EXCLUDED.cause_description,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- =====================================================
-- PART 2: IMPACTS (45 total)
-- =====================================================

-- Clear existing global impacts (optional - comment out if you want to keep existing)
-- TRUNCATE TABLE global_impact_library CASCADE;

INSERT INTO global_impact_library
  (impact_code, impact_name, impact_description, category, severity_level, is_active)
VALUES

-- FINANCIAL IMPACTS (12 impacts)
('IMP-FN-001', 'Revenue loss', 'Decrease in sales, contracts, or income streams reducing top-line revenue', 'Financial', 'Major', true),
('IMP-FN-002', 'Cost overruns', 'Unanticipated expenses exceeding budgets or financial projections', 'Financial', 'Moderate', true),
('IMP-FN-003', 'Asset write-downs', 'Impairment or devaluation of tangible or intangible assets on balance sheet', 'Financial', 'Major', true),
('IMP-FN-004', 'Credit rating downgrade', 'Reduction in credit rating increasing borrowing costs and limiting access to capital', 'Financial', 'Severe', true),
('IMP-FN-005', 'Cash flow disruption', 'Interruption to working capital cycle or liquidity position', 'Financial', 'Major', true),
('IMP-FN-006', 'Market value decline', 'Reduction in share price, market capitalization, or enterprise value', 'Financial', 'Major', true),
('IMP-FN-007', 'Increased borrowing costs', 'Higher interest rates or financing costs due to credit deterioration', 'Financial', 'Moderate', true),
('IMP-FN-008', 'Pension or benefit liabilities', 'Unfunded pension obligations or increased employee benefit costs', 'Financial', 'Moderate', true),
('IMP-FN-009', 'Investment losses', 'Loss of value on strategic investments, joint ventures, or financial assets', 'Financial', 'Moderate', true),
('IMP-FN-010', 'Dividend reduction or suspension', 'Inability to maintain dividend payments affecting shareholder returns', 'Financial', 'Moderate', true),
('IMP-FN-011', 'Working capital strain', 'Increased inventory, receivables, or reduced payables straining cash', 'Financial', 'Moderate', true),
('IMP-FN-012', 'Profitability decline', 'Reduction in profit margins, EBITDA, or net income', 'Financial', 'Major', true),

-- OPERATIONAL IMPACTS (10 impacts)
('IMP-OP-001', 'Service disruption', 'Interruption to normal business operations affecting service delivery to customers', 'Operational', 'Major', true),
('IMP-OP-002', 'Production downtime', 'Halts or slowdowns in manufacturing, processing, or production activities', 'Operational', 'Major', true),
('IMP-OP-003', 'Supply chain delays', 'Disruptions to procurement, inventory, or logistics affecting delivery timelines', 'Operational', 'Moderate', true),
('IMP-OP-004', 'Quality degradation', 'Decline in product or service quality leading to customer dissatisfaction', 'Operational', 'Moderate', true),
('IMP-OP-005', 'Capacity constraints', 'Inability to meet customer demand due to resource, infrastructure, or process limitations', 'Operational', 'Moderate', true),
('IMP-OP-006', 'Project delays', 'Postponement of strategic initiatives, capital projects, or product launches', 'Operational', 'Moderate', true),
('IMP-OP-007', 'Process inefficiencies', 'Increased cycle times, errors, or rework reducing operational effectiveness', 'Operational', 'Minor', true),
('IMP-OP-008', 'Third-party service failures', 'Vendor, supplier, or partner failures affecting dependent business processes', 'Operational', 'Moderate', true),
('IMP-OP-009', 'Geographic site unavailability', 'Loss of access to critical facilities, offices, or production sites', 'Operational', 'Major', true),
('IMP-OP-010', 'Technology system outages', 'Downtime of critical IT systems, applications, or infrastructure', 'Operational', 'Major', true),

-- PEOPLE IMPACTS (5 impacts)
('IMP-PE-001', 'Employee injuries or fatalities', 'Physical harm to employees through workplace accidents or health incidents', 'People', 'Catastrophic', true),
('IMP-PE-002', 'Talent loss or turnover', 'Departure of key employees, loss of institutional knowledge, or difficulty recruiting', 'People', 'Moderate', true),
('IMP-PE-003', 'Morale and engagement decline', 'Reduced employee satisfaction, motivation, or organizational commitment', 'People', 'Minor', true),
('IMP-PE-004', 'Productivity loss', 'Decrease in employee output, efficiency, or performance', 'People', 'Moderate', true),
('IMP-PE-005', 'Labor disputes or strikes', 'Union actions, work stoppages, or industrial disputes disrupting operations', 'People', 'Major', true),

-- STRATEGIC IMPACTS (6 impacts)
('IMP-ST-001', 'Market share loss', 'Decline in competitive position or customer base in target markets', 'Strategic', 'Major', true),
('IMP-ST-002', 'Strategic goal failure', 'Inability to achieve key strategic objectives or milestones', 'Strategic', 'Major', true),
('IMP-ST-003', 'Competitive disadvantage', 'Loss of competitive advantages, differentiation, or market positioning', 'Strategic', 'Moderate', true),
('IMP-ST-004', 'Innovation delays', 'Postponement or failure of new product development or innovation initiatives', 'Strategic', 'Moderate', true),
('IMP-ST-005', 'Partnership or alliance breakdown', 'Termination or degradation of strategic partnerships, JVs, or alliances', 'Strategic', 'Moderate', true),
('IMP-ST-006', 'Business model disruption', 'Fundamental changes to industry structure requiring business model transformation', 'Strategic', 'Catastrophic', true),

-- REPUTATIONAL IMPACTS (4 impacts)
('IMP-RE-001', 'Brand damage', 'Erosion of brand value, customer perception, or market reputation', 'Reputational', 'Major', true),
('IMP-RE-002', 'Customer trust loss', 'Decline in customer confidence, loyalty, or satisfaction', 'Reputational', 'Major', true),
('IMP-RE-003', 'Media or public scrutiny', 'Negative press coverage, social media backlash, or public criticism', 'Reputational', 'Moderate', true),
('IMP-RE-004', 'Stakeholder confidence erosion', 'Loss of investor, board, regulator, or community trust', 'Reputational', 'Major', true),

-- LEGAL & REGULATORY IMPACTS (4 impacts)
('IMP-LR-001', 'Regulatory fines or penalties', 'Financial penalties imposed by regulators for non-compliance', 'Legal/Regulatory', 'Major', true),
('IMP-LR-002', 'Litigation costs', 'Legal fees, settlement costs, or damages from lawsuits or disputes', 'Legal/Regulatory', 'Moderate', true),
('IMP-LR-003', 'License or permit revocation', 'Loss of operating licenses, permits, or regulatory approvals', 'Legal/Regulatory', 'Catastrophic', true),
('IMP-LR-004', 'Increased compliance costs', 'Additional expenses for compliance programs, controls, or regulatory reporting', 'Legal/Regulatory', 'Moderate', true),

-- ENVIRONMENTAL IMPACTS (2 impacts)
('IMP-EN-001', 'Environmental damage', 'Pollution, emissions, waste, or ecosystem harm from business activities', 'Environmental', 'Major', true),
('IMP-EN-002', 'Carbon cost increases', 'Higher costs from carbon taxes, emissions trading, or climate regulations', 'Environmental', 'Moderate', true),

-- SYSTEMIC IMPACTS (2 impacts)
('IMP-SY-001', 'Contagion to related entities', 'Spread of risk impacts to affiliated companies, partners, or industry peers', 'Systemic', 'Severe', true),
('IMP-SY-002', 'Market-wide disruption', 'Industry or market-level impacts affecting entire sectors or ecosystems', 'Systemic', 'Catastrophic', true)

ON CONFLICT (impact_code) DO UPDATE SET
  impact_name = EXCLUDED.impact_name,
  impact_description = EXCLUDED.impact_description,
  category = EXCLUDED.category,
  severity_level = EXCLUDED.severity_level,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Count root causes by category
SELECT category, COUNT(*) as count
FROM global_root_cause_library
WHERE is_active = true
GROUP BY category
ORDER BY category;

-- Count impacts by category
SELECT category, COUNT(*) as count
FROM global_impact_library
WHERE is_active = true
GROUP BY category
ORDER BY category;

-- Total counts
SELECT
  (SELECT COUNT(*) FROM global_root_cause_library WHERE is_active = true) as total_root_causes,
  (SELECT COUNT(*) FROM global_impact_library WHERE is_active = true) as total_impacts;

-- =====================================================
-- DEPLOYMENT COMPLETE
-- =====================================================
-- Root Causes: 70 (Operational: 15, Strategic: 12, Financial: 10,
--                   Compliance: 8, Cybersecurity: 10, People: 7,
--                   Environmental: 4, Geopolitical: 4)
-- Impacts: 45 (Financial: 12, Operational: 10, People: 5, Strategic: 6,
--              Reputational: 4, Legal/Regulatory: 4, Environmental: 2, Systemic: 2)
-- =====================================================
