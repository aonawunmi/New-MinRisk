#!/bin/bash

# Risk Register Enhancement Deployment Script
# Replaces YOUR_ORG_ID placeholders and applies migrations

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "============================================"
echo "Risk Register Enhancement Deployment"
echo "============================================"
echo ""

# Database connection (from .env.development)
DB_URL="postgresql://postgres.yqjfxzkqzqslqwspjfgo:iRkeDUhdYWcHmKFqgjvQvSsKzLEKJbaE@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Check database connection
echo "Step 1: Checking database connection..."
if ! psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}✗ Database connection failed${NC}"
    echo "Please check your database credentials and try again."
    exit 1
fi
echo -e "${GREEN}✓ Database connected successfully${NC}"
echo ""

# Get existing organizations
echo "Step 2: Finding existing organizations..."
ORG_LIST=$(psql "$DB_URL" -t -c "SELECT id, name FROM organizations ORDER BY created_at DESC LIMIT 10;" 2>/dev/null || echo "")

if [ -z "$ORG_LIST" ]; then
    echo -e "${YELLOW}⚠ No organizations found in database${NC}"
    echo ""
    echo "Options:"
    echo "  1. Create a new organization"
    echo "  2. Enter organization UUID manually"
    echo ""
    read -p "Choose option (1 or 2): " CREATE_CHOICE

    if [ "$CREATE_CHOICE" = "1" ]; then
        echo ""
        read -p "Enter organization name: " ORG_NAME

        # Create organization
        echo "Creating organization..."
        ORG_UUID=$(psql "$DB_URL" -t -c "INSERT INTO organizations (name) VALUES ('$ORG_NAME') RETURNING id;" 2>/dev/null | xargs)

        if [ -z "$ORG_UUID" ]; then
            echo -e "${RED}✗ Failed to create organization${NC}"
            exit 1
        fi

        echo -e "${GREEN}✓ Organization created: $ORG_UUID${NC}"
    else
        echo ""
        read -p "Enter organization UUID: " ORG_UUID

        # Validate UUID format
        if [[ ! "$ORG_UUID" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
            echo -e "${RED}✗ Invalid UUID format${NC}"
            exit 1
        fi
    fi
else
    echo -e "${GREEN}Found existing organizations:${NC}"
    echo ""
    echo "$ORG_LIST" | nl -w2 -s'. '
    echo ""
    echo "Options:"
    echo "  - Enter number to select existing organization"
    echo "  - Type 'new' to create a new organization"
    echo "  - Type 'manual' to enter UUID manually"
    echo ""
    read -p "Your choice: " ORG_CHOICE

    if [ "$ORG_CHOICE" = "new" ]; then
        echo ""
        read -p "Enter organization name: " ORG_NAME
        ORG_UUID=$(psql "$DB_URL" -t -c "INSERT INTO organizations (name) VALUES ('$ORG_NAME') RETURNING id;" 2>/dev/null | xargs)
        echo -e "${GREEN}✓ Organization created: $ORG_UUID${NC}"
    elif [ "$ORG_CHOICE" = "manual" ]; then
        echo ""
        read -p "Enter organization UUID: " ORG_UUID
    else
        # Extract UUID from selected line
        ORG_UUID=$(echo "$ORG_LIST" | sed -n "${ORG_CHOICE}p" | awk '{print $1}')
        if [ -z "$ORG_UUID" ]; then
            echo -e "${RED}✗ Invalid selection${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓ Selected organization: $ORG_UUID${NC}"
    fi
fi

echo ""
echo "Step 3: Preparing migration files..."

# Create backup directory
BACKUP_DIR="supabase/migrations/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Count placeholders before replacement
PLACEHOLDER_COUNT=$(grep -r "YOUR_ORG_ID" supabase/migrations/202511260000{16..27}_*.sql 2>/dev/null | wc -l | xargs)
echo "Found $PLACEHOLDER_COUNT instances of 'YOUR_ORG_ID' to replace"

# Backup and replace in each enhancement migration
REPLACED_FILES=0
for migration in supabase/migrations/202511260000{16..27}_*.sql; do
    if [ -f "$migration" ]; then
        filename=$(basename "$migration")

        # Backup original
        cp "$migration" "$BACKUP_DIR/$filename"

        # Replace YOUR_ORG_ID with actual UUID
        sed -i.tmp "s/YOUR_ORG_ID/$ORG_UUID/g" "$migration"
        rm "${migration}.tmp" 2>/dev/null || true

        ((REPLACED_FILES++))
    fi
done

echo -e "${GREEN}✓ Replaced placeholders in $REPLACED_FILES files${NC}"
echo -e "${BLUE}ℹ Backups saved to: $BACKUP_DIR${NC}"
echo ""

# Verify replacement
REMAINING_PLACEHOLDERS=$(grep -r "YOUR_ORG_ID" supabase/migrations/202511260000{16..27}_*.sql 2>/dev/null | wc -l | xargs)
if [ "$REMAINING_PLACEHOLDERS" != "0" ]; then
    echo -e "${RED}✗ Warning: $REMAINING_PLACEHOLDERS placeholders remain${NC}"
    read -p "Continue anyway? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        echo "Deployment cancelled. Restoring backups..."
        cp "$BACKUP_DIR"/* supabase/migrations/
        exit 1
    fi
fi

echo "Step 4: Migration deployment options..."
echo ""
echo "Choose deployment method:"
echo "  1. Apply migrations now (recommended)"
echo "  2. Generate SQL file for manual review"
echo "  3. Exit (files are prepared but not deployed)"
echo ""
read -p "Your choice (1-3): " DEPLOY_CHOICE

if [ "$DEPLOY_CHOICE" = "1" ]; then
    echo ""
    echo "Step 5: Applying migrations to database..."
    echo ""

    # Apply each enhancement migration in order
    for i in {16..27}; do
        migration_num=$(printf "%06d" $i)
        migration_file=$(ls supabase/migrations/20251126${migration_num}_*.sql 2>/dev/null | head -1)

        if [ -f "$migration_file" ]; then
            migration_name=$(basename "$migration_file" .sql | sed 's/^[0-9]*_//')
            echo -n "Applying: $migration_name... "

            if psql "$DB_URL" -f "$migration_file" > /dev/null 2>&1; then
                echo -e "${GREEN}✓${NC}"
            else
                echo -e "${RED}✗ FAILED${NC}"
                echo ""
                echo "Migration failed. Rolling back..."

                # Restore backups
                cp "$BACKUP_DIR"/* supabase/migrations/

                echo -e "${RED}Deployment failed. Original files restored.${NC}"
                echo "Check error log for details."
                exit 1
            fi
        fi
    done

    echo ""
    echo -e "${GREEN}✓ All migrations applied successfully!${NC}"

    # Record migration in schema_migrations table
    echo ""
    echo "Recording migration status..."
    for i in {16..27}; do
        migration_num="20251126$(printf '%06d' $i)"
        psql "$DB_URL" -c "INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('$migration_num') ON CONFLICT DO NOTHING;" > /dev/null 2>&1 || true
    done

elif [ "$DEPLOY_CHOICE" = "2" ]; then
    echo ""
    OUTPUT_FILE="deployment_$(date +%Y%m%d_%H%M%S).sql"

    echo "-- Risk Register Enhancement Deployment" > "$OUTPUT_FILE"
    echo "-- Generated: $(date)" >> "$OUTPUT_FILE"
    echo "-- Organization ID: $ORG_UUID" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"

    for i in {16..27}; do
        migration_num=$(printf "%06d" $i)
        migration_file=$(ls supabase/migrations/20251126${migration_num}_*.sql 2>/dev/null | head -1)

        if [ -f "$migration_file" ]; then
            echo "-- Migration: $(basename $migration_file)" >> "$OUTPUT_FILE"
            cat "$migration_file" >> "$OUTPUT_FILE"
            echo "" >> "$OUTPUT_FILE"
            echo "" >> "$OUTPUT_FILE"
        fi
    done

    echo -e "${GREEN}✓ SQL file generated: $OUTPUT_FILE${NC}"
    echo "Review and apply manually when ready."

else
    echo ""
    echo -e "${BLUE}Files prepared but not deployed.${NC}"
    echo "Migration files are ready with organization ID replaced."
    echo "Run this script again or use: npx supabase db push"
fi

echo ""
echo "Step 6: Post-deployment verification..."
echo ""

if [ "$DEPLOY_CHOICE" = "1" ]; then
    # Verify key tables exist
    echo "Checking created tables..."

    TABLES_TO_CHECK=(
        "risk_root_causes"
        "risk_impacts"
        "control_dependencies"
        "risk_appetite_statements"
        "indicator_breaches"
        "library_suggestions"
        "control_effectiveness_tests"
    )

    for table in "${TABLES_TO_CHECK[@]}"; do
        if psql "$DB_URL" -c "\d $table" > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Table exists: $table"
        else
            echo -e "${RED}✗${NC} Table missing: $table"
        fi
    done

    echo ""
    echo "Checking data counts..."

    # Count root causes
    ROOT_CAUSE_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM root_cause_register WHERE organization_id = '$ORG_UUID';" 2>/dev/null | xargs)
    echo "Root causes: $ROOT_CAUSE_COUNT (expected: 45)"

    # Count impacts
    IMPACT_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM impact_register WHERE organization_id = '$ORG_UUID';" 2>/dev/null | xargs)
    echo "Impacts: $IMPACT_COUNT (expected: 30)"

    # Count controls
    CONTROL_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM control_library WHERE organization_id = '$ORG_UUID';" 2>/dev/null | xargs)
    echo "Controls: $CONTROL_COUNT (expected: 95)"

    # Count KRI/KCI
    INDICATOR_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM kri_kci_library WHERE organization_id = '$ORG_UUID';" 2>/dev/null | xargs)
    echo "Indicators (KRI/KCI): $INDICATOR_COUNT (expected: 39)"

    echo ""

    if [ "$ROOT_CAUSE_COUNT" = "45" ] && [ "$IMPACT_COUNT" = "30" ] && [ "$CONTROL_COUNT" = "95" ]; then
        echo -e "${GREEN}✓ All data loaded successfully!${NC}"
    else
        echo -e "${YELLOW}⚠ Data counts don't match expected values${NC}"
        echo "This might be normal if you had existing data."
    fi
fi

echo ""
echo "============================================"
echo "Deployment Summary"
echo "============================================"
echo ""
echo "Organization ID: $ORG_UUID"
echo "Migrations processed: 12 (000016-000027)"
echo "Backup location: $BACKUP_DIR"
echo ""

if [ "$DEPLOY_CHOICE" = "1" ]; then
    echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Test the enhancements in your UI"
    echo "2. Verify risk creation with new features"
    echo "3. Check control suggestions work"
    echo "4. Review residual risk calculations"
else
    echo -e "${BLUE}Files prepared for deployment${NC}"
    echo ""
    echo "To apply later, run:"
    echo "  npx supabase db push"
    echo ""
    echo "To restore originals:"
    echo "  cp $BACKUP_DIR/* supabase/migrations/"
fi

echo ""
