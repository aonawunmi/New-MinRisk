#!/bin/bash

# Generate combined deployment SQL for hybrid multi-tenant architecture

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

OUTPUT_FILE="HYBRID_ARCHITECTURE_DEPLOYMENT_$(date +%Y%m%d_%H%M%S).sql"

echo ""
echo "Generating Hybrid Architecture Deployment SQL..."
echo ""

# Header
cat > "$OUTPUT_FILE" <<'EOF'
-- ============================================================================
-- HYBRID MULTI-TENANT ARCHITECTURE DEPLOYMENT
-- Risk Register Enhancements with Global Foundation + Org Customizations
-- ============================================================================
--
-- Generated: TIMESTAMP_PLACEHOLDER
--
-- This file contains 5 comprehensive migrations:
--   1. Migration 000030: Hybrid Root Cause Library (45 global causes)
--   2. Migration 000031: Hybrid Impact Library (30 global impacts)
--   3. Migration 000032: Hybrid Control Library (95 global controls)
--   4. Migration 000033: Hybrid KRI/KCI Library + Mappings (39 indicators + 145 mappings)
--   5. Migration 000034: Remaining Enhancements (residual risk, testing, etc.)
--
-- Architecture:
--   - Global library tables (shared by all organizations)
--   - Organization customization tables (private to each org)
--   - Unified views (global + org data with RLS)
--
-- Benefits:
--   - 90% reduction in base library data
--   - Central updates propagate to all organizations
--   - Organizations can customize without affecting others
--   - Proper multi-tenancy with Row-Level Security
--
-- IMPORTANT: This will:
--   1. Create new global_* tables
--   2. Create new org_* customization tables
--   3. Migrate existing library data to global tables
--   4. Replace existing tables with views (old tables backed up)
--   5. Add new enhancements (residual risk, control testing, etc.)
--
-- Estimated execution time: 2-3 minutes
--
-- ============================================================================

BEGIN;  -- Start transaction

EOF

# Replace timestamp
sed -i.bak "s/TIMESTAMP_PLACEHOLDER/$(date)/" "$OUTPUT_FILE"
rm "${OUTPUT_FILE}.bak" 2>/dev/null || true

# Add Migration 1: Root Cause Library
cat >> "$OUTPUT_FILE" <<'EOF'

-- ============================================================================
-- MIGRATION 1: HYBRID ROOT CAUSE LIBRARY
-- ============================================================================

EOF
cat "supabase/migrations/20251126000030_hybrid_root_cause_library.sql" >> "$OUTPUT_FILE"

# Add Migration 2: Impact Library
cat >> "$OUTPUT_FILE" <<'EOF'

-- ============================================================================
-- MIGRATION 2: HYBRID IMPACT LIBRARY
-- ============================================================================

EOF
cat "supabase/migrations/20251126000031_hybrid_impact_library.sql" >> "$OUTPUT_FILE"

# Add Migration 3: Control Library
cat >> "$OUTPUT_FILE" <<'EOF'

-- ============================================================================
-- MIGRATION 3: HYBRID CONTROL LIBRARY
-- ============================================================================

EOF
cat "supabase/migrations/20251126000032_hybrid_control_library.sql" >> "$OUTPUT_FILE"

# Add Migration 4: KRI/KCI + Mappings
cat >> "$OUTPUT_FILE" <<'EOF'

-- ============================================================================
-- MIGRATION 4: HYBRID KRI/KCI LIBRARY + MAPPINGS
-- ============================================================================

EOF
cat "supabase/migrations/20251126000033_hybrid_kri_kci_and_mappings.sql" >> "$OUTPUT_FILE"

# Add Migration 5: Remaining Enhancements
cat >> "$OUTPUT_FILE" <<'EOF'

-- ============================================================================
-- MIGRATION 5: REMAINING ENHANCEMENTS
-- ============================================================================

EOF
cat "supabase/migrations/20251126000034_remaining_enhancements.sql" >> "$OUTPUT_FILE"

# Footer
cat >> "$OUTPUT_FILE" <<'EOF'

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================

COMMIT;  -- Commit transaction

-- Verify deployment
SELECT 'Deployment verification:' as message;

SELECT 'Global Libraries:' as category,
       (SELECT COUNT(*) FROM global_root_cause_library) as root_causes,
       (SELECT COUNT(*) FROM global_impact_library) as impacts,
       (SELECT COUNT(*) FROM global_control_library) as controls,
       (SELECT COUNT(*) FROM global_kri_kci_library) as indicators;

SELECT 'Expected Counts:' as category,
       '45' as root_causes,
       '30' as impacts,
       '95' as controls,
       '39' as indicators;

SELECT 'Global Mappings:' as category,
       (SELECT COUNT(*) FROM global_root_cause_kri_mapping) as rc_kri_mappings,
       (SELECT COUNT(*) FROM global_impact_kci_mapping) as imp_kci_mappings;

SELECT 'Views Created:' as category,
       (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public' AND table_name LIKE '%register%') +
       (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public' AND table_name LIKE '%library%') +
       (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public' AND table_name LIKE '%mapping%') as view_count;

SELECT 'New Tables Created:' as category,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'global_%') as global_tables,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'org_%') as org_tables;

-- Success message
SELECT '✓ HYBRID ARCHITECTURE DEPLOYMENT COMPLETE!' as status;
SELECT 'All 5 migrations applied successfully.' as message;
SELECT 'Old tables backed up with suffix: _backup_20251126' as backup_info;
SELECT 'Review HYBRID_DEPLOYMENT_GUIDE.md for post-deployment steps' as next_steps;

-- End of combined deployment SQL
EOF

echo -e "${GREEN}✓ Hybrid Architecture deployment SQL generated: $OUTPUT_FILE${NC}"
echo ""
echo "File size: $(wc -l < "$OUTPUT_FILE") lines"
echo ""
echo -e "${BLUE}To deploy:${NC}"
echo "  1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new"
echo "  2. Copy contents of $OUTPUT_FILE"
echo "  3. Paste and run in SQL Editor"
echo "  4. Review verification output"
echo ""
echo -e "${BLUE}Or run the 5 migrations individually (recommended for first-time):${NC}"
echo "  1. Run: 20251126000030_hybrid_root_cause_library.sql"
echo "  2. Run: 20251126000031_hybrid_impact_library.sql"
echo "  3. Run: 20251126000032_hybrid_control_library.sql"
echo "  4. Run: 20251126000033_hybrid_kri_kci_and_mappings.sql"
echo "  5. Run: 20251126000034_remaining_enhancements.sql"
echo ""
echo "Documentation: See HYBRID_DEPLOYMENT_GUIDE.md for full details"
echo ""
