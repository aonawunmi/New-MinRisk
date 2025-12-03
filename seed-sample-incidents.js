/**
 * Seed Sample Incidents for Testing AI Risk Mapping
 * Includes both POOR and GOOD description examples
 *
 * Usage: node seed-sample-incidents.js <user-email>
 * Example: node seed-sample-incidents.js admin@ccp.com
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Read environment variables from .env.development
const envContent = fs.readFileSync('.env.development', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are set in .env.development');
  process.exit(1);
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Sample incidents with both poor and good descriptions
const sampleIncidents = [
  // 1. POOR Ransomware Example
  {
    title: 'Ransomware attack',
    description: 'System got hit by ransomware',
    incident_type: 'Security Incident',
    severity: 'HIGH',
    occurred_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    financial_impact: null,
    visibility_scope: 'REPORTER_ONLY',
  },

  // 2. GOOD Ransomware Example
  {
    title: 'WannaCry ransomware attack affecting finance department workstations',
    description: `On December 2, 2025 at 9:47 AM, our finance department reported that 12 workstations were encrypted by WannaCry ransomware (CVE-2017-0144). The attack exploited an unpatched SMB vulnerability in Windows 7 systems.

Root Cause: Delayed patch deployment due to compatibility testing with legacy accounting software (SageAccounts v8.2).

Impact:
- 12 finance workstations encrypted and offline
- Q4 financial reporting delayed by 3 business days
- Invoice processing backlog of ₦45 million
- 8 staff members unable to work for 48 hours

Financial Impact: ₦8,500,000 (₦3.2M ransom NOT paid + ₦5.3M recovery costs including forensics, system rebuilds, and overtime)

Immediate Actions Taken:
- Isolated affected systems from network within 15 minutes
- Engaged external cybersecurity firm (CyberGuard Nigeria)
- Restored systems from backup taken 18 hours prior
- Emergency patching of all remaining Windows 7 systems
- Implemented network segmentation between finance and other departments

Technical Details: Hash of ransomware binary: 24d004a104d4d54034dbcffc2a4b19a11f39008a575aa614ea04703480b1022c`,
    incident_type: 'Security Incident',
    severity: 'HIGH',
    occurred_at: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    financial_impact: 8500000,
    visibility_scope: 'REPORTER_ONLY',
  },

  // 3. POOR Data Breach Example
  {
    title: 'Customer data leaked',
    description: 'Customer information was exposed online',
    incident_type: 'Data Breach',
    severity: 'CRITICAL',
    occurred_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
    financial_impact: null,
    visibility_scope: 'REPORTER_ONLY',
  },

  // 4. GOOD Data Breach Example
  {
    title: 'Unauthorized access to customer database via misconfigured S3 bucket',
    description: `On December 1, 2025, a security researcher contacted us via responsible disclosure to report that our AWS S3 bucket "customer-exports-prod" was publicly accessible, exposing 47,823 customer records dating from January 2023 to November 2025.

Root Cause: DevOps engineer set bucket to public during troubleshooting session on Nov 28, 2025 and forgot to revert permissions. No peer review process for infrastructure changes.

Data Exposed:
- Full names, email addresses, phone numbers
- Account numbers and transaction history (last 12 months)
- National ID numbers for KYC records (15,234 customers)
- NO credit card data or passwords exposed (separate encrypted database)

Impact:
- 47,823 customers affected
- Potential regulatory fines from NDPR (Nigeria Data Protection Regulation)
- Reputational damage and customer trust erosion
- Mandatory notification to affected customers and regulators

Financial Impact: ₦125,000,000 (estimated: ₦50M regulatory fines + ₦45M legal fees + ₦30M customer compensation/credit monitoring)

Timeline:
- Nov 28, 2025 10:15 AM: Bucket permissions changed to public
- Dec 1, 2025 2:34 PM: Security researcher discovers exposure
- Dec 1, 2025 3:02 PM: Permissions reverted, bucket secured
- Dec 1, 2025 6:00 PM: Forensic investigation initiated
- Dec 2, 2025 9:00 AM: NDPR notification submitted

Immediate Actions:
- Bucket permissions corrected within 30 minutes of notification
- AWS CloudTrail logs analyzed for access patterns (3 external IPs detected)
- Implemented bucket policies requiring encryption and private ACLs by default
- Mandatory security training scheduled for all DevOps staff
- Engaged external law firm (Udo Udoma & Belo-Osagie) for regulatory compliance`,
    incident_type: 'Data Breach',
    severity: 'CRITICAL',
    occurred_at: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString(),
    financial_impact: 125000000,
    visibility_scope: 'REPORTER_ONLY',
  },

  // 5. POOR Operational Error
  {
    title: 'Payment processing error',
    description: 'Payments were processed incorrectly',
    incident_type: 'Operational Error',
    severity: 'MEDIUM',
    occurred_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    financial_impact: null,
    visibility_scope: 'REPORTER_ONLY',
  },

  // 6. GOOD Operational Error
  {
    title: 'Duplicate payment processing due to database transaction retry logic failure',
    description: `Between 2:15 AM and 4:47 AM on December 3, 2025, our payment processing system incorrectly processed 1,847 duplicate payments totaling ₦234 million due to a race condition in our database transaction retry logic.

Root Cause: Recent deployment (v3.2.1) introduced a bug in PostgreSQL transaction handling where network timeouts triggered automatic retries without checking for existing completed transactions. The issue only manifested under high load conditions (>500 TPS).

Impact:
- 1,847 customers charged twice
- ₦234 million in duplicate charges requiring reversal
- 463 customer complaints within first 6 hours
- Social media backlash (#DoubleCharge trending on Twitter Nigeria)
- Banking partner (Guaranty Trust Bank) placed processing on hold for 4 hours

Financial Impact: ₦18,750,000 (reversal processing fees ₦127 per transaction + ₦12M in customer compensation + ₦6.5M in operational costs for manual reconciliation)

Technical Details:
- Application: PaymentProcessor v3.2.1 (commit hash: 7f3d891)
- Database: PostgreSQL 14.5 (RDS instance: prod-payments-primary)
- Error pattern: "duplicate key value violates unique constraint" appearing in logs 2,156 times
- Load at time: 587 transactions per second (normal: 120-180 TPS)

Immediate Actions:
- Rolled back to v3.2.0 within 15 minutes of detection
- Identified all affected transactions via database query
- Automated reversal scripts executed for 1,847 duplicate charges
- All customers contacted via email and SMS within 8 hours
- ₦5,000 goodwill credit applied to affected accounts

Remediation:
- Enhanced transaction idempotency keys implemented
- Added distributed lock using Redis for payment processing
- Circuit breaker pattern implemented for database retries
- Load testing under high TPS scenarios (up to 1,000 TPS)
- Code review process updated to mandate database transaction testing`,
    incident_type: 'Operational Error',
    severity: 'HIGH',
    occurred_at: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
    financial_impact: 18750000,
    visibility_scope: 'REPORTER_ONLY',
  },

  // 7. POOR Compliance Violation
  {
    title: 'AML check failed',
    description: 'We missed some AML checks',
    incident_type: 'Compliance Violation',
    severity: 'MEDIUM',
    occurred_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), // 3 days ago
    financial_impact: null,
    visibility_scope: 'REPORTER_ONLY',
  },

  // 8. GOOD Compliance Violation
  {
    title: 'Automated AML/CFT screening bypassed for high-value transactions due to API timeout handling bug',
    description: `During our quarterly compliance audit on December 2, 2025, we discovered that 127 high-value transactions (>₦5 million each) processed between October 15-November 30, 2025 bypassed mandatory AML/CFT (Anti-Money Laundering / Countering Financing of Terrorism) screening due to a bug in our third-party API integration error handling.

Root Cause: When our AML screening vendor (WorldCheck API by Refinitiv) experienced timeout responses (>30 seconds), our system incorrectly logged the check as "pending" but allowed transaction to proceed instead of blocking it. This violated our internal policy and CBN (Central Bank of Nigeria) regulations requiring completed screening before transaction authorization.

Regulatory Framework Violated:
- CBN AML/CFT Regulations 2022, Section 4.3.2
- Money Laundering (Prevention and Prohibition) Act 2022
- Nigeria Financial Intelligence Unit (NFIU) guidelines

Transactions Affected:
- 127 transactions totaling ₦1.47 billion
- 89 unique customer accounts involved
- 23 transactions to high-risk jurisdictions (UAE, Hong Kong)
- 5 transactions flagged retrospectively as suspicious upon manual review

Impact:
- Potential CBN enforcement action and fines (up to ₦10 million per violation)
- Mandatory filing of 5 Suspicious Transaction Reports (STRs) to NFIU
- Risk of license suspension pending investigation
- Enhanced monitoring requirements for 12 months
- Reputational damage with regulators

Financial Impact: ₦750,000,000 (estimated: ₦500M in potential CBN fines + ₦150M in legal/compliance consulting + ₦100M in enhanced monitoring systems)

Immediate Actions:
- All 127 transactions reviewed manually by compliance team within 48 hours
- 5 accounts with suspicious patterns frozen pending investigation
- STRs filed with NFIU for flagged transactions
- Voluntary disclosure submitted to CBN within 72 hours of discovery
- Third-party compliance audit engaged (PwC Nigeria)

Technical Remediation:
- Modified API integration to block ALL transactions on vendor API timeout/error
- Implemented manual review queue for timeout scenarios
- Added real-time alerting for AML screening failures
- Enhanced logging to capture all API responses (success, failure, timeout)
- Scheduled API health checks every 5 minutes with automated failover to backup provider

Compliance Actions:
- Full customer re-screening completed for all 89 accounts
- Enhanced due diligence (EDD) applied to 23 high-risk transactions
- Staff training on transaction approval procedures (mandatory for all ops staff)
- Updated policies to require dual approval for transactions >₦5M if primary screening unavailable`,
    incident_type: 'Compliance Violation',
    severity: 'CRITICAL',
    occurred_at: new Date(Date.now() - 71 * 60 * 60 * 1000).toISOString(),
    financial_impact: 750000000,
    visibility_scope: 'REPORTER_ONLY',
  },

  // 9. POOR Third-Party Incident
  {
    title: 'SMS service down',
    description: 'Our SMS provider had an outage',
    incident_type: 'System Outage',
    severity: 'LOW',
    occurred_at: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(), // 1.5 days ago
    financial_impact: null,
    visibility_scope: 'REPORTER_ONLY',
  },

  // 10. GOOD Third-Party Incident
  {
    title: 'Critical transaction OTP delivery failure due to Twilio Africa region outage',
    description: `On December 2, 2025 from 11:23 AM to 2:47 PM (3 hours 24 minutes), our SMS OTP (One-Time Password) delivery system failed to send 12,847 transaction authorization codes to customers due to a region-wide outage affecting Twilio's Africa-West zone.

Root Cause: Twilio experienced a cascading failure in their Lagos data center (Incident #TWL-2025-1202-AF) affecting all SMS delivery to Nigerian phone numbers. Our system had no failover to backup SMS provider despite this being identified as a critical dependency in our 2024 business continuity plan.

Impact:
- 12,847 transactions blocked (couldn't complete without OTP)
- Estimated ₦2.3 billion in failed transaction volume
- 3,847 customer service calls (347% above normal volume)
- Mobile app ratings dropped from 4.7 to 3.9 stars during outage period
- 847 customers switched to competitor apps during outage

Financial Impact: ₦42,000,000 (₦18M in lost transaction fee revenue + ₦12M in customer service overtime + ₦8M in customer retention credits + ₦4M in emergency vendor setup)

Customer Experience Impact:
- Peak wait time for customer service: 47 minutes (normal: 3 minutes)
- 1,247 social media complaints (#AppNotWorking, #CannotPay)
- 89 negative app store reviews posted during outage
- Trust score declined 12% in post-outage survey

Immediate Actions Taken:
- Emergency procurement of backup SMS provider (Termii Nigeria) within 90 minutes
- Manual transaction approvals enabled for verified customers (reduced security, time-limited)
- Proactive SMS sent to all users once service restored explaining outage
- ₦2,000 apology credit applied to 3,847 affected high-value customers

Business Continuity Improvements:
- Implemented dual SMS provider failover (Twilio primary, Termii backup with 10-second failover)
- Added Infobip as tertiary provider for critical transactions
- Geographic redundancy: primary provider in Lagos, backup in South Africa
- Real-time SMS delivery monitoring with 30-second alert threshold
- Quarterly disaster recovery drills including vendor failover scenarios
- Contract terms negotiated for SLA credits from Twilio (₦5.2M credit received)

Technical Implementation:
- SMS gateway abstraction layer created to support multiple providers
- Health check endpoint pinging all providers every 60 seconds
- Automatic provider switching on >5% delivery failure rate
- Fallback to email OTP if all SMS providers fail (added as last resort)`,
    incident_type: 'Third-Party Incident',
    severity: 'HIGH',
    occurred_at: new Date(Date.now() - 35 * 60 * 60 * 1000).toISOString(),
    financial_impact: 42000000,
    visibility_scope: 'REPORTER_ONLY',
  },
];

// Severity mapping: text to integer
const severityMap = {
  'LOW': 1,
  'MEDIUM': 2,
  'HIGH': 3,
  'CRITICAL': 4,
};

async function seedIncidents() {
  console.log('🌱 Starting incident seeding...\n');

  // Get user email from command line argument
  const userEmail = process.argv[2];

  if (!userEmail) {
    console.error('❌ Please provide a user email address');
    console.error('Usage: node seed-sample-incidents.js <user-email>');
    console.error('Example: node seed-sample-incidents.js admin@ccp.com');
    process.exit(1);
  }

  // Find user by email using auth.admin API
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error(`❌ Error fetching users: ${authError.message}`);
    process.exit(1);
  }

  const authUser = authUsers.users.find(u => u.email === userEmail);

  if (!authUser) {
    console.error(`❌ Could not find user with email: ${userEmail}`);
    console.error('Make sure the email exists in the database');
    console.error('\n💡 Run: node list-users.js to see all users');
    process.exit(1);
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, organization_id, role, full_name')
    .eq('id', authUser.id)
    .single();

  if (profileError || !profile) {
    console.error(`❌ Could not find profile for user: ${userEmail}`);
    console.error('Profile error:', profileError?.message);
    process.exit(1);
  }

  console.log(`👤 Using user: ${userEmail} (${profile.role})`);
  console.log(`📛 Name: ${profile.full_name || '(no name)'}`);
  console.log(`🏢 Organization ID: ${profile.organization_id}\n`);

  let successCount = 0;
  let errorCount = 0;

  // Use impersonation to run as the user
  for (const incident of sampleIncidents) {
    try {
      // Call the existing RPC function
      const { data, error } = await supabase.rpc('create_incident_bypass_cache', {
        p_title: incident.title,
        p_description: incident.description,
        p_incident_type: incident.incident_type,
        p_severity: incident.severity,
        p_occurred_at: incident.occurred_at,
        p_visibility_scope: incident.visibility_scope,
        p_linked_risk_codes: [],
        p_financial_impact: incident.financial_impact
      });

      if (error) {
        console.error(`❌ Failed to create: ${incident.title}`);
        console.error(`   Error: ${error.message}`);
        console.error(`   Details: ${JSON.stringify(error, null, 2)}`);
        errorCount++;
      } else {
        const qualityLabel = incident.description.length < 100 ? '📝 POOR' : '✅ GOOD';
        console.log(`${qualityLabel} Created: ${incident.title}`);
        console.log(`   Incident Code: ${data.incident_code}`);
        console.log(`   Description Length: ${incident.description.length} chars`);
        console.log(`   Severity: ${incident.severity}`);
        console.log('');
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Exception creating: ${incident.title}`);
      console.error(`   ${err.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Successfully created: ${successCount} incidents`);
  console.log(`❌ Failed: ${errorCount} incidents`);
  console.log('='.repeat(60));

  console.log('\n📊 Summary:');
  console.log(`   - 5 POOR examples (brief descriptions < 100 chars)`);
  console.log(`   - 5 GOOD examples (detailed descriptions > 200 chars)`);
  console.log('\n💡 Next Steps:');
  console.log('   1. Go to: http://localhost:3000');
  console.log('   2. Navigate to: Incidents → Incident Management');
  console.log('   3. Click on POOR examples to see quality warnings');
  console.log('   4. Click Edit to update with GOOD descriptions');
  console.log('   5. Go to: Incidents → AI Review (ADMIN)');
  console.log('   6. Select incident and click "Run AI Analysis"');
  console.log('   7. Compare AI suggestions for POOR vs GOOD descriptions\n');
}

// Run the seeding
seedIncidents().catch(console.error);
