/**
 * Bulk Import Script for Risk Taxonomy
 *
 * Imports the Risk_Taxonomy.xlsx file into the database.
 * Run this after the create-risk-taxonomy.sql migration.
 *
 * Usage:
 *   npx tsx scripts/import-taxonomy.ts
 */

import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.development
config({ path: path.join(__dirname, '../.env.development') });

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qrxwgjjgaekalvaqzpuf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: VITE_SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

// Initialize Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface TaxonomyRow {
  category: string;
  category_description: string;
  subcategory: string;
  subcategory_description: string;
}

async function importTaxonomy() {
  console.log('📋 Starting Risk Taxonomy Import...\n');

  // Read Excel file
  const excelPath = path.join(__dirname, '../../../Risk_Taxonomy.xlsx');
  console.log(`📂 Reading file: ${excelPath}`);

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.readFile(excelPath);
  } catch (err: any) {
    console.error(`❌ Error reading Excel file: ${err.message}`);
    console.log('\n💡 Make sure Risk_Taxonomy.xlsx is in the CODING folder');
    process.exit(1);
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

  console.log(`✅ Found ${jsonData.length} rows in Excel file\n`);

  // Convert to taxonomy format
  const rows: TaxonomyRow[] = jsonData.map((row) => ({
    category: row['Risk Category'] || row['category'] || '',
    category_description: row['Sub-category'] || row['subcategory'] || '', // Column seems to contain subcategory
    subcategory: row['Risk Category'] || '', // This might need adjustment based on actual Excel structure
    subcategory_description: row['Sub-category'] || '',
  }));

  // Actually, let me re-read the Excel properly
  // From our earlier read, the structure is: Risk Category | Sub-category
  const properRows: TaxonomyRow[] = jsonData.map((row) => {
    const category = row['Risk Category'] || '';
    const subcategory = row['Sub-category'] || '';

    return {
      category: category.trim(),
      category_description: getCategoryDescription(category),
      subcategory: subcategory.trim(),
      subcategory_description: getSubcategoryDescription(subcategory),
    };
  });

  console.log('📊 Import Statistics:');
  const uniqueCategories = new Set(properRows.map(r => r.category));
  console.log(`   Categories: ${uniqueCategories.size}`);
  console.log(`   Subcategories: ${properRows.length}`);
  console.log('');

  // Get organization ID (assuming first organization for now)
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .limit(1);

  if (orgError || !orgs || orgs.length === 0) {
    console.error('❌ Error: No organization found in database');
    console.log('   Please ensure you have an organization set up');
    process.exit(1);
  }

  const organizationId = orgs[0].id;
  console.log(`🏢 Importing for organization: ${orgs[0].name}`);
  console.log(`   Organization ID: ${organizationId}\n`);

  // Track progress
  let categoriesCreated = 0;
  let categoriesSkipped = 0;
  let subcategoriesCreated = 0;
  let subcategoriesSkipped = 0;
  const errors: string[] = [];

  // Create map to store category IDs
  const categoryMap = new Map<string, string>();

  // Get existing categories
  const { data: existingCategories } = await supabase
    .from('risk_categories')
    .select('id, name')
    .eq('organization_id', organizationId);

  (existingCategories || []).forEach((cat: any) => {
    categoryMap.set(cat.name, cat.id);
  });

  // Group by category
  const categoryGroups = new Map<string, TaxonomyRow[]>();
  properRows.forEach(row => {
    if (!categoryGroups.has(row.category)) {
      categoryGroups.set(row.category, []);
    }
    categoryGroups.get(row.category)!.push(row);
  });

  console.log('🚀 Starting import...\n');

  // Process each category
  for (const [categoryName, rows] of categoryGroups) {
    process.stdout.write(`   Processing: ${categoryName}... `);

    // Create or get category
    let categoryId = categoryMap.get(categoryName);

    if (!categoryId) {
      const { data: newCat, error: catError } = await supabase
        .from('risk_categories')
        .insert({
          organization_id: organizationId,
          name: categoryName,
          description: rows[0].category_description,
        })
        .select()
        .single();

      if (catError) {
        if (catError.message.includes('duplicate')) {
          categoriesSkipped++;
          console.log('skipped (exists)');
        } else {
          errors.push(`Category "${categoryName}": ${catError.message}`);
          console.log('❌ error');
        }
        continue;
      }

      categoryId = newCat.id;
      categoryMap.set(categoryName, categoryId);
      categoriesCreated++;
    } else {
      categoriesSkipped++;
    }

    // Create subcategories
    let subCount = 0;
    for (const row of rows) {
      const { error: subError } = await supabase
        .from('risk_subcategories')
        .insert({
          organization_id: organizationId,
          category_id: categoryId,
          name: row.subcategory,
          description: row.subcategory_description,
        });

      if (subError) {
        if (subError.message.includes('duplicate')) {
          subcategoriesSkipped++;
        } else {
          errors.push(`Subcategory "${row.subcategory}": ${subError.message}`);
        }
      } else {
        subcategoriesCreated++;
        subCount++;
      }
    }

    console.log(`✅ ${subCount} subcategories`);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Categories created:     ${categoriesCreated}`);
  console.log(`⏭️  Categories skipped:     ${categoriesSkipped}`);
  console.log(`✅ Subcategories created:  ${subcategoriesCreated}`);
  console.log(`⏭️  Subcategories skipped:  ${subcategoriesSkipped}`);

  if (errors.length > 0) {
    console.log(`\n❌ Errors: ${errors.length}`);
    errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
    if (errors.length > 10) {
      console.log(`   ... and ${errors.length - 10} more errors`);
    }
  }

  console.log('='.repeat(60));
}

// Helper functions to generate descriptions
function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    'Strategic Risk': 'Risks related to business strategy, competitive position, and market dynamics',
    'Financial Risk': 'Risks related to financial markets, credit, liquidity, and capital management',
    'Operational Risk': 'Risks from inadequate or failed internal processes, people, systems, or external events',
    'Technology & Cyber Risk': 'Risks related to IT infrastructure, cybersecurity, and digital transformation',
    'Compliance & Legal Risk': 'Risks of legal or regulatory sanctions, financial loss, or reputation damage',
    'Governance & Reputational Risk': 'Risks related to board oversight, ethics, and organizational reputation',
    'ESG & Sustainability Risk': 'Environmental, social, and governance risks affecting long-term sustainability',
    'Project & Programme Risk': 'Risks related to project execution, timelines, and deliverables',
    'Supply Chain & Logistics Risk': 'Risks in procurement, supplier management, and distribution networks',
    'Physical & Safety Risk': 'Risks to physical assets, employee safety, and workplace security',
    'Product & Service Risk': 'Risks related to product quality, service delivery, and customer harm',
    'Human Capital Risk': 'Risks related to workforce planning, talent management, and employee relations',
    'Innovation & IP Risk': 'Risks related to intellectual property, R&D, and technological innovation',
  };

  return descriptions[category] || `${category} related risks`;
}

function getSubcategoryDescription(subcategory: string): string {
  // Generate generic description for subcategory
  return `Risk related to ${subcategory.toLowerCase()}`;
}

// Run the import
importTaxonomy()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Script failed:', err);
    process.exit(1);
  });
