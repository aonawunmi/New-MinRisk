-- Migration: 20260219000001_intelligence_redesign.sql
-- Purpose: Risk Intelligence Module Redesign
--   Workstream A: Institution Typology & Regulator Management
--   Workstream B: Two-Layer Intelligence Cache Redesign
--   Workstream C: Alert constraints & retry support
-- Date: 2026-02-19

-- =============================================================================
-- PART 1: INSTITUTION TYPES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS institution_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  default_risk_categories JSONB DEFAULT '[]',
  default_scan_keywords JSONB DEFAULT '[]',
  default_rss_source_priorities JSONB DEFAULT '{}',
  icon VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_institution_types_category ON institution_types(category);
CREATE INDEX IF NOT EXISTS idx_institution_types_active ON institution_types(is_active) WHERE is_active = true;

-- =============================================================================
-- PART 2: SEED INSTITUTION TYPES (22 types across 6 categories)
-- =============================================================================

INSERT INTO institution_types (name, slug, category, description, display_order, default_scan_keywords, default_risk_categories) VALUES
-- Capital Markets
('Securities Exchange', 'securities-exchange', 'Capital Markets',
 'Market integrity, listing rules, trading surveillance, systemic risk', 1,
 '["market integrity","listing rules","trading surveillance","systemic risk","exchange","settlement","clearing"]',
 '["Market Risk","Operational Risk","Regulatory Risk","Technology Risk","Systemic Risk"]'),

('Clearing House / CCP', 'clearing-house', 'Capital Markets',
 'Settlement risk, participant default, margin requirements, default fund', 2,
 '["settlement risk","participant default","margin requirements","default fund","clearing","CCP","collateral"]',
 '["Settlement Risk","Counterparty Risk","Liquidity Risk","Operational Risk","Systemic Risk"]'),

('Central Securities Depository', 'csd', 'Capital Markets',
 'Custody risk, settlement finality, corporate actions, dematerialization', 3,
 '["custody risk","settlement finality","corporate actions","dematerialization","depository","securities"]',
 '["Custody Risk","Operational Risk","Technology Risk","Regulatory Risk"]'),

('Registration / Transfer Agent', 'registration-agent', 'Capital Markets',
 'Shareholder records, corporate actions, transfer processing', 4,
 '["shareholder records","corporate actions","transfer processing","registrar"]',
 '["Operational Risk","Technology Risk","Compliance Risk"]'),

('Broker-Dealer', 'broker-dealer', 'Capital Markets',
 'Best execution, client assets, market conduct, capital adequacy', 5,
 '["best execution","client assets","market conduct","capital adequacy","broker","dealer","trading"]',
 '["Market Risk","Operational Risk","Compliance Risk","Conduct Risk","Credit Risk"]'),

-- Banking
('Commercial Bank', 'commercial-bank', 'Banking',
 'Credit risk, capital adequacy (Basel), liquidity ratios, AML/KYC, prudential', 1,
 '["credit risk","capital adequacy","Basel","liquidity ratio","AML","KYC","prudential","NPL","loan"]',
 '["Credit Risk","Market Risk","Operational Risk","Liquidity Risk","Compliance Risk","AML Risk"]'),

('Merchant Bank', 'merchant-bank', 'Banking',
 'Investment banking risk, advisory liability, proprietary trading', 2,
 '["investment banking","advisory","proprietary trading","underwriting","merchant bank"]',
 '["Market Risk","Credit Risk","Operational Risk","Reputational Risk"]'),

('Microfinance Bank', 'microfinance-bank', 'Banking',
 'Portfolio concentration, client over-indebtedness, operational risk', 3,
 '["microfinance","portfolio concentration","over-indebtedness","financial inclusion","micro-lending"]',
 '["Credit Risk","Operational Risk","Liquidity Risk","Compliance Risk"]'),

('Development Finance Institution', 'dfi', 'Banking',
 'Sovereign risk, project risk, ESG, impact measurement, concessional lending', 4,
 '["sovereign risk","project risk","ESG","impact measurement","concessional lending","development finance"]',
 '["Credit Risk","Country Risk","ESG Risk","Project Risk","Operational Risk"]'),

