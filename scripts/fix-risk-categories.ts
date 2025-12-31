
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('Environment Debug:');
console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Found' : 'Missing');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Critical: Missing Supabase URL or Key.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRiskCategories() {
    console.log('Starting risk category standardization...');

    try {
        // 1. Fetch complete taxonomy
        const { data: categories, error: catError } = await supabase
            .from('risk_categories')
            .select('id, name');

        if (catError) throw catError;

        const { data: subcategories, error: subError } = await supabase
            .from('risk_subcategories')
            .select('id, name, category_id');

        if (subError) throw subError;

        // Create lookup: Subcategory Name -> Parent Category Name
        const subToCatMap = new Map<string, string>();

        subcategories?.forEach(sub => {
            const parent = categories?.find(c => c.id === sub.category_id);
            if (parent) {
                subToCatMap.set(sub.name, parent.name);
            }
        });

        console.log(`Built map of ${subToCatMap.size} subcategories to parent categories.`);

        // 2. Fetch all risks
        const { data: risks, error: riskError } = await supabase
            .from('risks')
            .select('id, risk_title, category');

        if (riskError) throw riskError;

        console.log(`Scanning ${risks?.length || 0} risks...`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const risk of risks || []) {
            const currentCategory = risk.category;

            // If the current category matches a known subcategory name, update it
            if (subToCatMap.has(currentCategory)) {
                const correctCategory = subToCatMap.get(currentCategory);

                console.log(`Fixing Risk "${risk.risk_title}" (${risk.id}): "${currentCategory}" -> "${correctCategory}"`);

                const { error: updateError } = await supabase
                    .from('risks')
                    .update({ category: correctCategory })
                    .eq('id', risk.id);

                if (updateError) {
                    console.error(`Failed to update risk ${risk.id}:`, updateError);
                } else {
                    updatedCount++;
                }
            } else {
                // Already correct, or unknown category
                skippedCount++;
            }
        }

        console.log('------------------------------------------------');
        console.log(`Standardization Complete.`);
        console.log(`Updated: ${updatedCount} risks`);
        console.log(`Skipped: ${skippedCount} risks (already correct or unknown)`);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

fixRiskCategories();
