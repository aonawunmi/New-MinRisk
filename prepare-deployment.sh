#!/bin/bash

# Simple script to prepare enhancement migrations for deployment
# Replaces YOUR_ORG_ID placeholders with actual organization UUID

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "============================================"
echo "Risk Register Enhancement - Prepare Deployment"
echo "============================================"
echo ""

# Step 1: Get organization UUID
echo "You need your organization UUID to deploy these enhancements."
echo ""
echo "To find your organization UUID:"
echo "  1. Open Supabase Studio: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/editor"
echo "  2. Go to SQL Editor"
echo "  3. Run: SELECT id, name FROM organizations;"
echo "  4. Copy the UUID (id column)"
echo ""
read -p "Enter your organization UUID: " ORG_UUID

# Validate UUID format
if [[ ! "$ORG_UUID" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
    echo -e "${YELLOW}Warning: That doesn't look like a valid UUID${NC}"
    read -p "Continue anyway? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        echo "Cancelled."
        exit 0
    fi
fi

echo ""
echo "Step 2: Backing up original migration files..."

# Create backup directory
BACKUP_DIR="supabase/migrations/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup enhancement migrations
for migration in supabase/migrations/202511260000{16..27}_*.sql; do
    if [ -f "$migration" ]; then
        cp "$migration" "$BACKUP_DIR/"
    fi
done

echo -e "${GREEN}✓ Backups saved to: $BACKUP_DIR${NC}"

echo ""
echo "Step 3: Replacing placeholders..."

# Replace YOUR_ORG_ID with actual UUID
REPLACED_COUNT=0
for migration in supabase/migrations/202511260000{16..27}_*.sql; do
    if [ -f "$migration" ]; then
        # Count replacements in this file
        COUNT=$(grep -o "YOUR_ORG_ID" "$migration" | wc -l | xargs)

        if [ "$COUNT" -gt 0 ]; then
            sed -i.bak "s/YOUR_ORG_ID/$ORG_UUID/g" "$migration"
            rm "${migration}.bak" 2>/dev/null || true
            ((REPLACED_COUNT += COUNT))
            echo "  Replaced $COUNT instances in $(basename $migration)"
        fi
    fi
done

echo -e "${GREEN}✓ Total replacements: $REPLACED_COUNT${NC}"

# Verify no placeholders remain
REMAINING=$(grep -r "YOUR_ORG_ID" supabase/migrations/202511260000{16..27}_*.sql 2>/dev/null | wc -l | xargs)
if [ "$REMAINING" != "0" ]; then
    echo -e "${YELLOW}⚠ Warning: $REMAINING placeholders still remain${NC}"
else
    echo -e "${GREEN}✓ All placeholders replaced successfully${NC}"
fi

echo ""
echo "============================================"
echo "Preparation Complete!"
echo "============================================"
echo ""
echo "Organization UUID: $ORG_UUID"
echo "Migrations prepared: 12 files (000016-000027)"
echo "Backup location: $BACKUP_DIR"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo "Option A - Via Supabase Dashboard (Recommended):"
echo "  1. Open: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/editor"
echo "  2. Go to SQL Editor"
echo "  3. Create a new query"
echo "  4. Copy content from each migration file (000016-000027)"
echo "  5. Run each migration in order"
echo ""
echo "Option B - Via Supabase CLI:"
echo "  1. Login: npx supabase login"
echo "  2. Link project: npx supabase link --project-ref qrxwgjjgaekalvaqzpuf"
echo "  3. Push migrations: npx supabase db push"
echo ""
echo "Option C - Generate single SQL file:"
echo "  Run: bash generate-deployment-sql.sh"
echo ""
echo -e "${YELLOW}To restore original files (undo):${NC}"
echo "  cp $BACKUP_DIR/* supabase/migrations/"
echo ""
