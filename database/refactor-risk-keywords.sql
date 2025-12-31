-- Remove the hardcoded CHECK constraint on 'category' to allow dynamic values from the Taxonomy system
ALTER TABLE risk_keywords DROP CONSTRAINT IF EXISTS risk_keywords_category_check;
