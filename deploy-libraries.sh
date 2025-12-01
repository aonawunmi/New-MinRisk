#!/bin/bash

echo "=================================================="
echo "MinRisk: Deploy Expanded Global Libraries"
echo "=================================================="
echo ""
echo "This will deploy 70 root causes and 45 impacts to your Supabase database."
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
echo "2. Copy the contents of: database/seed-expanded-global-libraries.sql"
echo "3. Paste into the SQL editor"
echo "4. Click the 'Run' button"
echo "5. Verify the results in the output panel"
echo ""
echo "The SQL file location:"
echo "$(pwd)/database/seed-expanded-global-libraries.sql"
echo ""
echo "=================================================="
echo "What will be deployed:"
echo "=================================================="
echo ""
echo "ROOT CAUSES (70 total):"
echo "  • Operational: 15 causes"
echo "  • Strategic: 12 causes"
echo "  • Financial: 10 causes"
echo "  • Compliance: 8 causes"
echo "  • Cybersecurity & Tech: 10 causes"
echo "  • People & Culture: 7 causes"
echo "  • Environmental: 4 causes"
echo "  • Geopolitical: 4 causes"
echo ""
echo "IMPACTS (45 total):"
echo "  • Financial: 12 impacts"
echo "  • Operational: 10 impacts"
echo "  • People: 5 impacts"
echo "  • Strategic: 6 impacts"
echo "  • Reputational: 4 impacts"
echo "  • Legal/Regulatory: 4 impacts"
echo "  • Environmental: 2 impacts"
echo "  • Systemic: 2 impacts"
echo ""
echo "=================================================="
echo ""

# Optionally, copy SQL to clipboard if pbcopy is available
if command -v pbcopy &> /dev/null; then
    echo "Would you like to copy the SQL to clipboard? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        cat database/seed-expanded-global-libraries.sql | pbcopy
        echo "✅ SQL copied to clipboard! Just paste into the SQL editor."
        echo ""
    fi
fi

echo "Done! Follow the steps above to complete deployment."