-- Asset Management
('Asset Manager', 'asset-manager', 'Asset Management',
 'Fiduciary duty, portfolio concentration, valuation, performance attribution', 1,
 '["fiduciary duty","portfolio concentration","valuation","performance","asset management","fund"]',
 '["Market Risk","Operational Risk","Compliance Risk","Fiduciary Risk","Liquidity Risk"]'),

('Pension Fund Administrator', 'pfa', 'Asset Management',
 'Retirement adequacy, ALM, regulatory investment limits, contribution compliance', 2,
 '["pension","retirement","ALM","investment limits","contribution","PENCOM","annuity"]',
 '["Investment Risk","Operational Risk","Compliance Risk","Longevity Risk","Liquidity Risk"]'),

('Trustee / Custodian', 'trustee-custodian', 'Asset Management',
 'Safekeeping, segregation of assets, fiduciary obligations', 3,
 '["trustee","custodian","safekeeping","segregation","fiduciary","custody"]',
 '["Custody Risk","Operational Risk","Compliance Risk","Fiduciary Risk"]'),

-- Insurance
('Life Insurance', 'life-insurance', 'Insurance',
 'Mortality risk, solvency, reserves adequacy, policyholder protection', 1,
 '["mortality risk","solvency","reserves","policyholder","life insurance","actuarial","annuity"]',
 '["Insurance Risk","Market Risk","Operational Risk","Compliance Risk","Longevity Risk"]'),

('General Insurance', 'general-insurance', 'Insurance',
 'Underwriting risk, claims management, reinsurance, catastrophe exposure', 2,
 '["underwriting","claims","reinsurance","catastrophe","general insurance","property","casualty"]',
 '["Underwriting Risk","Claims Risk","Reinsurance Risk","Operational Risk","Catastrophe Risk"]'),

('Reinsurance', 'reinsurance', 'Insurance',
 'Retrocession, aggregate exposure, model risk', 3,
 '["retrocession","aggregate exposure","model risk","reinsurance","catastrophe bond"]',
 '["Reinsurance Risk","Model Risk","Catastrophe Risk","Credit Risk","Market Risk"]'),

('HMO / Health Insurance', 'hmo', 'Insurance',
 'Claims fraud, provider network risk, regulatory compliance', 4,
 '["HMO","health insurance","claims fraud","provider network","NHIS","healthcare"]',
 '["Claims Risk","Fraud Risk","Operational Risk","Compliance Risk","Reputational Risk"]'),

-- Fintech
('Payment Service Provider', 'psp', 'Fintech',
 'Cybersecurity, data privacy, transaction fraud, licensing, operational resilience', 1,
 '["payment","cybersecurity","data privacy","transaction fraud","licensing","fintech","PCI"]',
 '["Cyber Risk","Operational Risk","Compliance Risk","Fraud Risk","Technology Risk"]'),

('Mobile Money Operator', 'mmo', 'Fintech',
 'Agent network risk, float management, interoperability, AML', 2,
 '["mobile money","agent network","float management","interoperability","AML","USSD"]',
 '["Operational Risk","Fraud Risk","Technology Risk","Compliance Risk","Liquidity Risk"]'),

('Digital Lender', 'digital-lender', 'Fintech',
 'Credit scoring model risk, collection practices, data privacy, interest rate caps', 3,
 '["digital lending","credit scoring","collection","data privacy","interest rate cap","fintech lending"]',
 '["Credit Risk","Model Risk","Compliance Risk","Reputational Risk","Technology Risk"]'),

('Crypto / Digital Asset Platform', 'crypto-platform', 'Fintech',
 'Custody of digital assets, market manipulation, regulatory uncertainty', 4,
 '["crypto","digital asset","blockchain","custody","market manipulation","DeFi","token"]',
 '["Market Risk","Custody Risk","Regulatory Risk","Technology Risk","Fraud Risk"]'),

