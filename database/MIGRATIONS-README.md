# MinRisk Phase 2 & 3 Database Migrations

## Overview

This directory contains database migrations for MinRisk's advanced features:

### Phase 2: KRI Monitoring System
- **File**: `create-kri-tables.sql`
- **Tables**: 4 (kri_definitions, kri_data_entries, kri_alerts, kri_risk_links)
- **Purpose**: Track Key Risk Indicators with threshold-based alerting

### Phase 3A: Risk Intelligence System
- **File**: `create-risk-intelligence-tables.sql`
- **Tables**: 3 (external_events, intelligence_alerts, risk_intelligence_treatment_log)
- **Purpose**: AI-powered external event scanning and risk relevance analysis

### Phase 3B: Incident Management System
- **File**: `create-incidents-tables.sql`
- **Tables**: 2 (incidents, control_enhancement_plans)
- **Purpose**: Track incidents with AI-powered risk linking and control assessment

**Total**: 9 new tables, 36+ RLS policies, 25+ indexes, 3 triggers

---

## Prerequisites

1. **Existing Database Setup**
   - Organizations table exists
   - User profiles table exists
   - Risks table exists
   - Supabase project configured

2. **Database Connection**
   - PostgreSQL 14+ (Supabase)
   - Service role access or superuser privileges
   - Connection string available

---

## Installation

### Method 1: Run All Migrations (Recommended)

```bash
# Navigate to database directory
cd /path/to/MinRisk/NEW-MINRISK/database

# Run all migrations
psql "postgresql://postgres:[password]@[host]:[port]/[database]" -f run-all-migrations.sql
```

### Method 2: Run Individual Migrations

```bash
# 1. KRI Monitoring
psql "postgresql://..." -f create-kri-tables.sql

# 2. Risk Intelligence
psql "postgresql://..." -f create-risk-intelligence-tables.sql

# 3. Incident Management
psql "postgresql://..." -f create-incidents-tables.sql
```

### Method 3: Supabase Dashboard

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy contents of `run-all-migrations.sql`
3. Paste and execute
4. Verify success in the output

---

## Verification

After running migrations, verify success:

### Check Tables Created

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (
  table_name LIKE 'kri%'
  OR table_name LIKE '%event%'
  OR table_name LIKE '%intelligence%'
  OR table_name IN ('incidents', 'control_enhancement_plans')
)
ORDER BY table_name;
```

**Expected**: 9 tables

### Check RLS Enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'kri_definitions', 'kri_data_entries', 'kri_alerts', 'kri_risk_links',
  'external_events', 'intelligence_alerts', 'risk_intelligence_treatment_log',
  'incidents', 'control_enhancement_plans'
);
```

**Expected**: All `rowsecurity` = `true`

### Check Policies

```sql
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN (
  'kri_definitions', 'kri_data_entries', 'kri_alerts', 'kri_risk_links',
  'external_events', 'intelligence_alerts', 'risk_intelligence_treatment_log',
  'incidents', 'control_enhancement_plans'
)
GROUP BY tablename
ORDER BY tablename;
```

**Expected**: 4 policies per table (SELECT, INSERT, UPDATE, DELETE)

---

## Table Details

### KRI Monitoring

#### `kri_definitions`
- Stores KRI templates with thresholds
- Auto-generated codes: KRI-001, KRI-002, etc.
- Supports leading, lagging, and concurrent indicators

#### `kri_data_entries`
- Time-series measurements
- Automatic alert status calculation (green/yellow/red)
- Data quality tracking (verified/estimated/provisional)

#### `kri_alerts`
- Threshold breach alerts
- Workflow: open → acknowledged → resolved/dismissed
- Yellow (warning) and red (critical) levels

#### `kri_risk_links`
- Links KRIs to specific risks
- AI confidence scores for auto-generated links

### Risk Intelligence

#### `external_events`
- External news and events from RSS feeds
- Source tracking (CBN, SEC, FMDQ, Reuters, etc.)
- Published date and fetch metadata

#### `intelligence_alerts`
- AI-generated relevance alerts
- Confidence scores (0-100)
- Likelihood and impact change suggestions (-2 to +2)
- Status: pending → accepted/rejected/expired

#### `risk_intelligence_treatment_log`
- Immutable audit trail
- Records all accept/reject decisions
- Tracks before/after risk scores

### Incident Management

#### `incidents`
- Incident tracking with auto-generated codes
- Format: INC-DIV-001 (division-based)
- Severity 1-5, financial impact
- JSONB fields for AI suggestions
- Status: Reported → Under Investigation → Resolved → Closed

#### `control_enhancement_plans`
- Control improvement plans
- Linked to incidents and risks
- Target dates and responsible parties
- Status: Planned → In Progress → Completed/On Hold

