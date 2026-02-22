-- =====================================================================
-- STAGING SEED: Risk Categories + Sample Risks for SEC Testing
-- =====================================================================
-- Target: Staging DB (oydbriokgjuwxndlsocd)
-- Org: ACME Corporation (ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5)
-- User: xz12ar@yahoo.com (d005b84c-2137-4066-b0d4-1aab672c0d23)
--
-- This script:
--   1. Fixes RLS on risk_categories/risk_subcategories for Clerk auth
--   2. Seeds 5 parent categories aligned with SEC framework
--   3. Seeds subcategories under each parent
--   4. Seeds 20 sample risks across all SEC categories
-- =====================================================================

BEGIN;

-- =====================================================================
-- PART 0: Fix RLS policies for Clerk auth
-- =====================================================================

-- risk_categories: drop old auth.uid() policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'risk_categories'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON risk_categories', pol.policyname);
  END LOOP;
END $$;

-- risk_subcategories: drop old auth.uid() policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'risk_subcategories'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON risk_subcategories', pol.policyname);
  END LOOP;
END $$;

-- Create Clerk-based policies for risk_categories
CREATE POLICY "clerk_risk_categories_select" ON risk_categories
  FOR SELECT USING (organization_id = current_org_id() OR is_super_admin());

CREATE POLICY "clerk_risk_categories_insert" ON risk_categories
  FOR INSERT WITH CHECK (is_admin() AND organization_id = current_org_id());

CREATE POLICY "clerk_risk_categories_update" ON risk_categories
  FOR UPDATE USING (is_admin() AND organization_id = current_org_id());

CREATE POLICY "clerk_risk_categories_delete" ON risk_categories
  FOR DELETE USING (is_admin() AND organization_id = current_org_id());

-- Create Clerk-based policies for risk_subcategories
CREATE POLICY "clerk_risk_subcategories_select" ON risk_subcategories
  FOR SELECT USING (organization_id = current_org_id() OR is_super_admin());

CREATE POLICY "clerk_risk_subcategories_insert" ON risk_subcategories
  FOR INSERT WITH CHECK (is_admin() AND organization_id = current_org_id());

CREATE POLICY "clerk_risk_subcategories_update" ON risk_subcategories
  FOR UPDATE USING (is_admin() AND organization_id = current_org_id());

CREATE POLICY "clerk_risk_subcategories_delete" ON risk_subcategories
  FOR DELETE USING (is_admin() AND organization_id = current_org_id());

