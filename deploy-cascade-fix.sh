#!/bin/bash

echo "=========================================================="
echo "MinRisk: Deploy Cascade Delete Fix"
echo "=========================================================="
echo ""
echo "This will update your database to use junction tables for:"
echo "  • Risk-Control relationships (unlink instead of delete)"
echo "  • Risk-KRI relationships (unlink instead of delete)"
echo ""
echo "Opening Supabase SQL Editor in your browser..."
echo ""

# Open Supabase SQL editor
open "https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new"

echo "✅ Supabase SQL Editor opened in browser"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. The SQL editor should now be open in your browser"
echo "2. Copy the contents of: database/fix-cascade-delete.sql"
echo "3. Paste into the SQL editor"
echo "4. Click the 'Run' button"
echo "5. Verify the results in the output panel"
echo ""
echo "The SQL file location:"
echo "$(pwd)/database/fix-cascade-delete.sql"
echo ""
echo "=========================================================="
echo "What will change:"
echo "=========================================================="
echo ""
echo "BEFORE (Current Behavior):"
echo "  • Delete Risk → CASCADE deletes Controls ❌"
echo "  • Delete Risk → Orphans KRI links ⚠️"
echo ""
echo "AFTER (New Behavior):"
echo "  • Delete Risk → Unlinks Controls (preserves them) ✅"
echo "  • Delete Risk → Unlinks KRIs (preserves them) ✅"
echo "  • Controls can be linked to multiple risks ✅"
echo "  • KRIs can monitor multiple risks ✅"
echo ""
echo "=========================================================="
echo ""

# Optionally, copy SQL to clipboard if pbcopy is available
if command -v pbcopy &> /dev/null; then
    echo "Would you like to copy the SQL to clipboard? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        cat database/fix-cascade-delete.sql | pbcopy
        echo "✅ SQL copied to clipboard! Just paste into the SQL editor."
        echo ""
    fi
fi

echo "Done! Follow the steps above to complete deployment."
