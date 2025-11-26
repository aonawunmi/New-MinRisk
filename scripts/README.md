# MinRisk Scripts

## Taxonomy Import Script

### Purpose
Bulk imports the Risk_Taxonomy.xlsx file into the database, creating all categories and subcategories.

### Prerequisites
1. Database migration `create-risk-taxonomy.sql` must be run first
2. Risk_Taxonomy.xlsx must be in the CODING folder (one level up from project root)
3. Organization must exist in the database
4. Service role key must be configured in `.env.development`

### Usage

```bash
npm run import-taxonomy
```

### What It Does
1. Reads Risk_Taxonomy.xlsx from the CODING folder
2. Parses 88 risk subcategories across 13 categories
3. Creates category records (if they don't exist)
4. Creates subcategory records under each category
5. Skips duplicates automatically
6. Reports detailed statistics

### Expected Output

```
📋 Starting Risk Taxonomy Import...

📂 Reading file: /path/to/Risk_Taxonomy.xlsx
✅ Found 88 rows in Excel file

📊 Import Statistics:
   Categories: 13
   Subcategories: 88

🏢 Importing for organization: Acme Corp
   Organization ID: 11111111-1111-1111-1111-111111111111

🚀 Starting import...

   Processing: Strategic Risk... ✅ 6 subcategories
   Processing: Financial Risk... ✅ 15 subcategories
   Processing: Operational Risk... ✅ 8 subcategories
   ...

============================================================
📊 IMPORT COMPLETE
============================================================
✅ Categories created:     13
⏭️  Categories skipped:     0
✅ Subcategories created:  88
⏭️  Subcategories skipped:  0
============================================================

✅ Script completed successfully
```

### After Import
After successful import, you can:
1. Log into MinRisk
2. Navigate to Admin → Risk Taxonomy
3. View all 13 categories with their 88 subcategories
4. Export the taxonomy to verify
5. Make manual adjustments if needed

### Troubleshooting

**Error: Excel file not found**
- Ensure Risk_Taxonomy.xlsx is in the CODING folder
- Path should be: `/Users/.../CODING/Risk_Taxonomy.xlsx`

**Error: No organization found**
- Ensure at least one organization exists in the database
- The script imports for the first organization found

**Error: Duplicate key violation**
- This is normal if you've already imported
- The script will skip duplicates and continue

**Error: Permission denied**
- Ensure VITE_SUPABASE_SERVICE_ROLE_KEY is set in `.env.development`
- This bypasses RLS for admin operations
