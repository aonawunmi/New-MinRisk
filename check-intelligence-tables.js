import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qrxwgjjgaekalvaqzpuf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyeHdnampnYWVrYWx2YXF6cHVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1NDg5NSwiZXhwIjoyMDc5MDMwODk1fQ.Sh8f9nmI1g1QzdyrwOoVsQ0jfxhT5I0Cfb-3xV0Q2fE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('🔍 Checking which intelligence alerts table exists...\n');

  // Try intelligence_alerts
  const { data: data1, error: error1 } = await supabase
    .from('intelligence_alerts')
    .select('*')
    .limit(1);

  console.log('📊 Table: intelligence_alerts');
  if (error1) {
    console.log('   ❌ Error:', error1.message);
  } else {
    console.log('   ✅ EXISTS - Found', data1?.length || 0, 'rows');
  }

  // Try risk_intelligence_alerts
  const { data: data2, error: error2 } = await supabase
    .from('risk_intelligence_alerts')
    .select('*')
    .limit(1);

  console.log('\n📊 Table: risk_intelligence_alerts');
  if (error2) {
    console.log('   ❌ Error:', error2.message);
  } else {
    console.log('   ✅ EXISTS - Found', data2?.length || 0, 'rows');
  }

  // Get schema for the table that exists
  const existingTable = !error1 ? 'intelligence_alerts' : 'risk_intelligence_alerts';
  console.log('\n📋 Fetching schema for:', existingTable);

  const { data: schemaData, error: schemaError } = await supabase
    .from(existingTable)
    .select('*')
    .limit(0);

  if (!schemaError) {
    console.log('   Columns available in query response');
  }
}

checkTables().catch(console.error);