-- Other
('Multilateral Agency', 'multilateral-agency', 'Other',
 'Sovereign risk, multi-country exposure, governance, mandate compliance', 1,
 '["sovereign risk","multi-country","governance","mandate","multilateral","development"]',
 '["Country Risk","Governance Risk","Operational Risk","Strategic Risk","ESG Risk"]'),

('Corporate / Non-Financial', 'corporate-non-financial', 'Other',
 'Operational risk, strategic risk, compliance, ESG', 2,
 '["operational risk","strategic risk","compliance","ESG","corporate governance"]',
 '["Operational Risk","Strategic Risk","Compliance Risk","ESG Risk","Reputational Risk"]')

ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- PART 3: ALTER EXISTING REGULATORS TABLE (add new columns)
-- =============================================================================

-- The regulators table already exists with: id, code, name, jurisdiction, alert_thresholds, created_at, updated_at
-- We ADD new columns needed for the Intelligence pipeline; code serves as abbreviation.

ALTER TABLE regulators ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Nigeria';
ALTER TABLE regulators ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE regulators ADD COLUMN IF NOT EXISTS rss_feed_urls JSONB DEFAULT '[]';
ALTER TABLE regulators ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE regulators ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE regulators ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Backfill existing regulators with new column data
UPDATE regulators SET
  country = 'Nigeria',
  website_url = 'https://www.cbn.gov.ng',
  rss_feed_urls = '["https://www.cbn.gov.ng/rss/news.xml"]',
  description = 'Banking & finance supervision, monetary policy, financial system stability'
WHERE code = 'CBN';

UPDATE regulators SET
  country = 'Nigeria',
  website_url = 'https://sec.gov.ng',
  rss_feed_urls = '["https://sec.gov.ng/feed/"]',
  description = 'Capital markets regulation, investor protection, market integrity'
WHERE code = 'SEC';

UPDATE regulators SET
  country = 'Nigeria',
  website_url = 'https://www.naicom.gov.ng',
  rss_feed_urls = '[]',
  description = 'Insurance industry regulation, policyholder protection, solvency oversight'
WHERE code = 'NAICOM';

UPDATE regulators SET
  country = 'Nigeria',
  website_url = 'https://www.pencom.gov.ng',
  rss_feed_urls = '[]',
  description = 'Pension fund regulation, retirement savings adequacy, contributor protection'
WHERE code = 'PENCOM';

-- =============================================================================
-- PART 4: SEED ADDITIONAL REGULATORS
-- =============================================================================

INSERT INTO regulators (code, name, jurisdiction, country, website_url, rss_feed_urls, description) VALUES
('FMDQ', 'FMDQ Securities Exchange', 'Capital Markets', 'Nigeria',
 'https://fmdqgroup.com', '["https://fmdqgroup.com/feed/"]',
 'Securities exchange for fixed income, currencies, derivatives'),

('NGX', 'Nigerian Exchange Group', 'Capital Markets', 'Nigeria',
 'https://ngxgroup.com', '[]',
 'Equities exchange, listing regulation, market surveillance'),

('NDIC', 'Nigeria Deposit Insurance Corporation', 'Banking & Finance', 'Nigeria',
 'https://ndic.gov.ng', '[]',
 'Deposit insurance, bank resolution, depositor protection'),

('NITDA', 'National Information Technology Development Agency', 'Technology & Data', 'Nigeria',
 'https://nitda.gov.ng', '[]',
 'Data protection (NDPR), cybersecurity directives, IT governance'),

('FRC', 'Financial Reporting Council of Nigeria', 'Financial Reporting', 'Nigeria',
 'https://frcnigeria.gov.ng', '[]',
 'Accounting standards, financial reporting requirements, audit oversight'),

('EFCC', 'Economic and Financial Crimes Commission', 'Financial Crime', 'Nigeria',
 'https://efcc.gov.ng', '[]',
 'AML enforcement, financial crime prosecution, anti-corruption')
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- PART 5: INSTITUTION TYPE ↔ REGULATOR MAPPING TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS institution_type_regulators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_type_id UUID NOT NULL REFERENCES institution_types(id) ON DELETE CASCADE,
  regulator_id UUID NOT NULL REFERENCES regulators(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(institution_type_id, regulator_id)
);

