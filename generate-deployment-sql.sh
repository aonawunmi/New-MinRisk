#!/bin/bash

# Generate a single SQL file combining all enhancement migrations
# For manual review and deployment

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

OUTPUT_FILE="RISK_REGISTER_ENHANCEMENTS_$(date +%Y%m%d_%H%M%S).sql"

echo ""
echo "Generating combined SQL file..."
echo ""

# Header
cat > "$OUTPUT_FILE" <<'EOF'
-- ============================================================================
-- RISK REGISTER ENHANCEMENTS - COMBINED DEPLOYMENT SQL
-- ============================================================================
--
-- Description: All 12 enhancement migrations combined into a single file
-- Generated: TIMESTAMP_PLACEHOLDER
--
-- This file contains:
--   - Enhancement #1: Expand Root Cause Register (23 → 45)
--   - Enhancement #2: Expand Impact Register (11 → 30)
--   - Enhancement #3: Fix DIME Scores (realistic variations)
--   - Enhancement #4: Add KRI/KCI Mappings
--   - Enhancement #5: Add Implementation Guidance to Controls
--   - Enhancement #6: Add Residual Risk Calculation
--   - Enhancement #7: Add Control Testing/Effectiveness Tracking
--   - Enhancement #8: Enhance Risk Model for Multiple Causes/Impacts
--   - Enhancement #9: Add Control Dependencies
--   - Enhancement #10: Add Risk Appetite Framework
--   - Enhancement #11: Add KRI/KCI Breach History
--   - Enhancement #12: Add Library Suggestions Approval Workflow
--
-- IMPORTANT: Before running, ensure YOUR_ORG_ID has been replaced with actual UUID
--
-- ============================================================================

BEGIN;  -- Start transaction

EOF

# Replace timestamp
sed -i.bak "s/TIMESTAMP_PLACEHOLDER/$(date)/" "$OUTPUT_FILE"
rm "${OUTPUT_FILE}.bak" 2>/dev/null || true

# Add each migration
for i in {16..27}; do
    migration_num=$(printf "%06d" $i)
    migration_file=$(ls supabase/migrations/20251126${migration_num}_*.sql 2>/dev/null | head -1)

    if [ -f "$migration_file" ]; then
        migration_name=$(basename "$migration_file" .sql | sed 's/^[0-9]*_//')

        echo "" >> "$OUTPUT_FILE"
        echo "-- ============================================================================" >> "$OUTPUT_FILE"
        echo "-- Migration $i: $migration_name" >> "$OUTPUT_FILE"
        echo "-- File: $(basename $migration_file)" >> "$OUTPUT_FILE"
        echo "-- ============================================================================" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"

        cat "$migration_file" >> "$OUTPUT_FILE"

        echo ""  >> "$OUTPUT_FILE"
        echo "-- End of Migration $i" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
done

# Footer
cat >> "$OUTPUT_FILE" <<'EOF'

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================

COMMIT;  -- Commit transaction

-- Verify deployment
SELECT 'Deployment verification:' as message;
SELECT COUNT(*) as root_causes FROM root_cause_register;
SELECT COUNT(*) as impacts FROM impact_register;
SELECT COUNT(*) as controls FROM control_library;
SELECT COUNT(*) as indicators FROM kri_kci_library;

-- End of combined deployment SQL
EOF

echo -e "${GREEN}✓ SQL file generated: $OUTPUT_FILE${NC}"
echo ""
echo "File size: $(wc -l < "$OUTPUT_FILE") lines"
echo ""
echo -e "${BLUE}To deploy:${NC}"
echo "  1. Open Supabase SQL Editor"
echo "  2. Copy contents of $OUTPUT_FILE"
echo "  3. Paste and run in SQL Editor"
echo ""
echo "Or use psql:"
echo "  psql YOUR_DATABASE_URL -f $OUTPUT_FILE"
echo ""