---

## Rollback

If you need to rollback the migrations:

### Rollback All

```sql
-- Drop tables in reverse order (respects foreign keys)
DROP TABLE IF EXISTS control_enhancement_plans CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;

DROP TABLE IF EXISTS risk_intelligence_treatment_log CASCADE;
DROP TABLE IF EXISTS intelligence_alerts CASCADE;
DROP TABLE IF EXISTS external_events CASCADE;

DROP TABLE IF EXISTS kri_risk_links CASCADE;
DROP TABLE IF EXISTS kri_alerts CASCADE;
DROP TABLE IF EXISTS kri_data_entries CASCADE;
DROP TABLE IF EXISTS kri_definitions CASCADE;

-- Drop triggers and functions
DROP TRIGGER IF EXISTS kri_definitions_updated_at ON kri_definitions;
DROP TRIGGER IF EXISTS incidents_updated_at ON incidents;
DROP FUNCTION IF EXISTS update_kri_definitions_updated_at();
DROP FUNCTION IF EXISTS update_incidents_updated_at();
```

### Rollback Individual Modules

```sql
-- KRI Only
DROP TABLE IF EXISTS kri_risk_links, kri_alerts, kri_data_entries, kri_definitions CASCADE;

-- Risk Intelligence Only
DROP TABLE IF EXISTS risk_intelligence_treatment_log, intelligence_alerts, external_events CASCADE;

-- Incidents Only
DROP TABLE IF EXISTS control_enhancement_plans, incidents CASCADE;
```

---

## Testing

After migration, test each module:

### Test KRI Monitoring

```sql
-- Insert test KRI
INSERT INTO kri_definitions (
  organization_id, user_id, kri_code, kri_name,
  indicator_type, target_value, upper_threshold
) VALUES (
  '[your-org-id]', '[your-user-id]', 'KRI-TEST-001', 'Test Indicator',
  'leading', 100, 120
);

-- Verify
SELECT * FROM kri_definitions WHERE kri_code = 'KRI-TEST-001';
```

### Test Risk Intelligence

```sql
-- Insert test event
INSERT INTO external_events (
  organization_id, source, event_type, title, published_date
) VALUES (
  '[your-org-id]', 'TEST', 'regulation', 'Test Event', NOW()
);

-- Verify
SELECT * FROM external_events WHERE source = 'TEST';
```

### Test Incident Management

```sql
-- Insert test incident
INSERT INTO incidents (
  organization_id, user_id, incident_code, title,
  incident_date, severity, status
) VALUES (
  '[your-org-id]', '[your-user-id]', 'INC-TEST-001', 'Test Incident',
  NOW(), 3, 'Reported'
);

-- Verify
SELECT * FROM incidents WHERE incident_code = 'INC-TEST-001';
```

---

## Troubleshooting

### Issue: Permission Denied

**Solution**: Use service role key or superuser account
```sql
-- Check your role
SELECT current_user, session_user;

-- Grant necessary permissions (if using non-superuser)
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;
```

### Issue: Foreign Key Constraint Violation

**Solution**: Ensure required tables exist
```sql
-- Check dependencies
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE contype = 'f'
AND conrelid::regclass::text LIKE 'kri%'
OR conrelid::regclass::text LIKE '%event%'
OR conrelid::regclass::text LIKE 'incident%';
```

### Issue: Duplicate Table Error

**Solution**: Tables already exist - either skip or drop first
```sql
-- Check existing tables
\dt kri*
\dt *event*
\dt incident*

-- Drop if needed (see Rollback section)
```

---

## Migration History

| Date | Version | Description | Tables Added |
|------|---------|-------------|--------------|
| 2025-01-22 | 1.0 | Initial Phase 2 & 3 migrations | 9 |

---

## Support

For issues or questions:
1. Check verification queries above
2. Review individual migration file comments
3. Check Supabase logs for detailed error messages
4. Refer to backend code in `/src/lib/` for usage examples

---

## Next Steps

After successful migration:

1. **Test Backend Functions**
   - Import KRI, Intelligence, and Incident libraries
   - Test CRUD operations
   - Verify RLS policies work correctly

2. **Test UI Components**
   - Navigate to KRI Management tab
   - Navigate to Intelligence tab
   - Navigate to Incidents tab
   - Verify data loads correctly

3. **Configure AI Integration**
   - Set `VITE_ANTHROPIC_API_KEY` in `.env.development`
   - Test AI-powered features
   - Monitor API usage

4. **Production Deployment**
   - Run migrations on production database
   - Update environment variables
   - Monitor for errors in first 24 hours

---

**End of README**