CREATE INDEX IF NOT EXISTS idx_itr_institution ON institution_type_regulators(institution_type_id);
CREATE INDEX IF NOT EXISTS idx_itr_regulator ON institution_type_regulators(regulator_id);

-- =============================================================================
-- PART 6: SEED REGULATOR MAPPINGS
-- =============================================================================

-- Helper: insert mapping by slug + regulator code
DO $$
DECLARE
  v_it_id UUID;
  v_reg_id UUID;
BEGIN
  -- ── Capital Markets ──

  -- Securities Exchange → SEC (primary), CBN, FRC, NITDA
  SELECT id INTO v_it_id FROM institution_types WHERE slug = 'securities-exchange';
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'SEC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, true) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'CBN';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'FRC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'NITDA';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;

  -- Clearing House → SEC (primary), CBN
  SELECT id INTO v_it_id FROM institution_types WHERE slug = 'clearing-house';
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'SEC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, true) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'CBN';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;

  -- CSD → SEC (primary), CBN
  SELECT id INTO v_it_id FROM institution_types WHERE slug = 'csd';
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'SEC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, true) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'CBN';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;

  -- Registration Agent → SEC (primary), FRC
  SELECT id INTO v_it_id FROM institution_types WHERE slug = 'registration-agent';
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'SEC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, true) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'FRC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;

  -- Broker-Dealer → SEC (primary), CBN, FRC, EFCC
  SELECT id INTO v_it_id FROM institution_types WHERE slug = 'broker-dealer';
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'SEC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, true) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'CBN';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'FRC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'EFCC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;

  -- ── Banking ──

  -- Commercial Bank → CBN (primary), NDIC, EFCC, NITDA, FRC
  SELECT id INTO v_it_id FROM institution_types WHERE slug = 'commercial-bank';
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'CBN';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, true) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'NDIC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'EFCC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'NITDA';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'FRC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;

  -- Merchant Bank → CBN (primary), SEC, FRC
  SELECT id INTO v_it_id FROM institution_types WHERE slug = 'merchant-bank';
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'CBN';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, true) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'SEC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'FRC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;

  -- Microfinance Bank → CBN (primary), NDIC, EFCC
  SELECT id INTO v_it_id FROM institution_types WHERE slug = 'microfinance-bank';
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'CBN';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, true) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'NDIC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'EFCC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;

  -- DFI → CBN (primary), SEC, FRC
  SELECT id INTO v_it_id FROM institution_types WHERE slug = 'dfi';
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'CBN';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, true) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'SEC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'FRC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;

  -- ── Asset Management ──

  -- Asset Manager → SEC (primary), FRC
  SELECT id INTO v_it_id FROM institution_types WHERE slug = 'asset-manager';
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'SEC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, true) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'FRC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;

  -- PFA → PENCOM (primary), SEC, FRC
  SELECT id INTO v_it_id FROM institution_types WHERE slug = 'pfa';
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'PENCOM';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, true) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'SEC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'FRC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;

  -- Trustee / Custodian → SEC (primary), CBN
  SELECT id INTO v_it_id FROM institution_types WHERE slug = 'trustee-custodian';
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'SEC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, true) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'CBN';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;

  -- ── Insurance ──

  -- Life Insurance → NAICOM (primary), FRC
  SELECT id INTO v_it_id FROM institution_types WHERE slug = 'life-insurance';
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'NAICOM';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, true) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'FRC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;

  -- General Insurance → NAICOM (primary), FRC
  SELECT id INTO v_it_id FROM institution_types WHERE slug = 'general-insurance';
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'NAICOM';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, true) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'FRC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;

  -- Reinsurance → NAICOM (primary), FRC
  SELECT id INTO v_it_id FROM institution_types WHERE slug = 'reinsurance';
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'NAICOM';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, true) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'FRC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;

  -- HMO → NAICOM (primary), NITDA
  SELECT id INTO v_it_id FROM institution_types WHERE slug = 'hmo';
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'NAICOM';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, true) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'NITDA';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;

  -- ── Fintech ──

  -- PSP → CBN (primary), NITDA
  SELECT id INTO v_it_id FROM institution_types WHERE slug = 'psp';
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'CBN';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, true) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'NITDA';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;

  -- MMO → CBN (primary), NITDA, EFCC
  SELECT id INTO v_it_id FROM institution_types WHERE slug = 'mmo';
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'CBN';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, true) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'NITDA';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'EFCC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;

  -- Digital Lender → CBN (primary), NITDA
  SELECT id INTO v_it_id FROM institution_types WHERE slug = 'digital-lender';
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'CBN';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, true) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'NITDA';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;

  -- Crypto Platform → SEC (primary), CBN, NITDA, EFCC
  SELECT id INTO v_it_id FROM institution_types WHERE slug = 'crypto-platform';
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'SEC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, true) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'CBN';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'NITDA';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'EFCC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;

  -- ── Other ──

  -- Multilateral Agency → CBN, SEC, FRC
  SELECT id INTO v_it_id FROM institution_types WHERE slug = 'multilateral-agency';
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'CBN';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'SEC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'FRC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;

  -- Corporate / Non-Financial → FRC, NITDA
  SELECT id INTO v_it_id FROM institution_types WHERE slug = 'corporate-non-financial';
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'FRC';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;
  SELECT id INTO v_reg_id FROM regulators WHERE code = 'NITDA';
  INSERT INTO institution_type_regulators (institution_type_id, regulator_id, is_primary) VALUES (v_it_id, v_reg_id, false) ON CONFLICT DO NOTHING;