ALTER TABLE risk_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_categories FORCE ROW LEVEL SECURITY;
ALTER TABLE risk_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_subcategories FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- PART 1: Risk Categories (5 parent categories = SEC's 5 standard)
-- =====================================================================

-- Use ACME Corporation's org ID
-- org_id: ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5
-- user_id: d005b84c-2137-4066-b0d4-1aab672c0d23

INSERT INTO risk_categories (id, organization_id, name, description) VALUES
  ('a1000001-0000-0000-0000-000000000001', 'ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'Strategic Risk', 'Risks from strategic decisions, business model, competitive positioning and AUM growth'),
  ('a1000002-0000-0000-0000-000000000002', 'ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'Market Risk', 'Risks from market movements including price, interest rate, FX and investment exposure'),
  ('a1000003-0000-0000-0000-000000000003', 'ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'Regulatory Risk', 'Risks from regulatory changes, compliance failures, sanctions and legal exposure'),
  ('a1000004-0000-0000-0000-000000000004', 'ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'Operational Risk', 'Risks from internal processes, people, systems, physical security and external events'),
  ('a1000005-0000-0000-0000-000000000005', 'ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'IT/Cyber Risk', 'Risks from IT systems, cybersecurity threats, system downtime and digital operations')
ON CONFLICT (organization_id, name) DO NOTHING;


-- =====================================================================
-- PART 2: Risk Subcategories
-- =====================================================================

-- Strategic Risk subcategories
INSERT INTO risk_subcategories (organization_id, category_id, name, description) VALUES
  ('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'a1000001-0000-0000-0000-000000000001', 'Business Strategy', 'Risks related to business direction and competitive positioning'),
  ('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'a1000001-0000-0000-0000-000000000001', 'AUM Growth', 'Risks related to assets under management growth targets'),
  ('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'a1000001-0000-0000-0000-000000000001', 'Reputational', 'Risks to organizational reputation and stakeholder confidence')
ON CONFLICT (category_id, name) DO NOTHING;

-- Market Risk subcategories
INSERT INTO risk_subcategories (organization_id, category_id, name, description) VALUES
  ('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'a1000002-0000-0000-0000-000000000002', 'Interest Rate', 'Risks from interest rate movements and yield curve changes'),
  ('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'a1000002-0000-0000-0000-000000000002', 'Foreign Exchange', 'Risks from currency exposure and FX volatility'),
  ('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'a1000002-0000-0000-0000-000000000002', 'Credit Risk', 'Risks from counterparty default and credit concentration'),
  ('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'a1000002-0000-0000-0000-000000000002', 'Liquidity', 'Risks from funding and market liquidity constraints')
ON CONFLICT (category_id, name) DO NOTHING;

-- Regulatory Risk subcategories
INSERT INTO risk_subcategories (organization_id, category_id, name, description) VALUES
  ('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'a1000003-0000-0000-0000-000000000003', 'Compliance', 'Risks from regulatory non-compliance and reporting failures'),
  ('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'a1000003-0000-0000-0000-000000000003', 'Legal', 'Risks from litigation, contractual disputes and legal liability'),
  ('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'a1000003-0000-0000-0000-000000000003', 'Sanctions', 'Risks from sanctions exposure and AML/CFT failures')
ON CONFLICT (category_id, name) DO NOTHING;

-- Operational Risk subcategories
INSERT INTO risk_subcategories (organization_id, category_id, name, description) VALUES
  ('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'a1000004-0000-0000-0000-000000000004', 'Process Risk', 'Risks from failed or inadequate internal processes'),
  ('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'a1000004-0000-0000-0000-000000000004', 'People Risk', 'Risks from human error, fraud, and key person dependency'),
  ('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'a1000004-0000-0000-0000-000000000004', 'Vendor/Outsourcing', 'Risks from third-party service provider dependencies'),
  ('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'a1000004-0000-0000-0000-000000000004', 'Business Continuity', 'Risks from disruptions to critical business operations')
ON CONFLICT (category_id, name) DO NOTHING;

-- IT/Cyber Risk subcategories
INSERT INTO risk_subcategories (organization_id, category_id, name, description) VALUES
  ('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'a1000005-0000-0000-0000-000000000005', 'Cybersecurity', 'Risks from cyber attacks, data breaches and unauthorized access'),
  ('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'a1000005-0000-0000-0000-000000000005', 'System Availability', 'Risks from system downtime, outages and infrastructure failures'),
  ('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'a1000005-0000-0000-0000-000000000005', 'Data Management', 'Risks from data integrity, privacy and information governance')
ON CONFLICT (category_id, name) DO NOTHING;


-- =====================================================================
-- PART 3: Sample Risks (20 risks across all 5 SEC categories)
-- =====================================================================
-- risks.category is a TEXT field matching the parent category name
-- risks.status must be 'Open' for SEC reporting (constraint: risks_status_check)

INSERT INTO risks (
  organization_id, user_id, risk_code, risk_title, risk_description,
  division, department, category, owner,
  likelihood_inherent, impact_inherent, status
) VALUES

-- STRATEGIC RISK (4 risks)
('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'd005b84c-2137-4066-b0d4-1aab672c0d23',
 'STR-001', 'AUM Concentration Risk',
 'Over-reliance on a small number of large institutional mandates representing >60% of total AUM',
 'Investment Management', 'Portfolio Strategy', 'Strategic Risk', 'Chief Investment Officer',
 4, 4, 'Open'),

('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'd005b84c-2137-4066-b0d4-1aab672c0d23',
 'STR-002', 'Competitive Displacement',
 'Risk of losing market share to lower-cost passive fund managers and robo-advisors',
 'Business Development', 'Strategy', 'Strategic Risk', 'Managing Director',
 3, 3, 'Open'),

('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'd005b84c-2137-4066-b0d4-1aab672c0d23',
 'STR-003', 'Product Innovation Lag',
 'Failure to develop ESG-integrated and thematic investment products in line with client demand',
 'Investment Management', 'Product Development', 'Strategic Risk', 'Head of Products',
 3, 4, 'Open'),

('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'd005b84c-2137-4066-b0d4-1aab672c0d23',
 'STR-004', 'Reputational Damage from Greenwashing',
 'Risk of regulatory action and client attrition due to unsubstantiated ESG claims in marketing materials',
 'Marketing', 'Communications', 'Strategic Risk', 'Chief Marketing Officer',
 2, 5, 'Open'),

-- MARKET RISK (4 risks)
('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'd005b84c-2137-4066-b0d4-1aab672c0d23',
 'MKT-001', 'Interest Rate Sensitivity',
 'Fixed income portfolio duration mismatch exposing firm to rising rate environment losses',
 'Investment Management', 'Fixed Income', 'Market Risk', 'Head of Fixed Income',
 4, 4, 'Open'),

('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'd005b84c-2137-4066-b0d4-1aab672c0d23',
 'MKT-002', 'FX Translation Risk',
 'USD-denominated fund NAV exposed to NGN depreciation affecting local currency reporting',
 'Finance', 'Treasury', 'Market Risk', 'Treasurer',
 3, 3, 'Open'),

('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'd005b84c-2137-4066-b0d4-1aab672c0d23',
 'MKT-003', 'Counterparty Credit Concentration',
 'Excessive exposure to top 5 banking counterparties exceeding internal credit limits',
 'Investment Management', 'Credit Analysis', 'Market Risk', 'Chief Risk Officer',
 3, 4, 'Open'),

('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'd005b84c-2137-4066-b0d4-1aab672c0d23',
 'MKT-004', 'Liquidity Mismatch',
 'Open-ended fund structure with illiquid underlying assets creating redemption risk',
 'Investment Management', 'Portfolio Management', 'Market Risk', 'Head of Liquidity',
 4, 5, 'Open'),

-- REGULATORY RISK (4 risks)
('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'd005b84c-2137-4066-b0d4-1aab672c0d23',
 'REG-001', 'SEC Reporting Non-Compliance',
 'Failure to meet quarterly SEC risk profile reporting deadlines and data quality requirements',
 'Compliance', 'Regulatory Affairs', 'Regulatory Risk', 'Chief Compliance Officer',
 2, 4, 'Open'),

('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'd005b84c-2137-4066-b0d4-1aab672c0d23',
 'REG-002', 'AML/CFT Deficiency',
 'Gaps in Know-Your-Customer processes for high-net-worth individuals and PEP screening',
 'Compliance', 'AML Unit', 'Regulatory Risk', 'Money Laundering Reporting Officer',
 3, 5, 'Open'),

('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'd005b84c-2137-4066-b0d4-1aab672c0d23',
 'REG-003', 'Investment Guidelines Breach',
 'Portfolio managers exceeding sector concentration limits defined in client IPS documents',
 'Investment Management', 'Compliance Monitoring', 'Regulatory Risk', 'Head of Investment Compliance',
 3, 3, 'Open'),

('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'd005b84c-2137-4066-b0d4-1aab672c0d23',
 'REG-004', 'Data Privacy Violation',
 'Non-compliance with NDPR requirements for client personal data processing and storage',
 'Legal', 'Data Protection', 'Regulatory Risk', 'Data Protection Officer',
 2, 4, 'Open'),

-- OPERATIONAL RISK (4 risks)
('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'd005b84c-2137-4066-b0d4-1aab672c0d23',
 'OPS-001', 'Trade Settlement Failure',
 'Operational failures in T+1/T+2 settlement processes causing failed trades and penalties',
 'Operations', 'Settlement', 'Operational Risk', 'Head of Operations',
 3, 3, 'Open'),

('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'd005b84c-2137-4066-b0d4-1aab672c0d23',
 'OPS-002', 'Key Person Dependency',
 'Critical fund management and client relationships concentrated in 3 senior portfolio managers',
 'Human Resources', 'Talent Management', 'Operational Risk', 'Chief Operating Officer',
 4, 4, 'Open'),

('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'd005b84c-2137-4066-b0d4-1aab672c0d23',
 'OPS-003', 'Vendor Service Disruption',
 'Dependency on single custodian bank for portfolio custody and fund administration services',
 'Operations', 'Vendor Management', 'Operational Risk', 'Head of Vendor Relations',
 3, 4, 'Open'),

('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'd005b84c-2137-4066-b0d4-1aab672c0d23',
 'OPS-004', 'NAV Calculation Error',
 'Risk of material misstatement in daily Net Asset Value calculations due to pricing data errors',
 'Finance', 'Fund Accounting', 'Operational Risk', 'Head of Fund Accounting',
 2, 5, 'Open'),

-- IT/CYBER RISK (4 risks)
('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'd005b84c-2137-4066-b0d4-1aab672c0d23',
 'ICT-001', 'Ransomware Attack',
 'Threat of ransomware encrypting portfolio management systems and client data repositories',
 'Technology', 'Information Security', 'IT/Cyber Risk', 'Chief Information Security Officer',
 3, 5, 'Open'),

('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'd005b84c-2137-4066-b0d4-1aab672c0d23',
 'ICT-002', 'Trading Platform Downtime',
 'Extended outage of order management system during volatile market conditions',
 'Technology', 'Infrastructure', 'IT/Cyber Risk', 'Head of IT Infrastructure',
 3, 4, 'Open'),

('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'd005b84c-2137-4066-b0d4-1aab672c0d23',
 'ICT-003', 'Client Portal Data Breach',
 'Unauthorized access to client portfolio data through web application vulnerability',
 'Technology', 'Application Security', 'IT/Cyber Risk', 'Chief Information Security Officer',
 2, 5, 'Open'),

('ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5', 'd005b84c-2137-4066-b0d4-1aab672c0d23',
 'ICT-004', 'Legacy System Migration Failure',
 'Risk of data loss and operational disruption during migration from legacy portfolio system',
 'Technology', 'IT Projects', 'IT/Cyber Risk', 'Head of IT Projects',
 3, 3, 'Open')

ON CONFLICT (organization_id, risk_code) DO NOTHING;

COMMIT;

-- =====================================================================
-- VERIFICATION
-- =====================================================================
-- SELECT 'Categories' as type, count(*) FROM risk_categories WHERE organization_id = 'ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5'
-- UNION ALL
-- SELECT 'Subcategories', count(*) FROM risk_subcategories WHERE organization_id = 'ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5'
-- UNION ALL
-- SELECT 'Risks', count(*) FROM risks WHERE organization_id = 'ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5';
