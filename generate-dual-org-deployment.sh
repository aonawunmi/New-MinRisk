#!/bin/bash

# Generate deployment SQL for BOTH organizations
# This creates a single SQL file that applies enhancements to multiple organizations

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

ORG1_UUID="11111111-1111-1111-1111-111111111111"
ORG2_UUID="22222222-2222-2222-2222-222222222222"
ORG1_NAME="Acme Risk Management"
ORG2_NAME="Global Financial Services"

OUTPUT_FILE="DUAL_ORG_DEPLOYMENT_$(date +%Y%m%d_%H%M%S).sql"

echo ""
echo "Generating DUAL ORGANIZATION deployment SQL..."
echo ""
echo "Organization 1: $ORG1_NAME"
echo "  UUID: $ORG1_UUID"
echo ""
echo "Organization 2: $ORG2_NAME"
echo "  UUID: $ORG2_UUID"
echo ""

# Header
cat > "$OUTPUT_FILE" <<EOF
-- ============================================================================
-- DUAL ORGANIZATION DEPLOYMENT
-- Risk Register Enhancements for BOTH Organizations
-- ============================================================================
--
-- Organization 1: $ORG1_NAME ($ORG1_UUID)
-- Organization 2: $ORG2_NAME ($ORG2_UUID)
--
-- Generated: $(date)
--
-- This file will apply all 12 enhancements to BOTH organizations simultaneously.
--
-- ============================================================================

BEGIN;  -- Start transaction

-- ============================================================================
-- SCHEMA CHANGES (Applied once, affects all organizations)
-- ============================================================================

EOF

# Extract only schema changes (CREATE TABLE, ALTER TABLE, CREATE FUNCTION, etc.)
# These should only be applied once
for i in {16..27}; do
    migration_num=$(printf "%06d" $i)
    migration_file=$(ls supabase/migrations/20251126${migration_num}_*.sql 2>/dev/null | head -1)

    if [ -f "$migration_file" ]; then
        migration_name=$(basename "$migration_file" .sql | sed 's/^[0-9]*_//')

        echo "" >> "$OUTPUT_FILE"
        echo "-- Migration $i: $migration_name (Schema Changes Only)" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"

        # Extract schema changes (CREATE TABLE, ALTER TABLE, CREATE FUNCTION, CREATE VIEW, CREATE TRIGGER)
        grep -E "^(CREATE TABLE|ALTER TABLE|CREATE OR REPLACE FUNCTION|CREATE OR REPLACE VIEW|CREATE TRIGGER|CREATE INDEX)" "$migration_file" | while read -r line; do
            # Get the full statement (until semicolon)
            sed -n "/${line}/,/;/p" "$migration_file" >> "$OUTPUT_FILE"
        done
    fi
done

cat >> "$OUTPUT_FILE" <<EOF

-- ============================================================================
-- DATA INSERTS FOR ORGANIZATION 1: $ORG1_NAME
-- ============================================================================

EOF

# Now add all INSERT statements for Organization 1
for i in {16..27}; do
    migration_num=$(printf "%06d" $i)
    migration_file=$(ls supabase/migrations/20251126${migration_num}_*.sql 2>/dev/null | head -1)

    if [ -f "$migration_file" ]; then
        migration_name=$(basename "$migration_file" .sql | sed 's/^[0-9]*_//')

        echo "" >> "$OUTPUT_FILE"
        echo "-- ORG 1 Data: $migration_name" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"

        # Extract INSERT and UPDATE statements
        grep -E "^(INSERT INTO|UPDATE)" "$migration_file" >> "$OUTPUT_FILE" 2>/dev/null || true
    fi
done

cat >> "$OUTPUT_FILE" <<EOF

-- ============================================================================
-- DATA INSERTS FOR ORGANIZATION 2: $ORG2_NAME
-- ============================================================================

EOF

# Restore backups to get original files with YOUR_ORG_ID
BACKUP_DIR=$(ls -td supabase/migrations/backups/* | head -1)
echo "Using backup: $BACKUP_DIR"

# Temporarily copy backups to a temp location and replace with ORG2 UUID
TEMP_DIR="/tmp/minrisk_org2_$$"
mkdir -p "$TEMP_DIR"
cp "$BACKUP_DIR"/* "$TEMP_DIR/"

# Replace YOUR_ORG_ID with ORG2 UUID in temp files
for file in "$TEMP_DIR"/*.sql; do
    sed -i.bak "s/YOUR_ORG_ID/$ORG2_UUID/g" "$file"
    rm "${file}.bak" 2>/dev/null || true
done

# Now add all INSERT statements for Organization 2
for i in {16..27}; do
    migration_num=$(printf "%06d" $i)
    migration_file="$TEMP_DIR/20251126${migration_num}_"*.sql
    migration_file=$(ls $migration_file 2>/dev/null | head -1)

    if [ -f "$migration_file" ]; then
        migration_name=$(basename "$migration_file" .sql | sed 's/^[0-9]*_//')

        echo "" >> "$OUTPUT_FILE"
        echo "-- ORG 2 Data: $migration_name" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"

        # Extract INSERT and UPDATE statements
        grep -E "^(INSERT INTO|UPDATE)" "$migration_file" >> "$OUTPUT_FILE" 2>/dev/null || true
    fi
done

# Cleanup temp directory
rm -rf "$TEMP_DIR"

# Footer
cat >> "$OUTPUT_FILE" <<EOF

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================

COMMIT;  -- Commit transaction

-- Verify deployment for BOTH organizations
SELECT 'Deployment verification for $ORG1_NAME:' as message;
SELECT COUNT(*) as root_causes FROM root_cause_register WHERE organization_id = '$ORG1_UUID';
SELECT COUNT(*) as impacts FROM impact_register WHERE organization_id = '$ORG1_UUID';
SELECT COUNT(*) as controls FROM control_library WHERE organization_id = '$ORG1_UUID';

SELECT 'Deployment verification for $ORG2_NAME:' as message;
SELECT COUNT(*) as root_causes FROM root_cause_register WHERE organization_id = '$ORG2_UUID';
SELECT COUNT(*) as impacts FROM impact_register WHERE organization_id = '$ORG2_UUID';
SELECT COUNT(*) as controls FROM control_library WHERE organization_id = '$ORG2_UUID';

-- End of dual organization deployment
EOF

echo -e "${GREEN}✓ Dual organization SQL file generated: $OUTPUT_FILE${NC}"
echo ""
echo "File size: $(wc -l < "$OUTPUT_FILE") lines"
echo ""
echo -e "${BLUE}To deploy to BOTH organizations:${NC}"
echo "  1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new"
echo "  2. Copy contents of $OUTPUT_FILE"
echo "  3. Paste and run in SQL Editor"
echo "  4. Verify both organizations have data"
echo ""