END $$;

-- =============================================================================
-- PART 7: ALTER ORGANIZATIONS — add institution_type_id FK (nullable)
-- =============================================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS institution_type_id UUID REFERENCES institution_types(id);

CREATE INDEX IF NOT EXISTS idx_organizations_institution_type_id ON organizations(institution_type_id);

-- Backfill institution_type_id from existing institution_type text column
-- Maps known text values to the new institution_types slugs
UPDATE organizations o SET institution_type_id = it.id
FROM institution_types it
WHERE o.institution_type_id IS NULL
  AND o.institution_type IS NOT NULL
  AND (
    (o.institution_type = 'Bank' AND it.slug = 'commercial-bank')
    OR (o.institution_type = 'Securities Exchange' AND it.slug = 'securities-exchange')
    OR (o.institution_type = 'Capital Market Operator' AND it.slug = 'broker-dealer')
    OR (o.institution_type = 'Insurance Company' AND it.slug = 'general-insurance')
    OR (o.institution_type = 'Pension Fund Administrator' AND it.slug = 'pfa')
    OR (o.institution_type = 'Microfinance Bank' AND it.slug = 'microfinance-bank')
    OR (o.institution_type = 'Fintech' AND it.slug = 'psp')
    OR (o.institution_type = 'Asset Management' AND it.slug = 'asset-manager')
    OR (o.institution_type = 'Brokerage Firm' AND it.slug = 'broker-dealer')
    OR (o.institution_type = 'Clearing House' AND it.slug = 'clearing-house')
    OR (o.institution_type = 'Development Finance Institution' AND it.slug = 'dfi')
    OR (o.institution_type = 'Other' AND it.slug = 'corporate-non-financial')
  );

-- =============================================================================
-- PART 8: CACHE REDESIGN — rename + add institution_type_id to industry cache
-- =============================================================================

-- Rename the shared cache table
ALTER TABLE IF EXISTS intelligence_analysis_cache RENAME TO industry_event_cache;

-- Add institution_type_id to scope cache by industry
ALTER TABLE industry_event_cache
  ADD COLUMN IF NOT EXISTS institution_type_id UUID REFERENCES institution_types(id);

CREATE INDEX IF NOT EXISTS idx_industry_event_cache_inst_type ON industry_event_cache(institution_type_id);

-- Drop old unique constraint (event_hash alone) and create new one scoped by institution type
-- The cache key becomes: content_hash + institution_type_id
ALTER TABLE industry_event_cache DROP CONSTRAINT IF EXISTS intelligence_analysis_cache_event_hash_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_industry_event_cache_hash_type
  ON industry_event_cache(event_hash, COALESCE(institution_type_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- =============================================================================
-- PART 9: ORG-SPECIFIC ANALYSIS CACHE (private per-org)
-- =============================================================================

CREATE TABLE IF NOT EXISTS org_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES external_events(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  risk_code VARCHAR(50),
  analysis_result JSONB NOT NULL,
  likelihood_change INTEGER DEFAULT 0,
  impact_change INTEGER DEFAULT 0,
  confidence NUMERIC(3,2),
  suggested_controls JSONB DEFAULT '[]',
  reasoning TEXT,
  model_used VARCHAR(100),
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '7 days',
  UNIQUE(event_id, organization_id, risk_code)
);

CREATE INDEX IF NOT EXISTS idx_org_analysis_cache_org ON org_analysis_cache(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_analysis_cache_event ON org_analysis_cache(event_id);
CREATE INDEX IF NOT EXISTS idx_org_analysis_cache_expiry ON org_analysis_cache(expires_at);

ALTER TABLE org_analysis_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_analysis_cache_select" ON org_analysis_cache
  FOR SELECT USING (organization_id = current_org_id());

CREATE POLICY "org_analysis_cache_insert" ON org_analysis_cache
  FOR INSERT WITH CHECK (organization_id = current_org_id());

-- Service role bypass for Edge Functions
CREATE POLICY "org_analysis_cache_service" ON org_analysis_cache
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- PART 10: ALERT DUPLICATE PREVENTION
-- =============================================================================

-- Clean up any existing duplicates (keep most recent)
DELETE FROM risk_intelligence_alerts a
USING risk_intelligence_alerts b
WHERE a.id < b.id
  AND a.event_id = b.event_id
  AND a.risk_code = b.risk_code;

-- Add unique constraint
ALTER TABLE risk_intelligence_alerts
  ADD CONSTRAINT unique_event_risk_alert UNIQUE (event_id, risk_code);

-- =============================================================================
-- PART 11: RETRY SUPPORT FOR EXTERNAL EVENTS
-- =============================================================================

ALTER TABLE external_events ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- =============================================================================
-- PART 12: RLS POLICIES FOR NEW TABLES
-- =============================================================================

ALTER TABLE institution_types ENABLE ROW LEVEL SECURITY;

-- Everyone can read active institution types
CREATE POLICY "institution_types_select" ON institution_types
  FOR SELECT USING (true);

-- Super admin manages institution types
CREATE POLICY "institution_types_manage" ON institution_types
  FOR ALL USING (is_super_admin());

-- institution_type_regulators: everyone reads, super admin manages
ALTER TABLE institution_type_regulators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "itr_select" ON institution_type_regulators
  FOR SELECT USING (true);

CREATE POLICY "itr_manage" ON institution_type_regulators
  FOR ALL USING (is_super_admin());

-- =============================================================================
-- PART 13: UPDATE cleanup_expired_cache TO HANDLE RENAMED TABLE
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS TABLE(table_name TEXT, deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Clean ai_response_cache
  DELETE FROM ai_response_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'ai_response_cache';
  deleted_count := v_count;
  RETURN NEXT;

  -- Clean industry_event_cache (renamed from intelligence_analysis_cache)
  DELETE FROM industry_event_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'industry_event_cache';
  deleted_count := v_count;
  RETURN NEXT;

  -- Clean event_dedup_index
  DELETE FROM event_dedup_index WHERE expires_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'event_dedup_index';
  deleted_count := v_count;
  RETURN NEXT;

  -- Clean org_analysis_cache
  DELETE FROM org_analysis_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'org_analysis_cache';
  deleted_count := v_count;
  RETURN NEXT;
END;
$$;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
